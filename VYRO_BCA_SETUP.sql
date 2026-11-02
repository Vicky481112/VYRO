-- VYRO BCA setup: run once in Supabase SQL Editor.
-- Existing profile rows remain intact; new signups default to BCA / Year 1.
ALTER TABLE public.profiles ALTER COLUMN department SET DEFAULT 'BCA';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year smallint NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ALTER COLUMN department DROP NOT NULL;
UPDATE public.profiles SET department='BCA' WHERE department IS NULL OR btrim(department)='';
UPDATE public.profiles SET year=1 WHERE year IS NULL;

-- Let a student join a group as themselves.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_members' AND policyname='Students join groups') THEN
    CREATE POLICY "Students join groups" ON public.group_members FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Group owners can add themselves as owner; policy above allows own membership.
-- Accept a request atomically and create the private conversation + memberships.
CREATE OR REPLACE FUNCTION public.accept_chat_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.chat_requests%ROWTYPE; c_id uuid;
BEGIN
  SELECT * INTO r FROM public.chat_requests WHERE id=request_id FOR UPDATE;
  IF NOT FOUND OR r.recipient_id <> auth.uid() OR r.status <> 'pending' THEN
    RAISE EXCEPTION 'Request not available';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks b WHERE
      (b.blocker_id=r.sender_id AND b.blocked_id=r.recipient_id) OR
      (b.blocker_id=r.recipient_id AND b.blocked_id=r.sender_id)) THEN
    RAISE EXCEPTION 'This chat is unavailable';
  END IF;
  UPDATE public.chat_requests SET status='accepted', responded_at=now() WHERE id=request_id;
  INSERT INTO public.conversations(request_id) VALUES (request_id) RETURNING id INTO c_id;
  INSERT INTO public.conversation_members(conversation_id,user_id)
    VALUES (c_id,r.sender_id),(c_id,r.recipient_id);
  RETURN c_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_chat_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_chat_request(uuid) TO authenticated;

-- Enforce no duplicate pending/accepted requests in either direction.
CREATE UNIQUE INDEX IF NOT EXISTS chat_requests_one_active_pair
ON public.chat_requests (LEAST(sender_id,recipient_id), GREATEST(sender_id,recipient_id))
WHERE status IN ('pending','accepted');

-- Membership can be created only for the signed-in user.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Send messages in accepted chats') THEN
    CREATE POLICY "Send messages in accepted chats" ON public.messages FOR INSERT TO authenticated
      WITH CHECK (sender_id=auth.uid() AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id=messages.conversation_id AND cm.user_id=auth.uid()));
  END IF;
END $$;
