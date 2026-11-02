/* ==========================================
   VYRO — CAMPUS CONNECT
   Complete Frontend JavaScript
========================================== */

(() => {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const STORAGE = {
    users: "vyro_demo_users_v1",
    session: "vyro_demo_session_v1",
    requests: "vyro_demo_requests_v1",
    accepted: "vyro_demo_accepted_v1",
    messages: "vyro_demo_messages_v1",
    groups: "vyro_demo_groups_v1",
    blocked: "vyro_demo_blocked_v1",
    reports: "vyro_demo_reports_v1",
    displayName: "vyro_demo_display_name_v1"
  };

  let currentUser = null;
  let authMode = "signup";
  let chatPartner = null;
  let toastTimer = null;
  let pendingSafetyPerson = null;

  // Supabase public project configuration. Never put a service_role/secret key here.
  const SUPABASE_URL = "https://eyjhydhsacyenpnugrwy.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DzmTbF_BYUPGa5IKi7gKfQ_XDL0yCTh";
  const supabase = window.supabase?.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  /* ==========================================
     LOCAL STORAGE
  ========================================== */

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Unable to save data:", error);
      showToast("Browser storage is unavailable.");
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Ignore storage errors.
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function initials(name) {
    return String(name || "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "S";
  }

  /* ==========================================
     TOAST NOTIFICATIONS
  ========================================== */

  function showToast(message) {
    const toast = $("#toast");

    if (!toast) {
      console.log(message);
      return;
    }

    toast.textContent = String(message);
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  /* ==========================================
     LANDING PAGE
  ========================================== */

  function showLanding() {
    $("#landingPage")?.classList.remove("hidden");
    $("#authPage")?.classList.add("hidden");
    $("#appPage")?.classList.add("hidden");

    closeSidebar();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* ==========================================
     LOGIN / SIGNUP PAGE
  ========================================== */

  function showAuth(mode = "login") {
    setAuthMode(mode);

    $("#landingPage")?.classList.add("hidden");
    $("#authPage")?.classList.remove("hidden");
    $("#appPage")?.classList.add("hidden");

    closeSidebar();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function setAuthMode(mode) {
    authMode = mode === "login" ? "login" : "signup";

    const isSignup = authMode === "signup";

    const title = $("#authTitle");
    const subtitle = $("#authSubtitle");
    const eyebrow = $("#authEyebrow");
    const submit = $("#authSubmit");
    const switchText = $("#switchText");
    const switchButton = $("#switchButton");

    if (title) {
      title.textContent = isSignup
        ? "Create your account."
        : "Welcome back.";
    }

    if (subtitle) {
      subtitle.textContent = isSignup
        ? "Join your campus community in a few steps."
        : "Log in to return to your campus community.";
    }

    if (eyebrow) {
      eyebrow.textContent = isSignup
        ? "YOUR CIRCLE STARTS HERE"
        : "GOOD TO HAVE YOU BACK";
    }

    if (submit) {
      submit.innerHTML = isSignup
        ? "Create Account <span>↗</span>"
        : "Log In <span>↗</span>";
    }

    if (switchText) {
      switchText.textContent = isSignup
        ? "Already have an account?"
        : "Don't have an account?";
    }

    if (switchButton) {
      switchButton.textContent = isSignup
        ? "Log in"
        : "Sign up";
    }

    const nameField = $("#nameField");
    const confirmField = $("#confirmField");
    const termsRow = $("#termsRow");

    const fullName = $("#fullName");
    const confirmPassword = $("#confirmPassword");
    const termsCheck = $("#termsCheck");
    const password = $("#password");

    nameField?.classList.toggle("hidden", !isSignup);
    confirmField?.classList.toggle("hidden", !isSignup);
    termsRow?.classList.toggle("hidden", !isSignup);

    if (fullName) fullName.required = isSignup;
    if (confirmPassword) confirmPassword.required = isSignup;
    if (termsCheck) termsCheck.required = isSignup;

    if (password) {
      password.autocomplete = isSignup
        ? "new-password"
        : "current-password";
    }

    const message = $("#authMessage");

    if (message) {
      message.textContent = "";
      message.classList.remove("show", "error", "success");
    }
  }

  function switchAuthMode() {
    setAuthMode(authMode === "signup" ? "login" : "signup");
  }

  function setAuthMessage(message, type = "error") {
    const element = $("#authMessage");

    if (!element) {
      showToast(message);
      return;
    }

    element.textContent = message;
    element.classList.add("show");
    element.classList.toggle("error", type === "error");
    element.classList.toggle("success", type === "success");
  }

  /* ==========================================
     PASSWORD SHOW / HIDE
  ========================================== */

  function togglePassword() {
    const input = $("#password");
    const button = $(".password-toggle");

    if (!input) return;

    const show = input.type === "password";

    input.type = show ? "text" : "password";

    if (button) {
      button.textContent = show ? "Hide" : "Show";

      button.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password"
      );
    }
  }

  /* ==========================================
     AUTHENTICATION FORM
     Browser-only demonstration
  ========================================== */

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      return setAuthMessage("VYRO connection did not load. Refresh the page and try again.");
    }

    const name = ($("#fullName")?.value || "").trim();
    const email = ($("#collegeEmail")?.value || "").trim().toLowerCase();
    const password = $("#password")?.value || "";
    const confirm = $("#confirmPassword")?.value || "";
    const terms = $("#termsCheck");

    if (!email || !password) return setAuthMessage("Please enter your email and password.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setAuthMessage("Please enter a valid email address.");

    const submit = $("#authSubmit");
    if (submit) submit.disabled = true;

    try {
      if (authMode === "signup") {
        if (!name) return setAuthMessage("Please enter your full name.");
        if (password.length < 12) return setAuthMessage("Password must contain at least 12 characters.");
        if (password !== confirm) return setAuthMessage("Passwords do not match.");
        if (terms && !terms.checked) return setAuthMessage("Please agree to the community rules to continue.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;

        if (data.session && data.user) {
          await ensureProfile(data.user, name);
          await loginUser(data.user);
        } else {
          setAuthMessage("Account created! Check your email and confirm your address before logging in.", "success");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await ensureProfile(data.user);
        await loginUser(data.user);
      }
    } catch (error) {
      setAuthMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function ensureProfile(authUser, preferredName = "") {
    const displayName = preferredName || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Student";
    const { data: existing, error: readError } = await supabase
      .from("profiles").select("id, department, year").eq("id", authUser.id).maybeSingle();
    if (readError) throw readError;

    if (!existing) {
      const { error } = await supabase.from("profiles").insert({
        id: authUser.id, display_name: displayName, department: "BCA", year: 1, role: "student"
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("profiles")
        .update({ display_name: displayName, department: existing.department || "BCA", year: existing.year || 1 }).eq("id", authUser.id);
      if (error) throw error;
    }
  }

  async function loginUser(user) {
    const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
    const { data: profile } = await supabase.from("profiles")
      .select("display_name, department, year, role, bio").eq("id", user.id).maybeSingle();

    currentUser = {
      id: user.id,
      name: profile?.display_name || metadataName || user.email?.split("@")[0] || "Student",
      email: user.email,
      department: profile?.department || "BCA",
      year: profile?.year || 1,
      bio: profile?.bio || ""
    };

    // Remove old demo-only credentials/session; Supabase manages the real session.
    Object.values(STORAGE).forEach(key => {
      if (key === STORAGE.users || key === STORAGE.session) remove(key);
    });

    if (!read(STORAGE.requests, null)) write(STORAGE.requests, []);
    if (!read(STORAGE.accepted, null)) write(STORAGE.accepted, []);

    updateUserDetails();
    const pn = $("#profileDisplayName"); if (pn) pn.value = currentUser.name;
    const py = $("#profileYear"); if (py) py.value = String(currentUser.year);
    const pb = $("#profileBio"); if (pb) pb.value = currentUser.bio;
    await loadBcaStudents();
    await loadCampusGroups();
    renderChats();
    updateDashboardStats();
    restoreJoinedGroups();
    showDashboard("home");
    showToast("Welcome to VYRO, " + (currentUser.name.split(/\s+/)[0] || "student") + "!");
  }

  async function logout() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) return showToast(error.message);
    }
    currentUser = null;
    chatPartner = null;

    remove(STORAGE.session);

    showLanding();
    showToast("You have logged out.");
  }

  /* ==========================================
     DASHBOARD NAVIGATION
  ========================================== */

  function showDashboard(section = "home") {
    const allowedSections = [
      "home",
      "chats",
      "chatroom",
      "groups",
      "announcements",
      "meetings",
      "profile",
      "departments",
      "safety"
    ];

    if (!allowedSections.includes(section)) {
      section = "home";
    }

    $("#landingPage")?.classList.add("hidden");
    $("#authPage")?.classList.add("hidden");
    $("#appPage")?.classList.remove("hidden");

    $$(".dashboard-section").forEach(element => {
      element.classList.toggle(
        "hidden",
        element.id !== `section-${section}`
      );
    });

    $$("[data-section]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.section === section
      );
    });

    const titles = {
      home: "Overview",
      chats: "Chats",
      chatroom: "Conversation",
      groups: "Groups",
      announcements: "Announcements",
      meetings: "Meetings & Events",
      profile: "My Profile",
      departments: "BCA Department",
      safety: "Privacy & Safety"
    };

    const breadcrumb = $("#breadcrumbTitle");

    if (breadcrumb) {
      breadcrumb.textContent = titles[section] || "Overview";
    }

    closeSidebar();

    if (section === "chats") {
      renderChats();
    }

    if (section === "chatroom") {
      renderMessages();
    }

    if (section === "safety") {
      renderSafetyLists();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* ==========================================
     USER PROFILE AND AVATARS
  ========================================== */

  function updateUserDetails() {
    const user = currentUser || read(STORAGE.session, null);

    if (!user) return;

    currentUser = user;

    const displayName = read(
      STORAGE.displayName,
      user.name || "Student"
    );

    [
      "#sidebarName",
      "#welcomeName",
      "#profileName"
    ].forEach(selector => {
      const element = $(selector);

      if (element) {
        element.textContent = displayName;
      }
    });

    [
      "#sidebarAvatar",
      "#topAvatar",
      "#profileAvatar",
      "#chatRoomAvatar"
    ].forEach(selector => {
      const element = $(selector);

      if (element) {
        element.textContent = initials(displayName);
      }
    });

    const input = $("#displayNameInput");

    if (input && !input.value) {
      input.value = displayName;
    }
  }

  function saveDisplayName() {
    const input = $("#displayNameInput");
    const name = (input?.value || "").trim();

    if (!name) {
      showToast("Please enter a display name.");
      return;
    }

    if (name.length > 50) {
      showToast("Display name must be 50 characters or fewer.");
      return;
    }

    write(STORAGE.displayName, name);
    updateUserDetails();

    showToast("Display name saved on this device.");
  }

  /* ==========================================
     MOBILE SIDEBAR
  ========================================== */

  function toggleSidebar() {
    const sidebar = $("#sidebar");

    if (!sidebar) return;

    sidebar.classList.toggle("sidebar-open");

    document.body.classList.toggle(
      "sidebar-visible",
      sidebar.classList.contains("sidebar-open")
    );
  }

  function closeSidebar() {
    $("#sidebar")?.classList.remove("sidebar-open");
    document.body.classList.remove("sidebar-visible");
  }

  /* ==========================================
     MESSAGE REQUESTS AND ACCEPTED CHATS
  ========================================== */

  function getRequests() {
    return read(STORAGE.requests, []);
  }

  function getAccepted() {
    return read(STORAGE.accepted, []);
  }

  function updateDashboardStats() {
    const accepted = getAccepted();

    const pending = getRequests().filter(
      item => item.status === "pending"
    );

    function setText(selector, value) {
      const element = $(selector);

      if (element) {
        element.textContent = String(value);
      }
    }

    setText("#chatStat", accepted.length);
    setText("#requestCount", pending.length);
    setText("#requestTabCount", pending.length);
    setText("#homeRequestCount", pending.length);
  }

  async function renderChats() {
    if (!currentUser || !supabase) return;
    const { data: reqs, error: re } = await supabase.from("chat_requests").select("id,sender_id,recipient_id,status,created_at").eq("recipient_id",currentUser.id).eq("status","pending").order("created_at",{ascending:false});
    const { data: sent, error: se } = await supabase.from("chat_requests").select("id,sender_id,recipient_id,status,created_at").eq("sender_id",currentUser.id).eq("status","pending");
    const { data: convs, error: ce } = await supabase.from("conversation_members").select("conversation_id, conversations(id, request_id, chat_requests(id,sender_id,recipient_id), messages(body,created_at,sender_id))").eq("user_id",currentUser.id);
    if (re || se || ce) { showToast((re||se||ce).message); return; }
    const peopleIds=[...(reqs||[]).map(x=>x.sender_id),...(sent||[]).map(x=>x.recipient_id)];
    const {data: people}=peopleIds.length ? await supabase.from("profiles").select("id,display_name,department,year").in("id",peopleIds) : {data:[]};
    const names=new Map((people||[]).map(p=>[p.id,p]));
    const requestList=$("#requestList"), acceptedList=$("#acceptedChatList");
    if(requestList) requestList.innerHTML=(reqs||[]).length?(reqs||[]).map(r=>{const p=names.get(r.sender_id)||{};return `<div class="request-card" style="display:flex;gap:12px;align-items:center;padding:15px;border-bottom:1px solid #edf0f5"><div class="avatar avatar-purple">${escapeHTML(initials(p.display_name))}</div><div style="flex:1"><strong>${escapeHTML(p.display_name||"BCA Student")}</strong><p class="muted-text">BCA · Year ${p.year||"—"}</p></div><button class="btn btn-primary" data-accept-request="${r.id}">Accept</button><button class="btn btn-outline" data-decline-request="${r.id}">Decline</button></div>`}).join(""):'<div class="empty-state"><p>No pending requests.</p></div>';
    const conversations=(convs||[]).map(x=>x.conversations).filter(Boolean);
    const otherIds=conversations.map(c=>c.chat_requests?.sender_id===currentUser.id?c.chat_requests?.recipient_id:c.chat_requests?.sender_id).filter(Boolean);
    const {data: others}=otherIds.length?await supabase.from("profiles").select("id,display_name,year").in("id",otherIds):{data:[]};
    const otherMap=new Map((others||[]).map(p=>[p.id,p]));
    if(acceptedList) acceptedList.innerHTML=conversations.length?conversations.map(c=>{const oid=c.chat_requests?.sender_id===currentUser.id?c.chat_requests?.recipient_id:c.chat_requests?.sender_id;const p=otherMap.get(oid)||{};return `<button class="accepted-chat-row" data-open-chat="${c.id}" style="display:flex;gap:12px;width:100%;padding:14px;background:transparent;border:0;border-bottom:1px solid #edf0f5;text-align:left"><strong>${escapeHTML(p.display_name||"BCA Student")}</strong><span style="margin-left:auto">Open ↗</span></button>`}).join(""):'<div class="empty-state"><p>No accepted chats yet.</p></div>';
    const count=(reqs||[]).length; ["#requestCount","#requestTabCount","#homeRequestCount"].forEach(sel=>{const el=$(sel);if(el)el.textContent=count});
  }

  function showChatTab(tab) {
    const selectedTab = tab === "accepted"
      ? "accepted"
      : "requests";

    $("#requestsPanel")?.classList.toggle("hidden", selectedTab !== "requests");
    $("#acceptedPanel")?.classList.toggle("hidden", selectedTab !== "accepted");

    $$("[data-chat-tab]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.chatTab === selectedTab
      );
    });

    renderChats();
  }

  async function acceptRequest(id) {
    const { data, error } = await supabase.rpc("accept_chat_request", { request_id: id });
    if (error) return showToast(error.message);
    await renderChats(); showChatTab("accepted");
    showToast("Request accepted. Chat is ready.");
  }

  async function declineRequest(id) {
    const { error } = await supabase.from("chat_requests").update({status:"rejected", responded_at:new Date().toISOString()}).eq("id",id).eq("recipient_id",currentUser.id).eq("status","pending");
    if (error) return showToast(error.message);
    await renderChats(); updateDashboardStats(); showToast("Request declined.");
  }

  /* ==========================================
     OPEN CHAT AND SEND MESSAGES
  ========================================== */

  async function openChat(id) {
    const {data: membership}=await supabase.from("conversation_members").select("conversation_id").eq("conversation_id",id).eq("user_id",currentUser.id).maybeSingle();
    if(!membership) return showToast("Chat is not available.");
    chatPartner={id};
    const title=$("#chatRoomName"); if(title) title.textContent="VYRO conversation";
    showDashboard("chatroom"); await renderMessages();
  }
  async function renderMessages(){
    const box=$("#chatMessages"); if(!box||!chatPartner)return;
    const {data: rows,error}=await supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id",chatPartner.id).order("created_at");
    if(error){box.textContent=error.message;return;}
    box.innerHTML=(rows||[]).map(m=>`<div class="chat-message ${m.sender_id===currentUser.id?'message-mine':'message-theirs'}" style="max-width:78%;margin:10px ${m.sender_id===currentUser.id?'0 0 auto':'auto 0 0'};padding:10px 13px;border-radius:12px;background:${m.sender_id===currentUser.id?'#edf0ff':'#f3f5f8'}"><p>${escapeHTML(m.body)}</p><small>${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>`).join("")||'<div class="empty-state"><p>Your conversation starts here.</p></div>';
    box.scrollTop=box.scrollHeight;
  }
  async function sendMessage(event){event.preventDefault();const input=$("#chatMessageInput")||$("#chatInput");const body=(input?.value||"").trim();if(!body||!chatPartner)return;const {error}=await supabase.from("messages").insert({conversation_id:chatPartner.id,sender_id:currentUser.id,body});if(error)return showToast(error.message);input.value="";await renderMessages();}

  /* ==========================================
     GROUP JOIN / LEAVE
  ========================================== */

  function joinGroup(button, groupName) {
    const groups = read(STORAGE.groups, []);
    const alreadyJoined = groups.includes(groupName);

    if (alreadyJoined) {
      write(
        STORAGE.groups,
        groups.filter(name => name !== groupName)
      );

      button.textContent = "Join group ↗";
      button.classList.remove("joined");

      showToast(`You left ${groupName}.`);
    } else {
      groups.push(groupName);
      write(STORAGE.groups, groups);

      button.textContent = "Joined ✓";
      button.classList.add("joined");

      showToast(`Joined ${groupName} in demo mode.`);
    }
  }

  function restoreJoinedGroups() {
    const groups = read(STORAGE.groups, []);

    $$(".join-button").forEach(button => {
      const match = button
        .getAttribute("onclick")
        ?.match(/joinGroup\(this,\s*'([^']+)'\)/);

      if (match && groups.includes(match[1])) {
        button.textContent = "Joined ✓";
        button.classList.add("joined");
      }
    });
  }

  /* ==========================================
     PRIVACY AND SAFETY MODAL
  ========================================== */

  function openSafetyMenu(person) {
    pendingSafetyPerson = person || chatPartner || {
      id: "demo-student",
      name: "Demo student"
    };

    const modal = $("#safetyModal");
    const title = $("#safetyModalTitle");
    const description = $("#safetyModalDescription");

    if (title) {
      title.textContent =
        `Safety options for ${pendingSafetyPerson.name || "student"}`;
    }

    if (description) {
      description.textContent =
        "Choose whether to report this demo user or block them locally.";
    }

    modal?.classList.remove("hidden");
  }

  function closeSafetyModal() {
    $("#safetyModal")?.classList.add("hidden");
  }

  function renderSafetyLists() {
    const blocked = read(STORAGE.blocked, []);
    const reports = read(STORAGE.reports, []);

    const blockedList = $("#blockedList");
    const reportsList = $("#reportsList");

    if (blockedList) {
      blockedList.innerHTML = blocked.length
        ? blocked.map(person => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #edf0f5">
            <span>${escapeHTML(person.name)}</span>
            <button class="btn btn-outline"
                    data-unblock="${escapeHTML(person.id)}">
              Unblock
            </button>
          </div>
        `).join("")
        : `
          <div class="empty-icon">⬡</div>
          <h3>No blocked users</h3>
          <p>Students you block in the demo will appear here.</p>
        `;
    }

    if (reportsList) {
      reportsList.innerHTML = reports.length
        ? reports.map(report => `
          <div style="padding:10px 0;border-bottom:1px solid #edf0f5">
            <strong>${escapeHTML(report.name)}</strong>
            <p>${escapeHTML(report.reason)}</p>
            <small>
              ${escapeHTML(new Date(report.time).toLocaleString())}
              · Local demo only
            </small>
          </div>
        `).join("")
        : `
          <div class="empty-icon">⚑</div>
          <h3>No reports submitted</h3>
          <p>Your demo report history will appear here.</p>
        `;
    }
  }

  function submitReport() {
    const person = pendingSafetyPerson || chatPartner || {
      id: "demo-student",
      name: "Demo student"
    };

    const reason = $("#reportReason")?.value || "Other";
    const reports = read(STORAGE.reports, []);

    reports.unshift({
      id: `report-${Date.now()}`,
      personId: person.id,
      name: person.name,
      reason,
      time: new Date().toISOString()
    });

    write(STORAGE.reports, reports);

    closeSafetyModal();
    renderSafetyLists();

    showToast(
      "Demo report saved on this device; it was not sent to a moderator."
    );
  }

  function blockStudent() {
    const person = pendingSafetyPerson || chatPartner || {
      id: "demo-student",
      name: "Demo student"
    };

    const blocked = read(STORAGE.blocked, []);

    if (!blocked.some(item => item.id === person.id)) {
      blocked.push({
        id: person.id,
        name: person.name
      });
    }

    write(STORAGE.blocked, blocked);

    write(
      STORAGE.accepted,
      getAccepted().filter(item => item.id !== person.id)
    );

    closeSafetyModal();
    renderSafetyLists();
    renderChats();
    updateDashboardStats();

    if (chatPartner?.id === person.id) {
      chatPartner = null;
      showDashboard("chats");
    }

    showToast(`${person.name} blocked in this browser demo.`);
  }

  function unblockStudent(id) {
    write(
      STORAGE.blocked,
      read(STORAGE.blocked, []).filter(item => item.id !== id)
    );

    renderSafetyLists();
    showToast("User unblocked in this demo.");
  }

  async function loadBcaStudents(){
    const box=$("#bcaStudentList"); if(!box||!currentUser)return;
    box.innerHTML='<p class="muted-text">Loading students…</p>';
    let q=supabase.from("profiles").select("id,display_name,department,year,bio").eq("department","BCA").order("year").order("display_name");
    const year=$("#bcaYearFilter")?.value||"all"; if(year!=="all")q=q.eq("year",Number(year));
    const {data,error}=await q; if(error){box.textContent=error.message;return;}
    const students=(data||[]).filter(p=>p.id!==currentUser.id);
    box.innerHTML=students.length?students.map(p=>`<div style="display:flex;align-items:center;gap:12px;padding:13px;border-bottom:1px solid #edf0f5"><div class="avatar avatar-purple">${escapeHTML(initials(p.display_name))}</div><div style="flex:1"><strong>${escapeHTML(p.display_name)}</strong><p class="muted-text">BCA · Year ${p.year||1}</p></div><button class="btn btn-outline" onclick="sendChatRequest('${p.id}')">Request chat</button></div>`).join(""):'<div class="empty-state"><p>No other BCA students found for this year.</p></div>';
  }
  async function sendChatRequest(recipient){
    if(!currentUser||recipient===currentUser.id)return;
    const {data: existing,error:checkError}=await supabase.from("chat_requests").select("id,status,sender_id,recipient_id").or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${recipient}),and(sender_id.eq.${recipient},recipient_id.eq.${currentUser.id})`).in("status",["pending","accepted"]);
    if(checkError)return showToast(checkError.message);
    if(existing?.length)return showToast("A request or chat already exists with this student.");
    const {error}=await supabase.from("chat_requests").insert({sender_id:currentUser.id,recipient_id:recipient,status:"pending"});
    if(error)return showToast(error.message);showToast("Chat request sent.");
  }
  async function loadCampusGroups(){
    const box=$("#campusGroupList");if(!box||!currentUser)return;
    const {data,error}=await supabase.from("campus_groups").select("id,name,description,created_by,department").eq("department","BCA").order("created_at",{ascending:false});
    if(error){box.textContent=error.message;return;}
    const {data: joined}=await supabase.from("group_members").select("group_id").eq("user_id",currentUser.id);const ids=new Set((joined||[]).map(x=>x.group_id));
    box.innerHTML=(data||[]).map(g=>`<div style="padding:14px;border-bottom:1px solid #edf0f5"><strong>${escapeHTML(g.name)}</strong><p class="muted-text">${escapeHTML(g.description||"")}</p><button class="btn btn-outline" onclick="joinCampusGroup('${g.id}')">${ids.has(g.id)?'Joined':'Join group'}</button></div>`).join("")||'<div class="empty-state"><p>No groups yet. Create the first one.</p></div>';
  }
  async function createCampusGroup(event){event.preventDefault();const name=$("#newGroupName")?.value.trim(),description=$("#newGroupDescription")?.value.trim();if(!name)return;const {data,error}=await supabase.from("campus_groups").insert({name,description,department:"BCA",created_by:currentUser.id,visibility:"department"}).select("id").single();if(error)return showToast(error.message);const join=await supabase.from("group_members").insert({group_id:data.id,user_id:currentUser.id,membership_role:"owner"});if(join.error)return showToast(join.error.message);event.target.reset();await loadCampusGroups();showToast("Group created.");}
  async function joinCampusGroup(id){const {error}=await supabase.from("group_members").insert({group_id:id,user_id:currentUser.id,membership_role:"member"});if(error&& !/duplicate/i.test(error.message))return showToast(error.message);await loadCampusGroups();showToast("Joined group.");}
  async function saveProfile(event){event.preventDefault();const display_name=$("#profileDisplayName").value.trim(),year=Number($("#profileYear").value),bio=$("#profileBio").value.trim();const {error}=await supabase.from("profiles").update({display_name,department:"BCA",year,bio}).eq("id",currentUser.id);if(error)return showToast(error.message);currentUser.name=display_name;currentUser.year=year;currentUser.bio=bio;showToast("Profile saved.");await loadBcaStudents();}

  /* ==========================================
     GLOBAL SEARCH
  ========================================== */

  function handleGlobalSearch(event) {
    if (event.key !== "Enter") return;

    const query = event.currentTarget.value.trim().toLowerCase();

    if (!query) return;

    const sections = [
      "home",
      "chats",
      "groups",
      "announcements",
      "meetings",
      "profile",
      "safety"
    ];

    let found = null;

    for (const section of sections) {
      const element = $(`#section-${section}`);

      if (
        element &&
        element.textContent.toLowerCase().includes(query)
      ) {
        found = section;
        break;
      }
    }

    if (found) {
      showDashboard(found);
      showToast(`Showing results related to "${query}".`);
    } else {
      showToast(`No visible demo content found for "${query}".`);
    }
  }

  /* ==========================================
     EVENT LISTENERS
  ========================================== */

  function bindEvents() {
    $("#authForm")?.addEventListener("submit", handleAuthSubmit);
    $("#createGroupForm")?.addEventListener("submit", createCampusGroup);
    $("#profileForm")?.addEventListener("submit", saveProfile);

    $("#chatMessageForm")?.addEventListener("submit", sendMessage);

    $("#globalSearch")?.addEventListener(
      "keydown",
      handleGlobalSearch
    );

    $("#safetyModal")?.addEventListener("click", event => {
      if (event.target.id === "safetyModal") {
        closeSafetyModal();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeSafetyModal();
      }
    });

    document.addEventListener("click", event => {
      const acceptButton = event.target.closest(
        "[data-accept-request]"
      );

      if (acceptButton) {
        acceptRequest(acceptButton.dataset.acceptRequest);
        return;
      }

      const declineButton = event.target.closest(
        "[data-decline-request]"
      );

      if (declineButton) {
        declineRequest(declineButton.dataset.declineRequest);
        return;
      }

      const openChatButton = event.target.closest(
        "[data-open-chat]"
      );

      if (openChatButton) {
        openChat(openChatButton.dataset.openChat);
        return;
      }

      const reviewButton = event.target.closest(
        "[data-open-requests]"
      );

      if (reviewButton) {
        showDashboard("chats");
        showChatTab("requests");
        return;
      }

      const unblockButton = event.target.closest("[data-unblock]");

      if (unblockButton) {
        unblockStudent(unblockButton.dataset.unblock);
      }
    });
  }

  /* ==========================================
     CONNECT HTML BUTTONS
     These functions are used by onclick=""
  ========================================== */

  Object.assign(window, {
    showLanding,
    showAuth,
    switchAuthMode,
    togglePassword,
    showDashboard,
    showChatTab,
    joinGroup,
    toggleSidebar,
    logout,
    saveDisplayName,
    openSafetyMenu,
    closeSafetyModal,
    submitReport,
    blockStudent,
    showToast, loadBcaStudents, sendChatRequest, joinCampusGroup,

    // Compatibility with alternate button markup
    navigate: showDashboard
  });

  /* ==========================================
     INITIALIZE
  ========================================== */

  function init() {
    bindEvents();

    if (!supabase) {
      setAuthMessage("Supabase library did not load. Check your internet connection and refresh.");
      showLanding();
      return;
    }

    const demoNote = $(".auth-demo-note");
    if (demoNote) demoNote.textContent = "Your account is securely managed by VYRO. Your email is never shown on your public profile.";

    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        currentUser = null;
        return;
      }
      // Session restoration is handled once below; auth changes keep the UI in sync.
    });

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        setAuthMessage(error.message);
        showLanding();
        return;
      }
      if (data.session?.user) {
        // Always show the landing page on a fresh visit; login is explicit.
        setAuthMode("login");
        showLanding();
      } else {
        setAuthMode("signup");
        restoreJoinedGroups();
        showLanding();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();