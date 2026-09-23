(function () {
  "use strict";

  const api = window.CodexChat;
  const ids = ["triggerTab", "chatTab", "triggerPanel", "chatPanel", "chatConnection", "chatConnectForm", "chatRunner", "chatToken", "chatConnect", "chatTokenHelp", "chatNotice", "chatWorkspace", "chatNew", "chatRefresh", "chatConversations", "chatMore", "chatDisconnect", "chatTitle", "chatRunStatus", "chatIssueLink", "chatNewSettings", "chatProject", "chatModel", "chatMessages", "chatSendForm", "chatMessage", "chatSend", "chatComposerHint"];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  let config, runners = [], client = null, candidate = null, login = "", current = null;
  let conversations = [], page = 1, more = false, busy = false, refreshing = false;
  let pending = null, timer = null, selection = 0, connectedGeneration = 0;
  const drafts = new Map();

  function notice(message, error) {
    el.chatNotice.textContent = message || "";
    el.chatNotice.classList.toggle("error", Boolean(error));
  }

  function option(value, label) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    return node;
  }

  function setTab(chat) {
    el.triggerPanel.hidden = chat;
    el.chatPanel.hidden = !chat;
    el.triggerTab.setAttribute("aria-pressed", String(!chat));
    el.chatTab.setAttribute("aria-pressed", String(chat));
    document.getElementById("statusPill").hidden = chat;
    document.getElementById("repoLabel").hidden = chat;
    if (chat && client) refresh();
    schedule();
  }

  function saveDraft() { drafts.set(current ? current.number : "new", el.chatMessage.value); }

  function controls() {
    const state = current ? api.status(current, client && client.labels) : { busy: false };
    el.chatSend.disabled = !client || busy || (state.busy && !pending);
    el.chatMessage.disabled = busy || Boolean(pending);
    el.chatProject.disabled = busy || Boolean(pending);
    el.chatModel.disabled = busy || Boolean(pending);
    el.chatSend.textContent = busy ? "Sending…" : pending ? "Retry delivery" : "Send";
    el.chatNew.disabled = busy || Boolean(pending);
    el.chatMore.disabled = busy || refreshing || Boolean(pending);
    el.chatRefresh.disabled = busy || refreshing;
    el.chatComposerHint.textContent = pending ? "Your message is preserved. Retry checks for an existing copy first." : state.busy ? "Waiting for the runner. You can draft your next message now." : "Replies refresh every 15 seconds while Chat is open.";
    el.chatConversations.querySelectorAll("button").forEach(button => { button.disabled = busy || Boolean(pending); });
  }

  function renderList() {
    el.chatConversations.replaceChildren();
    for (const issue of conversations) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(issue.title).replace(/^Chat:\s*/, "");
      button.setAttribute("aria-current", String(Boolean(current && current.number === issue.number)));
      const meta = document.createElement("small");
      meta.textContent = "#" + issue.number + " · " + api.status(issue, client.labels).text;
      button.appendChild(meta);
      button.addEventListener("click", () => selectIssue(issue));
      el.chatConversations.appendChild(button);
    }
    if (!conversations.length) {
      const text = document.createElement("p");
      text.className = "chat-help";
      text.textContent = more ? "No chats on this page. Load older conversations or start a new chat." : "No conversations yet. Start with a message.";
      el.chatConversations.appendChild(text);
    }
    el.chatMore.hidden = !more;
    controls();
  }

  function renderHeading() {
    el.chatTitle.textContent = current ? String(current.title).replace(/^Chat:\s*/, "") : "New conversation";
    el.chatRunStatus.textContent = current ? api.status(current, client.labels).text : "Ready for your message";
    el.chatNewSettings.hidden = Boolean(current);
    el.chatIssueLink.hidden = !current;
    if (current) el.chatIssueLink.href = "https://github.com/" + encodeURIComponent(client.owner) + "/" + encodeURIComponent(client.repo) + "/issues/" + current.number;
    else el.chatIssueLink.removeAttribute("href");
    controls();
  }

  function renderMessages(comments) {
    const rows = current ? [{ body: api.firstMessage(current), user: current.user, created_at: current.created_at, first: true }].concat(comments) : [];
    const signature = JSON.stringify(rows.map(row => [row.id, row.body, row.updated_at, row.created_at, row.user && row.user.login]));
    if (el.chatMessages.dataset.signature === signature) return;
    const nearEnd = el.chatMessages.scrollHeight - el.chatMessages.scrollTop - el.chatMessages.clientHeight < 80;
    el.chatMessages.dataset.signature = signature;
    el.chatMessages.replaceChildren();
    for (const row of rows) {
      const body = row.first ? row.body : api.cleanMessage(row.body);
      const requester = row.first || /^Codex follow-up:/.test(row.body || "");
      const bubble = document.createElement("article");
      bubble.className = "chat-message" + (requester ? " requester" : "");
      const meta = document.createElement("small");
      // The existing runner may post using the same GitHub account as the user.
      // Show its actual author rather than treating author identity as bot proof.
      const author = row.user && row.user.login || "GitHub";
      meta.textContent = author + " · " + new Date(row.created_at).toLocaleString();
      const content = document.createElement("pre");
      content.textContent = body; // Issue text is untrusted: never render it as HTML.
      bubble.append(meta, content);
      el.chatMessages.appendChild(bubble);
    }
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "chat-empty";
      empty.textContent = "Describe what you need. Each conversation stays in its own private GitHub issue.";
      el.chatMessages.appendChild(empty);
    }
    if (nearEnd) el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }

  async function selectIssue(issue) {
    if (busy || pending) return;
    saveDraft();
    selection += 1;
    current = issue;
    el.chatMessage.value = drafts.get(issue.number) || "";
    delete el.chatMessages.dataset.signature;
    renderHeading();
    renderMessages([]);
    renderList();
    await refresh();
  }

  function newChat() {
    if (busy || pending) return;
    saveDraft();
    selection += 1;
    current = null;
    el.chatMessage.value = drafts.get("new") || "";
    renderHeading();
    renderMessages([]);
    renderList();
    notice("");
    el.chatMessage.focus();
  }

  function mergeIssues(issues) {
    const merged = new Map(conversations.map(issue => [issue.number, issue]));
    issues.forEach(issue => merged.set(issue.number, issue));
    conversations = Array.from(merged.values()).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  }

  async function refresh(loadMore) {
    if (!client || refreshing || busy) return;
    const active = client;
    const selected = selection;
    const issueNumber = current && current.number;
    refreshing = true;
    controls();
    try {
      const list = await active.list(loadMore ? page + 1 : 1);
      if (client !== active) return;
      mergeIssues(list.issues);
      if (loadMore) page += 1;
      if (loadMore || page === 1) more = list.more;
      renderList();
      if (issueNumber) {
        const issue = await active.read(issueNumber);
        const comments = await active.comments(issueNumber);
        if (client !== active || selection !== selected) return;
        current = issue;
        mergeIssues([issue]);
        renderHeading();
        renderMessages(comments);
        renderList();
      }
      if (!pending) notice("Updated " + new Date().toLocaleTimeString() + ". Status reflects the last GitHub update, not VM connectivity.");
    } catch (error) {
      if (client === active) notice(error.message, true);
    } finally {
      if (client === active) {
        refreshing = false;
        controls();
        schedule();
        // A user may have switched conversations while this request was in flight.
        if (selection !== selected) refresh();
      }
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (client && !document.hidden && !el.chatPanel.hidden) {
      const delay = Math.max(15000, client.retryAt - Date.now());
      timer = setTimeout(() => refresh(), delay);
    }
  }

  function disconnect() {
    connectedGeneration += 1;
    selection += 1;
    if (client) client.disconnect();
    if (candidate) candidate.disconnect();
    client = null;
    candidate = null;
    login = "";
    current = null;
    pending = null;
    conversations = [];
    drafts.clear();
    page = 1;
    more = false;
    busy = false;
    refreshing = false;
    clearTimeout(timer);
    el.chatToken.value = "";
    el.chatMessage.value = "";
    el.chatConversations.replaceChildren();
    el.chatMessages.replaceChildren();
    delete el.chatMessages.dataset.signature;
    el.chatWorkspace.hidden = true;
    el.chatConnectForm.hidden = false;
    el.chatConnect.disabled = !config;
    el.chatTokenHelp.hidden = false;
    el.chatConnection.textContent = "Disconnected";
    notice("Disconnected. Token and loaded conversation data cleared from this page.");
  }

  async function connect(event) {
    event.preventDefault();
    if (candidate || client || !config) return;
    const runner = runners.find(item => item.id === el.chatRunner.value);
    if (!runner) return notice("Choose a runner.", true);
    const generation = connectedGeneration;
    el.chatConnect.disabled = true;
    try {
      candidate = new api.Client({ owner: runner.owner, repo: runner.repo, token: el.chatToken.value, labels: (config.github.chat || {}).labels });
      el.chatToken.value = "";
      const active = candidate;
      login = await active.connect();
      if (generation !== connectedGeneration) return;
      client = active;
      candidate = null;
      el.chatConnection.textContent = login + " · " + runner.name;
      el.chatConnectForm.hidden = true;
      el.chatTokenHelp.hidden = true;
      el.chatWorkspace.hidden = false;
      renderHeading();
      renderMessages([]);
      await refresh();
    } catch (error) {
      if (generation !== connectedGeneration) return;
      if (candidate) candidate.disconnect();
      candidate = null;
      notice(error.message, true);
    } finally {
      if (generation === connectedGeneration) el.chatConnect.disabled = false;
    }
  }

  async function send(event) {
    event.preventDefault();
    if (!client || busy || el.chatSend.disabled) return;
    const active = client;
    const oldDraftKey = current ? current.number : "new";
    try {
      if (!pending) pending = api.createOperation(el.chatMessage.value, { project: el.chatProject.value, model: el.chatModel.value }, current);
      busy = true;
      clearTimeout(timer);
      controls();
      const issue = await active.send(pending);
      if (client !== active) return;
      current = issue;
      selection += 1;
      pending = null;
      drafts.delete(oldDraftKey);
      el.chatMessage.value = "";
      mergeIssues([issue]);
      renderHeading();
      if (oldDraftKey === "new") renderMessages([]);
      renderList();
      notice("Message delivered. The VM runner will pick it up on its next poll.");
    } catch (error) {
      if (client === active) notice(error.message + " Your message is kept here; Retry delivery checks for duplicates. After a reload, check GitHub before sending again.", true);
    } finally {
      if (client === active) {
        busy = false;
        controls();
        if (!pending) await refresh();
        schedule();
      }
    }
  }

  el.triggerTab.addEventListener("click", () => setTab(false));
  el.chatTab.addEventListener("click", () => setTab(true));
  el.chatConnectForm.addEventListener("submit", connect);
  el.chatSendForm.addEventListener("submit", send);
  el.chatDisconnect.addEventListener("click", disconnect);
  el.chatNew.addEventListener("click", newChat);
  el.chatRefresh.addEventListener("click", () => refresh());
  el.chatMore.addEventListener("click", () => refresh(true));
  el.chatMessage.addEventListener("input", saveDraft);
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("pagehide", disconnect);
  el.chatConnect.disabled = true;

  fetch("./projects.json?v=20260923-chat", { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error("Unable to load Chat configuration. Reload the page to retry.");
    return response.json();
  }).then(value => {
    const custom = (value.workflows || []).find(workflow => workflow.id === "custom");
    if (!custom) throw new Error("Chat needs the custom workflow in projects.json.");
    config = value;
    runners = (config.github.runners || []).filter(runner => !runner.workflowIds || !runner.workflowIds.length || runner.workflowIds.includes("custom"));
    if (!runners.length) throw new Error("No runner supports Chat's custom workflow.");
    runners.forEach(runner => el.chatRunner.appendChild(option(runner.id, runner.name + " · " + runner.owner + "/" + runner.repo)));
    (config.projects || []).filter(project => !custom.projectAliases || custom.projectAliases.includes(project.alias)).forEach(project => el.chatProject.appendChild(option(project.alias, project.name)));
    (config.codexModelPresets || []).forEach(model => {
      const node = option(model.id, model.label);
      node.selected = Boolean(model.default);
      el.chatModel.appendChild(node);
    });
    if (!el.chatProject.options.length || !el.chatModel.options.length) throw new Error("Chat needs at least one work context and model.");
    el.chatConnect.disabled = false;
    if (location.hash === "#chat") setTab(true);
  }).catch(error => { config = null; notice(error.message, true); });
})();
