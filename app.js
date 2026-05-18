(function () {
  "use strict";

  var STORAGE_OWNER = "codexTrigger.owner";
  var STORAGE_REPO = "codexTrigger.repo";

  var fallbackConfig = {
    github: {
      owner: "rameshchandranerolu",
      repo: "codex_automation",
      queuedLabel: "codex:queued"
    },
    projects: [
      {
        alias: "codex-automation",
        name: "Codex Automation",
        kind: "Automation",
        description: "Runner and BugDB automation.",
        context: "Use the codex_automation repository and local runner context."
      }
    ]
  };

  var state = {
    config: fallbackConfig,
    projects: [],
    selectedAlias: "",
    mode: "general"
  };

  var els = {};

  function init() {
    cacheElements();
    bindEvents();
    loadLocalSettings();
    loadConfig();
  }

  function cacheElements() {
    [
      "repoLabel",
      "statusPill",
      "projectCount",
      "projectFilter",
      "projectList",
      "selectedProjectLabel",
      "modeGrid",
      "ownerInput",
      "repoInput",
      "dynamicFields",
      "contextInput",
      "titleInput",
      "previewButton",
      "submitButton",
      "resultRow",
      "issuePreview",
      "labelPreview"
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.projectFilter.addEventListener("input", renderProjects);
    els.modeGrid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-mode]");
      if (!button) {
        return;
      }
      state.mode = button.getAttribute("data-mode");
      Array.prototype.forEach.call(els.modeGrid.querySelectorAll(".mode-button"), function (item) {
        item.classList.toggle("active", item === button);
      });
      renderDynamicFields();
      updatePreview();
    });

    [
      els.ownerInput,
      els.repoInput,
      els.contextInput,
      els.titleInput
    ].forEach(function (element) {
      element.addEventListener("input", updatePreview);
      element.addEventListener("change", updatePreview);
    });

    els.previewButton.addEventListener("click", updatePreview);
    els.submitButton.addEventListener("click", createIssue);
  }

  function loadLocalSettings() {
    localStorage.removeItem("codexTrigger.githubToken");
    els.ownerInput.value = localStorage.getItem(STORAGE_OWNER) || "";
    els.repoInput.value = localStorage.getItem(STORAGE_REPO) || "";
  }

  function loadConfig() {
    setStatus("Loading", "busy");
    fetch("./projects.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load projects.json");
        }
        return response.json();
      })
      .then(function (config) {
        state.config = config;
        state.projects = Array.isArray(config.projects) ? config.projects : [];
        if (!els.ownerInput.value) {
          els.ownerInput.value = config.github && config.github.owner ? config.github.owner : "";
        }
        if (!els.repoInput.value) {
          els.repoInput.value = config.github && config.github.repo ? config.github.repo : "";
        }
        state.selectedAlias = state.projects.length ? state.projects[0].alias : "";
        renderProjects();
        renderDynamicFields();
        updateRepoLabel();
        updatePreview();
        setStatus("Ready", "ok");
      })
      .catch(function () {
        state.config = fallbackConfig;
        state.projects = fallbackConfig.projects;
        state.selectedAlias = state.projects[0].alias;
        renderProjects();
        renderDynamicFields();
        updateRepoLabel();
        updatePreview();
        setStatus("Using fallback", "error");
      });
  }

  function updateRepoLabel() {
    els.repoLabel.textContent = (els.ownerInput.value || "owner") + "/" + (els.repoInput.value || "repo");
    els.labelPreview.textContent = queuedLabel();
  }

  function setStatus(text, className) {
    els.statusPill.textContent = text;
    els.statusPill.className = "status-pill" + (className ? " " + className : "");
  }

  function renderProjects() {
    var query = els.projectFilter.value.trim().toLowerCase();
    var projects = state.projects.filter(function (project) {
      var haystack = [
        project.alias,
        project.name,
        project.kind,
        project.description
      ].join(" ").toLowerCase();
      return !query || haystack.indexOf(query) !== -1;
    });

    els.projectCount.textContent = String(projects.length);
    els.projectList.innerHTML = "";

    projects.forEach(function (project) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "project-button" + (project.alias === state.selectedAlias ? " active" : "");
      button.innerHTML = [
        '<div class="project-title">',
        "<strong></strong>",
        "<span></span>",
        "</div>",
        '<div class="project-desc"></div>'
      ].join("");
      button.querySelector("strong").textContent = project.name || project.alias;
      button.querySelector("span").textContent = project.kind || "Project";
      button.querySelector(".project-desc").textContent = project.description || project.alias;
      button.addEventListener("click", function () {
        state.selectedAlias = project.alias;
        renderProjects();
        updatePreview();
      });
      els.projectList.appendChild(button);
    });

    updateSelectedProjectLabel();
  }

  function updateSelectedProjectLabel() {
    var project = selectedProject();
    if (!project) {
      els.selectedProjectLabel.textContent = "No project selected";
      return;
    }
    els.selectedProjectLabel.textContent = project.alias;
  }

  function renderDynamicFields() {
    var html = "";
    if (state.mode === "general") {
      html += fieldHtml("detailsInput", "Task details", "textarea", "Describe what Codex should do in the selected project", 8);
    } else if (state.mode === "bug-summary") {
      html += fieldHtml("bugNumberInput", "Bug number", "input", "39335023");
      html += fieldHtml("detailsInput", "Summary request", "textarea", "Summarize status, assignee, severity, subject, and latest non-audit comments.", 5);
    } else if (state.mode === "bug-comment") {
      html += fieldHtml("bugNumberInput", "Bug number", "input", "39386560");
      html += fieldHtml("detailsInput", "Private BugDB comment", "textarea", "Comment text to add as a hidden/private BugDB comment.", 7);
    } else if (state.mode === "bug-create") {
      html += fieldHtml("detailsInput", "Bug description", "textarea", "Short BugDB subject/description for the new bug.", 7);
    }

    els.dynamicFields.innerHTML = html;
    Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("input, textarea"), function (element) {
      element.addEventListener("input", updatePreview);
    });
  }

  function fieldHtml(id, label, type, placeholder, rows) {
    if (type === "textarea") {
      return [
        '<label class="field">',
        "<span>" + escapeHtml(label) + "</span>",
        '<textarea id="' + id + '" rows="' + rows + '" placeholder="' + escapeHtml(placeholder) + '"></textarea>',
        "</label>"
      ].join("");
    }
    return [
      '<label class="field">',
      "<span>" + escapeHtml(label) + "</span>",
      '<input id="' + id + '" autocomplete="off" spellcheck="false" placeholder="' + escapeHtml(placeholder) + '">',
      "</label>"
    ].join("");
  }

  function selectedProject() {
    return state.projects.find(function (project) {
      return project.alias === state.selectedAlias;
    }) || null;
  }

  function selectedAliasForIssue() {
    if (state.mode === "bug-create" || state.mode === "bug-summary" || state.mode === "bug-comment") {
      return "codex-automation";
    }
    return state.selectedAlias;
  }

  function selectedContextForIssue() {
    var project = selectedProject();
    var parts = [];
    if (project && project.context) {
      parts.push(project.context);
    }
    var extra = els.contextInput.value.trim();
    if (extra) {
      parts.push(extra);
    }
    return parts.join("\n\n");
  }

  function detailsValue() {
    var details = document.getElementById("detailsInput");
    return details ? details.value.trim() : "";
  }

  function bugNumberValue() {
    var bugNumber = document.getElementById("bugNumberInput");
    return bugNumber ? bugNumber.value.trim() : "";
  }

  function queuedLabel() {
    return state.config.github && state.config.github.queuedLabel ? state.config.github.queuedLabel : "codex:queued";
  }

  function buildTitle() {
    var manual = els.titleInput.value.trim();
    if (manual) {
      return manual;
    }

    var details = detailsValue();
    var firstLine = details.split(/\r?\n/).filter(Boolean)[0] || "New task";
    firstLine = firstLine.length > 72 ? firstLine.slice(0, 69).trim() + "..." : firstLine;

    if (state.mode === "bug-summary") {
      return "Bug summary for bug " + (bugNumberValue() || "<BUG_NUMBER>");
    }
    if (state.mode === "bug-comment") {
      return "Add comment to Bug " + (bugNumberValue() || "<BUG_NUMBER>");
    }
    if (state.mode === "bug-create") {
      return "Create BugDB bug";
    }
    return "CODEX " + selectedAliasForIssue() + ": " + firstLine;
  }

  function buildTaskText() {
    var details = detailsValue();
    var bugNumber = bugNumberValue();

    if (state.mode === "bug-summary") {
      return [
        "Use the BugDB MCP tools only for BugDB access.",
        "Retrieve Bug " + bugNumber + " and provide a concise summary.",
        details || "Include subject, status, severity, assignee, last updated date, and latest non-audit comments.",
        "Do not add comments and do not edit local files."
      ].filter(Boolean).join("\n");
    }

    if (state.mode === "bug-comment") {
      return [
        "Use the BugDB MCP tools only for BugDB access.",
        "Retrieve Bug " + bugNumber + " and summarize its current subject/status.",
        "Then add this hidden/private BugDB comment to Bug " + bugNumber + ":",
        "",
        details,
        "",
        "After the BugDB comment is created, reply with the BugDB comment link if available.",
        "Do not edit local files."
      ].join("\n");
    }

    if (state.mode === "bug-create") {
      return [
        "Create a new BugDB bug using the local helper.",
        "",
        "Bug description:",
        details,
        "",
        "Reply with the created bug number, tag update result, and any error."
      ].join("\n");
    }

    return details || "Describe the task here.";
  }

  function buildIssueBody() {
    var context = selectedContextForIssue();
    var lines = [
      "Queue: " + queuedLabel(),
      "",
      "Project: " + selectedAliasForIssue(),
      ""
    ];

    if (context) {
      lines.push("Context:");
      lines.push(context);
      lines.push("");
    }

    lines.push("Task:");
    lines.push(buildTaskText());
    return lines.join("\n").trim() + "\n";
  }

  function updatePreview() {
    updateRepoLabel();
    saveLocalSettings();
    var title = buildTitle();
    var body = buildIssueBody();
    els.issuePreview.textContent = [
      "Title: " + title,
      "Label: " + queuedLabel(),
      "",
      body
    ].join("\n");
  }

  function saveLocalSettings() {
    localStorage.setItem(STORAGE_OWNER, els.ownerInput.value.trim());
    localStorage.setItem(STORAGE_REPO, els.repoInput.value.trim());
  }

  function validateForm() {
    if (!els.ownerInput.value.trim()) {
      throw new Error("Enter the GitHub owner.");
    }
    if (!els.repoInput.value.trim()) {
      throw new Error("Enter the GitHub repo.");
    }
    if (!selectedAliasForIssue()) {
      throw new Error("Select a project.");
    }
    if ((state.mode === "bug-summary" || state.mode === "bug-comment") && !bugNumberValue()) {
      throw new Error("Enter the BugDB bug number.");
    }
    if (!detailsValue() && state.mode !== "bug-summary") {
      throw new Error("Enter task details.");
    }
  }

  function createIssue() {
    var owner;
    var repo;
    var title;
    var body;

    try {
      validateForm();
      owner = els.ownerInput.value.trim();
      repo = els.repoInput.value.trim();
      title = buildTitle();
      body = buildIssueBody();
    } catch (error) {
      showResult(error.message, true);
      setStatus("Needs input", "error");
      return;
    }

    setStatus("Opened", "ok");
    showResult("GitHub will open with the issue prefilled. Submit it there and confirm the " + escapeHtml(queuedLabel()) + " label is selected.", false);
    window.location.href = buildNewIssueUrl(owner, repo, title, body);
  }

  function buildNewIssueUrl(owner, repo, title, body) {
    var params = new URLSearchParams();
    params.set("title", title);
    params.set("body", body);
    params.set("labels", queuedLabel());
    params.append("labels[]", queuedLabel());
    return "https://github.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/issues/new?" + params.toString();
  }

  function showResult(html, isError) {
    els.resultRow.hidden = false;
    els.resultRow.innerHTML = html;
    els.resultRow.style.borderColor = isError ? "#d6a1a1" : "";
    els.resultRow.style.color = isError ? "#a33131" : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
