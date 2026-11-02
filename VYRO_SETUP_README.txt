VYRO QUICK SETUP

1) Open Supabase Dashboard -> SQL Editor.
2) Paste and RUN VYRO_BCA_SETUP.sql.
3) Keep index.html, script.js and style.css in the same folder.
4) Open the folder with VS Code Live Server and refresh the page.

What this update adds:
- BCA-only student directory with 1st–4th year filter.
- Profile name/year/bio save and logout button in profile.
- Create BCA groups and join groups.
- Chat request to BCA students; recipient accepts before a conversation is created.
- Messages saved in Supabase conversations.
- Fresh page visits show the landing page instead of auto-opening the dashboard.
- Duplicate dashboard markup removed; existing style.css is unchanged.

Important:
- The SQL migration is REQUIRED before testing these features. New profiles default to BCA / Year 1.
- Supabase Auth email confirmation/rate limits remain controlled in your Supabase dashboard.
- Test with two separate student accounts to verify request -> accept -> chat.
- The existing announcements/events/posts and safety UI were not fully converted from demo behavior in this quick pass.
