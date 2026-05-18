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

  var adeOperationLabels = {
    "create-view": "Create View",
    "enter-view": "Enter Existing View",
    "view-status": "Check View Status",
    "create-transaction": "Create Transaction",
    "refresh-view": "Refresh View",
    "checkin-save": "Check In And Save",
    "ora-review": "Create OraReview",
    "merge-request": "Submit Merge Request",
    "cleanup-view": "Cleanup View",
    "custom": "Custom ADE Task"
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
      if (button.getAttribute("data-mode") === "ade-operation" && projectByAlias("ade")) {
        state.selectedAlias = "ade";
      }
      setMode(button.getAttribute("data-mode"));
      renderProjects();
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
        if (project.alias === "ade") {
          setMode("ade-operation");
        } else if (state.mode === "ade-operation") {
          setMode("general");
        }
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
    } else if (state.mode === "ade-operation") {
      html += adeOperationFieldsHtml();
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
    Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("input, select, textarea"), function (element) {
      element.addEventListener("input", updatePreview);
      element.addEventListener("change", updatePreview);
    });
  }

  function setMode(mode) {
    state.mode = mode;
    Array.prototype.forEach.call(els.modeGrid.querySelectorAll(".mode-button"), function (item) {
      item.classList.toggle("active", item.getAttribute("data-mode") === mode);
    });
    renderDynamicFields();
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

  function adeOperationFieldsHtml() {
    return [
      '<label class="field">',
      "<span>ADE operation</span>",
      '<select id="adeOperationInput">',
      optionHtml("create-view", "Create View"),
      optionHtml("enter-view", "Enter Existing View"),
      optionHtml("view-status", "Check View Status"),
      optionHtml("create-transaction", "Create Transaction"),
      optionHtml("refresh-view", "Refresh View"),
      optionHtml("checkin-save", "Check In And Save"),
      optionHtml("ora-review", "Create OraReview"),
      optionHtml("merge-request", "Submit Merge Request"),
      optionHtml("cleanup-view", "Cleanup View"),
      optionHtml("custom", "Custom ADE Task"),
      "</select>",
      "</label>",
      '<div class="form-grid">',
      fieldHtml("adeViewInput", "ADE view name", "input", "my_view_name"),
      fieldHtml("adeBranchInput", "ADE branch", "input", "Optional branch name"),
      "</div>",
      '<div class="form-grid">',
      fieldHtml("adeTxnInput", "Transaction name", "input", "Optional transaction name"),
      fieldHtml("bugNumberInput", "Bug number", "input", "Optional BugDB bug number"),
      "</div>",
      fieldHtml("moduleInput", "Product/module boundary", "input", "Optional: HCM, SCM, Procurement, fusionapps/hcm/..."),
      fieldHtml("detailsInput", "Additional inputs", "textarea", "Any extra ADE command intent, files, validation, OraReview, merge, or cleanup notes", 7)
    ].join("");
  }

  function optionHtml(value, label) {
    return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + "</option>";
  }

  function selectedProject() {
    return projectByAlias(state.selectedAlias);
  }

  function projectByAlias(alias) {
    return state.projects.find(function (project) {
      return project.alias === alias;
    }) || null;
  }

  function selectedAliasForIssue() {
    if (state.mode === "ade-operation") {
      return "ade";
    }
    if (state.mode === "bug-create" || state.mode === "bug-summary" || state.mode === "bug-comment") {
      return "codex-automation";
    }
    return state.selectedAlias;
  }

  function selectedContextForIssue() {
    var project = selectedProject();
    var parts = [];
    if (state.mode === "ade-operation") {
      project = projectByAlias("ade") || project;
    }
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

  function inputValue(id) {
    var element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function adeOperationValue() {
    return inputValue("adeOperationInput") || "create-view";
  }

  function adeOperationLabel() {
    return adeOperationLabels[adeOperationValue()] || "ADE Operation";
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
    if (state.mode === "ade-operation") {
      var view = inputValue("adeViewInput");
      var suffix = view || details.split(/\r?\n/).filter(Boolean)[0] || "ADE task";
      suffix = suffix.length > 72 ? suffix.slice(0, 69).trim() + "..." : suffix;
      return "ADE " + adeOperationLabel() + ": " + suffix;
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

    if (state.mode === "ade-operation") {
      return buildAdeTaskText();
    }

    return details || "Describe the task here.";
  }

  function buildAdeTaskText() {
    var parts = [
      "Use the ade-lens skill for this ADE workflow.",
      "ADE operation: " + adeOperationLabel()
    ];
    addIfPresent(parts, "ADE view name", inputValue("adeViewInput"));
    addIfPresent(parts, "ADE branch", inputValue("adeBranchInput"));
    addIfPresent(parts, "Transaction name", inputValue("adeTxnInput"));
    addIfPresent(parts, "Bug number", bugNumberValue());
    addIfPresent(parts, "Product/module boundary", inputValue("moduleInput"));
    parts.push("");
    parts.push("Additional inputs:");
    parts.push(detailsValue() || "(none)");
    parts.push("");
    parts.push("ADE Lens requirements:");
    parts.push("- Bind the work to exactly one ADE view.");
    parts.push("- If the view must be created or entered, do that before any source inspection or edits.");
    parts.push("- Keep any edits inside the active ADE view and use ADE checkout/status commands as the source of truth.");
    parts.push("- Do not edit source files unless the additional inputs explicitly request source changes.");
    parts.push("- Reply with active view name, active transaction, command outcomes, and the next recommended step.");
    return parts.join("\n");
  }

  function addIfPresent(parts, label, value) {
    if (value) {
      parts.push(label + ": " + value);
    }
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
    if (state.mode === "ade-operation" && !inputValue("adeViewInput") && adeOperationValue() !== "custom") {
      throw new Error("Enter the ADE view name, or use Custom ADE Task for a broader request.");
    }
    if (state.mode === "ade-operation" && adeOperationValue() === "custom" && !detailsValue()) {
      throw new Error("Enter the custom ADE task details.");
    }
    if (!detailsValue() && state.mode !== "bug-summary" && state.mode !== "ade-operation") {
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
