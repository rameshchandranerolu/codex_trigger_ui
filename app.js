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
    workflows: [
      {
        id: "project",
        name: "Project Work",
        kind: "Local Project",
        description: "Inspect, fix, or test a configured local ALM checkout.",
        requiresProject: true,
        operations: [
          {
            id: "custom",
            name: "Custom Project Task",
            fields: ["details"],
            requiredFields: ["details"]
          }
        ]
      }
    ],
    projects: [
      {
        alias: "codex-automation",
        name: "Codex Automation",
        kind: "Automation",
        description: "Runner and UI automation.",
        context: "Use the codex_automation repository."
      }
    ]
  };

  var fieldSpecs = {
    bugNumber: {
      id: "bugNumberInput",
      label: "Bug number",
      placeholder: "39335023",
      taskLabel: "Bug number"
    },
    bugDescription: {
      id: "bugDescriptionInput",
      label: "Bug description",
      type: "textarea",
      rows: 6,
      placeholder: "Short BugDB subject/description",
      taskLabel: "Bug description"
    },
    bugComment: {
      id: "bugCommentInput",
      label: "Private BugDB comment",
      type: "textarea",
      rows: 7,
      placeholder: "Comment text to add as a hidden/private BugDB comment",
      taskLabel: "Private BugDB comment"
    },
    adeView: {
      id: "adeViewInput",
      label: "ADE view name",
      placeholder: "my_view_name",
      taskLabel: "ADE view name"
    },
    adeBranch: {
      id: "adeBranchInput",
      label: "ADE branch",
      placeholder: "Optional branch name",
      taskLabel: "ADE branch"
    },
    adeTxn: {
      id: "adeTxnInput",
      label: "Transaction name",
      placeholder: "Optional transaction name",
      taskLabel: "Transaction name"
    },
    module: {
      id: "moduleInput",
      label: "Product/module boundary",
      placeholder: "Optional: HCM, SCM, Procurement, fusionapps/hcm/...",
      taskLabel: "Product/module boundary"
    },
    details: {
      id: "detailsInput",
      label: "Additional inputs",
      type: "textarea",
      rows: 8,
      placeholder: "Add any details, expected output, files, checks, or constraints",
      taskLabel: "Additional inputs"
    }
  };

  var state = {
    config: fallbackConfig,
    workflows: [],
    projects: [],
    selectedWorkflowId: "",
    selectedOperationId: "",
    selectedProjectAlias: ""
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
    els.projectFilter.addEventListener("input", renderWorkflows);

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
        state.workflows = Array.isArray(config.workflows) ? config.workflows : [];
        state.projects = Array.isArray(config.projects) ? config.projects : [];
        if (!state.workflows.length) {
          throw new Error("projects.json must define workflows");
        }
        if (!els.ownerInput.value) {
          els.ownerInput.value = config.github && config.github.owner ? config.github.owner : "";
        }
        if (!els.repoInput.value) {
          els.repoInput.value = config.github && config.github.repo ? config.github.repo : "";
        }
        selectWorkflow(state.workflows[0].id);
        renderWorkflows();
        updateRepoLabel();
        updatePreview();
        setStatus("Ready", "ok");
      })
      .catch(function () {
        state.config = fallbackConfig;
        state.workflows = fallbackConfig.workflows;
        state.projects = fallbackConfig.projects;
        selectWorkflow(state.workflows[0].id);
        renderWorkflows();
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

  function renderWorkflows() {
    var query = els.projectFilter.value.trim().toLowerCase();
    var workflows = state.workflows.filter(function (workflow) {
      var haystack = [
        workflow.id,
        workflow.name,
        workflow.kind,
        workflow.description
      ].join(" ").toLowerCase();
      return !query || haystack.indexOf(query) !== -1;
    });

    els.projectCount.textContent = String(workflows.length);
    els.projectList.innerHTML = "";

    workflows.forEach(function (workflow) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "project-button" + (workflow.id === state.selectedWorkflowId ? " active" : "");
      button.innerHTML = [
        '<div class="project-title">',
        "<strong></strong>",
        "<span></span>",
        "</div>",
        '<div class="project-desc"></div>'
      ].join("");
      button.querySelector("strong").textContent = workflow.name || workflow.id;
      button.querySelector("span").textContent = workflow.kind || "Workflow";
      button.querySelector(".project-desc").textContent = workflow.description || workflow.id;
      button.addEventListener("click", function () {
        selectWorkflow(workflow.id);
        renderWorkflows();
        updatePreview();
      });
      els.projectList.appendChild(button);
    });

    updateSelectedWorkflowLabel();
  }

  function selectWorkflow(workflowId) {
    state.selectedWorkflowId = workflowId;
    var operation = firstOperation(selectedWorkflow());
    state.selectedOperationId = operation ? operation.id : "";
    if (!state.selectedProjectAlias && state.projects.length) {
      state.selectedProjectAlias = state.projects[0].alias;
    }
    renderDynamicFields();
  }

  function updateSelectedWorkflowLabel() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    if (!workflow) {
      els.selectedProjectLabel.textContent = "No workflow selected";
      return;
    }
    els.selectedProjectLabel.textContent = operation ? workflow.id + " / " + operation.id : workflow.id;
  }

  function renderDynamicFields() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var html = "";

    if (!workflow) {
      els.dynamicFields.innerHTML = "";
      return;
    }

    html += operationSelectHtml(workflow);
    if (workflow.requiresProject) {
      html += projectSelectHtml();
    }

    (operationFields(operation) || ["details"]).forEach(function (fieldName) {
      html += fieldHtml(fieldName);
    });

    els.dynamicFields.innerHTML = html;

    var operationInput = document.getElementById("operationInput");
    if (operationInput) {
      operationInput.addEventListener("change", function () {
        state.selectedOperationId = operationInput.value;
        renderDynamicFields();
        updatePreview();
      });
    }

    var projectInput = document.getElementById("projectInput");
    if (projectInput) {
      projectInput.addEventListener("change", function () {
        state.selectedProjectAlias = projectInput.value;
        updateSelectedWorkflowLabel();
        updatePreview();
      });
    }

    Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("input, textarea"), function (element) {
      element.addEventListener("input", updatePreview);
      element.addEventListener("change", updatePreview);
    });
    updateSelectedWorkflowLabel();
  }

  function operationSelectHtml(workflow) {
    var operations = workflowOperations(workflow);
    if (!operations.length) {
      return "";
    }
    return [
      '<label class="field">',
      "<span>Operation</span>",
      '<select id="operationInput">',
      operations.map(function (operation) {
        var selected = operation.id === state.selectedOperationId ? " selected" : "";
        return '<option value="' + escapeHtml(operation.id) + '"' + selected + ">" + escapeHtml(operation.name || operation.id) + "</option>";
      }).join(""),
      "</select>",
      "</label>"
    ].join("");
  }

  function projectSelectHtml() {
    return [
      '<label class="field">',
      "<span>Project</span>",
      '<select id="projectInput">',
      state.projects.map(function (project) {
        var selected = project.alias === state.selectedProjectAlias ? " selected" : "";
        return '<option value="' + escapeHtml(project.alias) + '"' + selected + ">" + escapeHtml(project.name || project.alias) + "</option>";
      }).join(""),
      "</select>",
      "</label>"
    ].join("");
  }

  function fieldHtml(fieldName) {
    var spec = fieldSpecs[fieldName] || {
      id: fieldName + "Input",
      label: fieldName,
      placeholder: ""
    };
    if (spec.type === "textarea") {
      return [
        '<label class="field">',
        "<span>" + escapeHtml(spec.label) + "</span>",
        '<textarea id="' + spec.id + '" rows="' + (spec.rows || 6) + '" placeholder="' + escapeHtml(spec.placeholder || "") + '"></textarea>',
        "</label>"
      ].join("");
    }
    return [
      '<label class="field">',
      "<span>" + escapeHtml(spec.label) + "</span>",
      '<input id="' + spec.id + '" autocomplete="off" spellcheck="false" placeholder="' + escapeHtml(spec.placeholder || "") + '">',
      "</label>"
    ].join("");
  }

  function selectedWorkflow() {
    return state.workflows.find(function (workflow) {
      return workflow.id === state.selectedWorkflowId;
    }) || null;
  }

  function selectedOperation() {
    var workflow = selectedWorkflow();
    return workflowOperations(workflow).find(function (operation) {
      return operation.id === state.selectedOperationId;
    }) || firstOperation(workflow);
  }

  function selectedProject() {
    return state.projects.find(function (project) {
      return project.alias === state.selectedProjectAlias;
    }) || null;
  }

  function workflowOperations(workflow) {
    return workflow && Array.isArray(workflow.operations) ? workflow.operations : [];
  }

  function firstOperation(workflow) {
    var operations = workflowOperations(workflow);
    return operations.length ? operations[0] : null;
  }

  function operationFields(operation) {
    return operation && Array.isArray(operation.fields) ? operation.fields : ["details"];
  }

  function queuedLabel() {
    return state.config.github && state.config.github.queuedLabel ? state.config.github.queuedLabel : "codex:queued";
  }

  function inputValue(fieldName) {
    var spec = fieldSpecs[fieldName];
    var id = spec ? spec.id : fieldName + "Input";
    var element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function buildTitle() {
    var manual = els.titleInput.value.trim();
    if (manual) {
      return manual;
    }

    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var primary = "";
    if (operation && operation.titleField) {
      primary = inputValue(operation.titleField);
    }
    if (!primary && workflow && workflow.requiresProject) {
      primary = state.selectedProjectAlias;
    }
    if (!primary) {
      primary = inputValue("bugNumber") || inputValue("adeView") || firstLine(inputValue("details")) || "new task";
    }
    primary = primary.length > 72 ? primary.slice(0, 69).trim() + "..." : primary;

    return [
      workflow && workflow.name ? workflow.name : "Workflow",
      operation && operation.name ? operation.name : "Task",
      primary
    ].join(": ");
  }

  function buildTaskText() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var fields = operationFields(operation);
    var lines = [];

    if (operation && operation.description) {
      lines.push(operation.description);
      lines.push("");
    }

    fields.forEach(function (fieldName) {
      if (fieldName === "details") {
        return;
      }
      var value = inputValue(fieldName);
      if (value) {
        lines.push((fieldSpecs[fieldName] && fieldSpecs[fieldName].taskLabel ? fieldSpecs[fieldName].taskLabel : fieldName) + ": " + value);
      }
    });

    if (fields.indexOf("details") !== -1) {
      lines.push("");
      lines.push("Additional inputs:");
      lines.push(inputValue("details") || "(none)");
    }

    if (workflow && Array.isArray(workflow.requirements) && workflow.requirements.length) {
      lines.push("");
      lines.push("Workflow requirements:");
      workflow.requirements.forEach(function (requirement) {
        lines.push("- " + requirement);
      });
    }

    return lines.join("\n").trim() + "\n";
  }

  function selectedContextForIssue() {
    var workflow = selectedWorkflow();
    var project = selectedProject();
    var parts = [];

    if (workflow && workflow.context) {
      parts.push(workflow.context);
    }
    if (workflow && workflow.requiresProject && project && project.context) {
      parts.push(project.context);
    }
    if (els.contextInput.value.trim()) {
      parts.push(els.contextInput.value.trim());
    }

    return parts.join("\n\n");
  }

  function buildIssueBody() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var context = selectedContextForIssue();
    var lines = [
      "Queue: " + queuedLabel(),
      "",
      "Workflow: " + (workflow ? workflow.id : ""),
      "Operation: " + (operation ? operation.id : "")
    ];

    if (workflow && workflow.requiresProject) {
      lines.push("Project: " + state.selectedProjectAlias);
    }

    lines.push("");

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
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var requiredFields = operation && Array.isArray(operation.requiredFields) ? operation.requiredFields : [];

    if (!els.ownerInput.value.trim()) {
      throw new Error("Enter the GitHub owner.");
    }
    if (!els.repoInput.value.trim()) {
      throw new Error("Enter the GitHub repo.");
    }
    if (!workflow) {
      throw new Error("Select a workflow.");
    }
    if (!operation) {
      throw new Error("Select an operation.");
    }
    if (workflow.requiresProject && !state.selectedProjectAlias) {
      throw new Error("Select a project.");
    }

    requiredFields.forEach(function (fieldName) {
      if (!inputValue(fieldName)) {
        throw new Error("Enter " + (fieldSpecs[fieldName] ? fieldSpecs[fieldName].label : fieldName) + ".");
      }
    });
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
    showResult("GitHub will open with the issue prefilled. Submit it there.", false);
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

  function firstLine(value) {
    return String(value || "").split(/\r?\n/).filter(Boolean)[0] || "";
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
