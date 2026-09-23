(function (root) {
  "use strict";

  const MARKER = "<!-- codex-chat:v1 -->";
  const DEFAULT_LABELS = { queued: "codex:queued", running: "codex:running", done: "codex:done", failed: "codex:failed", input: "reply-user", followup: "followup-codex" };

  function isChat(issue) {
    return !issue.pull_request && String(issue.body || "").startsWith(MARKER + "\n");
  }

  function status(issue, labels) {
    labels = Object.assign({}, DEFAULT_LABELS, labels);
    const names = (issue.labels || []).map(label => typeof label === "string" ? label : label.name);
    if (issue.state === "closed") return { text: "Closed · view in GitHub", busy: true };
    for (const pair of [["running", "Working"], ["followup", "Reply queued"], ["queued", "Queued"], ["input", "Waiting for your reply"], ["failed", "Run failed · see reply"], ["done", "Completed"]]) {
      if (names.includes(labels[pair[0]])) return { text: pair[1], busy: ["running", "followup", "queued"].includes(pair[0]) };
    }
    // New issues carry a Queue marker even if GitHub did not apply the label.
    return { text: "Awaiting runner status", busy: true };
  }

  function cleanMessage(body) {
    return String(body || "").replace(/<!-- codex-chat-send:[a-f0-9-]+ -->\n?/g, "").replace(/^Codex follow-up:\s*\n?/, "").trim();
  }

  function firstMessage(issue) {
    const text = cleanMessage(String(issue.body || "").split(/\nTask:\s*\n/).slice(1).join("\nTask:\n"));
    const prefix = "Respond to this message from the requester:\n\n";
    return text.startsWith(prefix) ? text.slice(prefix.length).split("\n").map(line => line.replace(/^> ?/, "")).join("\n") : text;
  }

  function createOperation(message, settings, issue) {
    message = String(message || "").trim();
    if (!message || message.length > 50000) throw new Error("Enter a message of 1–50,000 characters.");
    const id = root.crypto.randomUUID();
    return { id: id, message: message, settings: Object.assign({}, settings), issue: issue || null, attempted: false, posted: false, queued: false };
  }

  function issueBody(operation, labels) {
    const settings = operation.settings;
    for (const key of ["project", "model"]) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(settings[key] || "")) throw new Error("Select a valid work context and model.");
    }
    // Quote the message so lines such as "Commands:" or "Context:" cannot be
    // mistaken for structural fields by the existing trigger-body parser.
    const quoted = operation.message.split("\n").map(line => "> " + line).join("\n");
    return [MARKER, "<!-- codex-chat-send:" + operation.id + " -->", "Queue: " + labels.queued, "Workflow: custom", "Operation: custom", "Project: " + settings.project, "Codex-Model: " + settings.model, "", "Task:", "Respond to this message from the requester:", "", quoted].join("\n");
  }

  class Client {
    constructor(options) {
      if (!/^[a-zA-Z0-9-]+$/.test(options.owner || "") || !/^[a-zA-Z0-9_.-]+$/.test(options.repo || "")) throw new Error("Invalid GitHub owner or repository.");
      this.owner = options.owner;
      this.repo = options.repo;
      this.base = "/repos/" + encodeURIComponent(this.owner) + "/" + encodeURIComponent(this.repo);
      this.labels = Object.assign({}, DEFAULT_LABELS, options.labels);
      this.fetch = options.fetch || root.fetch.bind(root);
      this.token = String(options.token || "").trim();
      if (!this.token) throw new Error("Enter your repository-scoped GitHub token.");
      this.controllers = new Set();
      this.closed = false;
      this.retryAt = 0;
    }

    disconnect() {
      this.closed = true;
      this.token = "";
      for (const controller of this.controllers) controller.abort();
      this.controllers.clear();
    }

    async request(path, method, body) {
      if (this.closed) throw new Error("Disconnected. Connect again to continue.");
      if (!(path === "/user" || path === this.base || path.startsWith(this.base + "/"))) throw new Error("Request outside the selected repository.");
      if (Date.now() < this.retryAt) throw new Error("GitHub rate limit: retry after " + new Date(this.retryAt).toLocaleTimeString() + ".");
      const controller = new AbortController();
      this.controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await this.fetch("https://api.github.com" + path, {
          method: method || "GET", credentials: "omit", cache: "no-store", redirect: "error",
          headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + this.token, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal
        });
        if (!response.ok) {
          const remaining = response.headers.get("x-ratelimit-remaining");
          const retry = response.headers.get("retry-after");
          if (response.status === 429 || (response.status === 403 && (remaining === "0" || retry))) {
            const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
            this.retryAt = Math.max(Date.now() + (Number(retry) || 60) * 1000, reset || 0);
            throw new Error("GitHub rate limit reached. Refresh after " + new Date(this.retryAt).toLocaleTimeString() + ".");
          }
          const errors = { 401: "GitHub token expired or invalid. Disconnect and connect with a valid token.", 403: "GitHub denied access. Check repository selection, Issues read/write permission and any required organization approval.", 404: "Repository or conversation not found. Check the token's repository access.", 422: "GitHub rejected the request. Check that Issues are enabled and the runner labels exist." };
          throw new Error(errors[response.status] || "GitHub request failed (HTTP " + response.status + ").");
        }
        return response.status === 204 ? null : await response.json();
      } catch (error) {
        if (error.name === "AbortError") throw new Error("Request interrupted or timed out. Delivery may already have reached GitHub; retry delivery to check before resending.");
        if (error instanceof TypeError) throw new Error("Cannot reach GitHub. Check your connection, then retry delivery to check before resending.");
        throw error;
      } finally {
        clearTimeout(timeout);
        this.controllers.delete(controller);
      }
    }

    async connect() {
      const repo = await this.request(this.base);
      if (!repo.private) throw new Error("Chat requires a private trigger repository.");
      if (!repo.has_issues || repo.archived || repo.disabled) throw new Error("This repository cannot receive chat issues.");
      const user = await this.request("/user");
      return user.login;
    }

    async list(page) {
      const issues = await this.request(this.base + "/issues?state=all&sort=updated&direction=desc&per_page=100&page=" + (page || 1));
      return { issues: issues.filter(isChat), more: issues.length === 100 };
    }

    async read(number) {
      if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid conversation number.");
      const issue = await this.request(this.base + "/issues/" + number);
      if (!isChat(issue)) throw new Error("This issue is not a Chat conversation.");
      return issue;
    }

    async comments(number) {
      if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid conversation number.");
      const comments = [];
      for (let page = 1; page <= 100; page += 1) {
        const batch = await this.request(this.base + "/issues/" + number + "/comments?per_page=100&page=" + page);
        comments.push(...batch);
        if (batch.length < 100) return comments;
      }
      throw new Error("This conversation is too large to load here. Open it in GitHub.");
    }

    async recoverIssue(operation) {
      const marker = "<!-- codex-chat-send:" + operation.id + " -->";
      for (let page = 1; page <= 20; page += 1) {
        const batch = await this.request(this.base + "/issues?state=all&sort=created&direction=desc&per_page=100&page=" + page);
        const found = batch.find(issue => isChat(issue) && String(issue.body).includes(marker));
        if (found) return found;
        if (batch.length < 100) return null;
      }
      throw new Error("Unable to verify previous delivery. Check GitHub before starting another conversation.");
    }

    async send(operation) {
      if (!operation.issue) {
        if (operation.attempted) operation.issue = await this.recoverIssue(operation);
        if (!operation.issue) {
          const body = issueBody(operation, this.labels);
          operation.attempted = true;
          operation.issue = await this.request(this.base + "/issues", "POST", {
            title: "Chat: " + operation.message.split("\n")[0].slice(0, 180), body: body, labels: [this.labels.queued]
          });
        }
        operation.posted = true;
        operation.queued = true;
        return operation.issue;
      }
      const number = operation.issue.number;
      const marker = "<!-- codex-chat-send:" + operation.id + " -->";
      if (!operation.posted && operation.attempted) {
        operation.posted = (await this.comments(number)).some(comment => String(comment.body).includes(marker));
      }
      if (!operation.posted) {
        const current = await this.read(number);
        if (status(current, this.labels).busy) throw new Error("Wait for this run to finish before sending the next message.");
        operation.attempted = true;
        await this.request(this.base + "/issues/" + number + "/comments", "POST", { body: "Codex follow-up:\n" + operation.message + "\n\n" + marker });
        operation.posted = true;
      }
      if (!operation.queued) {
        // Add only the follow-up label; never replace labels owned by the runner.
        const current = await this.read(number);
        if (current.state === "closed") throw new Error("Message saved, but the conversation is closed. Reopen it in GitHub before retrying delivery.");
        const state = status(current, this.labels);
        if (!state.busy) {
          await this.request(this.base + "/issues/" + number + "/labels", "POST", { labels: [this.labels.followup] });
        } else if (state.text === "Awaiting runner status") {
          throw new Error("Message saved. Runner status is unavailable; refresh before retrying delivery.");
        }
        operation.queued = true;
      }
      return this.read(number);
    }
  }

  const api = { Client: Client, isChat: isChat, status: status, firstMessage: firstMessage, cleanMessage: cleanMessage, createOperation: createOperation, issueBody: issueBody, DEFAULT_LABELS: DEFAULT_LABELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CodexChat = api;
})(typeof window !== "undefined" ? window : globalThis);
