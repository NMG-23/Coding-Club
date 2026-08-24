"use strict";

    /* ---------- Theme Manager ---------- */
    function changeTheme(themeName) {
      localStorage.setItem("ctf_admin_theme", themeName);
      document.body.classList.add("fade-out");
      setTimeout(() => {
        if (themeName === 'normal') window.location.href = '/public/admin.html';
        else if (themeName === 'claude') window.location.href = '/public/admin-claude.html';
        else if (themeName === 'medieval') window.location.href = '/public/admin-medieval.html';
        else if (themeName === 'horror') window.location.href = '/public/admin-horror.html';
        else if (themeName === 'barbie') window.location.href = '/public/admin-barbie.html';
        else if (themeName === 'manga') window.location.href = '/public/admin-manga.html';
        else if (themeName === 'manga-color') window.location.href = '/public/admin-manga-color.html';
        else if (themeName === 'crystal') window.location.href = '/public/admin-crystal.html';
      }, 350);
    }

    let teamRecords = [];
    let wsInstance = null;

    async function apiRequest(endpoint, options = {}) {
      options.credentials = "include";
      try {
        const response = await fetch(endpoint, options);
        let data = null;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) { data = await response.json(); }
        else { const text = await response.text(); try { data = JSON.parse(text); } catch (_) { data = { text }; } }
        return { ok: response.ok, status: response.status, data };
      } catch (err) { return { ok: false, status: 0, error: err.message || "Network Error" }; }
    }

    function initWebSocket() {
      if (wsInstance) { try { wsInstance.close(); } catch (_) { } }
      try {
        const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsInstance = ws;
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === "leaderboard:update" || msg.type === "challenge:first_blood" || msg.type === "event:state_change") {
              loadStats(); loadTeams();
              if (msg.payload?.action) {
                const el = document.getElementById("eventStatusDisplay");
                el.textContent = `Event Status: ${msg.payload.action.toUpperCase()}`; el.classList.add("active");
              }
            }
          } catch (_) { }
        };
        ws.onclose = () => { setTimeout(() => initWebSocket(), 5000); };
      } catch (err) { }
    }

    function notify(text) {
      const zone = document.getElementById("toastZone");
      const toast = document.createElement("div");
      toast.className = "toast"; toast.textContent = text;
      zone.appendChild(toast);
      setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
    }
    function escapeHtml(val) { return typeof val !== "string" ? "" : val.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }

    let onConfirmCb = null;
    function openModalUI(title, desc, onConfirm, bodyHtml = "") {
      document.getElementById("modalTitle").textContent = title;
      document.getElementById("modalDesc").textContent = desc;
      const bEl = document.getElementById("modalBody");
      if (bodyHtml) { bEl.innerHTML = bodyHtml; bEl.style.display = "block"; } else { bEl.innerHTML = ""; bEl.style.display = "none"; }
      onConfirmCb = onConfirm; document.getElementById("sysModal").classList.add("open");
    }
    function closeModal() { document.getElementById("sysModal").classList.remove("open"); onConfirmCb = null; }
    document.getElementById("modalConfirmBtn").addEventListener("click", () => { if (onConfirmCb) onConfirmCb(); closeModal(); });
    document.getElementById("sysModal").addEventListener("click", (e) => { if (e.target.id === "sysModal") closeModal(); });

    async function adminLogout() {
      try {
        await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
        window.location.href = "/public/admin-login.html";
      } catch (_) { }
    }

    async function loadStats() {
      const res = await apiRequest("/api/admin/stats");
      if (!res.ok) return;
      document.getElementById("m-teams").textContent = res.data?.teams ?? 0;
      document.getElementById("m-sessions").textContent = res.data?.activeSessions ?? 0;
      document.getElementById("m-subs").textContent = res.data?.submissions ?? 0;
      document.getElementById("m-challs").textContent = res.data?.challenges ?? 0;
    }

    async function loadTeams() {
      const res = await apiRequest("/api/admin/teams");
      if (!res.ok) return;
      teamRecords = Array.isArray(res.data) ? res.data : []; filterTeamList();
    }

    function filterTeamList() {
      const query = (document.getElementById("teamFilterInput").value || "").trim().toLowerCase();
      let filtered = query ? teamRecords.filter(t => t.teamName.toLowerCase().includes(query) || String(t.id) === query) : teamRecords;
      const c = document.getElementById("teamsContainer");
      if (filtered.length === 0) { c.innerHTML = `<div style="padding: 32px 0; text-align: center; color: var(--text-faint);">No records found.</div>`; return; }
      c.innerHTML = "";
      filtered.forEach(t => {
        const hasSession = Boolean(t.activeSessionId);
        const el = document.createElement("div"); el.className = "item-row";
        el.innerHTML = `<div class="item-col"><span class="item-title">${escapeHtml(t.teamName)}</span><span class="item-meta">ID: ${t.id} &middot; ${hasSession ? 'Active' : 'Idle'}</span></div><button class="btn btn--sm" style="${!hasSession ? 'opacity:0.3; filter: grayscale(1);' : ''}" onclick="resetSession(${t.id})">Clear</button>`;
        c.appendChild(el);
      });
    }

    async function loadAllData() { await Promise.all([loadStats(), loadTeams()]); }

    async function sendControl(action) {
      const res = await apiRequest("/api/admin/event-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (res.ok && res.data?.success) {
        const el = document.getElementById("eventStatusDisplay"); el.textContent = `Event Status: ${action.toUpperCase()}`; el.classList.add("active"); notify(`State updated: ${action}`);
      } else { notify(res.data?.error || "Action failed"); }
    }

    async function resetSession(teamId) {
      const res = await apiRequest("/api/admin/reset-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: parseInt(teamId, 10) }) });
      if (res.ok && res.data?.success) { notify(`Session cleared for ID ${teamId}`); loadAllData(); }
    }

    function resetAllActiveSessions() {
      const actives = teamRecords.filter(t => Boolean(t.activeSessionId));
      if (!actives.length) { notify("No active sessions detected."); return; }
      openModalUI("Clear All Active", `Force clear active tokens for ${actives.length} teams?`, async () => { for (const t of actives) await resetSession(t.id); notify("All sessions cleared."); });
    }

    async function uploadTeamRoster() {
      const input = document.getElementById("teamFileInput"); const fb = document.getElementById("teamUploadFeedback");
      if (!input.files.length) { notify("Select a file first."); return; }
      const form = new FormData(); form.append("sheet", input.files[0]); fb.textContent = "Processing...";
      const res = await apiRequest("/api/admin/verify-teams/active", { method: "POST", body: form });
      if (res.ok && res.data?.success) { fb.textContent = `Verified: ${res.data.verifiedCount} | Skipped: ${res.data.notFoundCount}`; input.value = ""; loadAllData(); } else { fb.textContent = res.data?.error || "Upload failed."; }
    }

    async function uploadChallengeSheet() {
      const input = document.getElementById("challengeFileInput"); const fb = document.getElementById("challengeUploadFeedback");
      if (!input.files.length) { notify("Select a file first."); return; }
      const form = new FormData(); form.append("sheet", input.files[0]); fb.textContent = "Processing...";
      const res = await apiRequest("/api/admin/import-challenges/active", { method: "POST", body: form });
      if (res.ok && res.data?.success) { fb.textContent = `Imported ${res.data.importedCount} challenges.`; input.value = ""; loadStats(); } else { fb.textContent = res.data?.error || "Upload failed."; }
    }

    async function submitCreateEvent() {
      const name = document.getElementById("newEventName").value.trim(); const description = document.getElementById("newEventDesc").value.trim(); const isActive = document.getElementById("newEventActive").checked;
      if (!name) { notify("Event Name required."); return; }
      const res = await apiRequest("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, isActive }) });
      if (res.ok && res.data?.success) { notify("Event provisioned."); document.getElementById("newEventName").value = ""; document.getElementById("newEventDesc").value = ""; loadAllData(); } else { notify(res.data?.error || "Provision failed."); }
    }

    function confirmPurge(target) {
      openModalUI(`Purge ${target}?`, `This is an irreversible operation.`, async () => {
        const res = await apiRequest(`/api/admin/${target}/active`, { method: "DELETE" });
        if (res.ok && res.data?.success) { notify(`${target} purged.`); loadAllData(); } else { notify(res.data?.error || "Purge failed."); }
      });
    }

    function openDeleteEventModal() {
      const body = `<input class="input-field" id="modalDelEvtInput" type="number" placeholder="Enter Numeric Event ID">`;
      openModalUI("Delete Event", "This will permanently destroy the event and all its history.", async () => {
        const val = parseInt(document.getElementById("modalDelEvtInput").value, 10); if (!val) return;
        const res = await apiRequest(`/api/admin/events/${val}`, { method: "DELETE" });
        if (res.ok && res.data?.success) { notify("Event wiped."); loadAllData(); } else { notify(res.data?.error || "Wipe failed."); }
      }, body);
    }

    initWebSocket();
    loadAllData();