(function () {
  "use strict";

  var STORAGE_OWNER = "codexTrigger.owner";
  var STORAGE_REPO = "codexTrigger.repo";
  var STORAGE_RUNNER = "codexTrigger.runner";
  var defaultProfileSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/HcmEmploymentCore/ProfileOptionSD.xml";
  var defaultMessageSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/MessageSD.xml";
  var defaultLookupSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/CommonLookupTypeSD.xml";

  var fallbackConfig = {
    github: {
      owner: "rameshchandranerolu",
      repo: "codex_automation",
      queuedLabel: "codex:queued",
      runners: [
        {
          id: "current",
          name: "Current VM",
          owner: "rameshchandranerolu",
          repo: "codex_automation"
        },
        {
          id: "mumbai619658",
          name: "Mumbai 619658",
          owner: "rameshchandranerolu",
          repo: "codex_automation_mumbai619658"
        }
      ]
    },
    workflows: [
      {
        id: "project",
        name: "Project Work",
        kind: "Local Project",
        description: "Inspect, fix, or test a configured local ALM checkout.",
        requiresProject: true,
        projectAliases: ["codex-automation"],
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
    ],
    commands: []
  };

  var fieldSpecs = {
    bugNumber: {
      id: "bugNumberInput",
      label: "Bug number",
      placeholder: "39335023",
      taskLabel: "Bug number"
    },
    backportType: {
      id: "backportTypeInput",
      label: "Backport type",
      type: "select",
      options: ["VB", "ADE"],
      taskLabel: "Backport type"
    },
    baseBugNumber: {
      id: "baseBugNumberInput",
      label: "Base bug number",
      placeholder: "39335023",
      taskLabel: "Base bug number"
    },
    releaseYear: {
      id: "releaseYearInput",
      label: "Release year",
      type: "select",
      options: ["26", "27", "28", "29", "30"],
      taskLabel: "Release year"
    },
    releaseMonth: {
      id: "releaseMonthInput",
      label: "Release month",
      type: "select",
      options: ["01", "04", "07", "10"],
      taskLabel: "Release month"
    },
    seedDataType: {
      id: "seedDataTypeInput",
      label: "Seed Data Type",
      type: "select",
      options: ["Profile Option", "Message", "Lookup"],
      taskLabel: "Seed Data Type"
    },
    seedTarget: {
      id: "seedTargetInput",
      label: "Target codeline",
      type: "select",
      options: ["Bronze", "Silver", "Release"],
      taskLabel: "Target codeline"
    },
    seedReleaseYear: {
      id: "seedReleaseYearInput",
      label: "Release year",
      type: "select",
      options: ["26", "27", "28", "29", "30"],
      taskLabel: "Release year",
      conditional: "seedRelease"
    },
    seedReleaseMonth: {
      id: "seedReleaseMonthInput",
      label: "Release month",
      type: "select",
      options: ["01", "04", "07", "10"],
      taskLabel: "Release month",
      conditional: "seedRelease"
    },
    seedFilePath: {
      id: "seedFilePathInput",
      label: "Seed file path",
      placeholder: "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/HcmEmploymentCore/ProfileOptionSD.xml",
      taskLabel: "Seed file path"
    },
    seedLba: {
      id: "seedLbaInput",
      label: "LBA",
      placeholder: "HcmEmploymentTop",
      defaultValue: "HcmEmploymentTop",
      taskLabel: "LBA"
    },
    bugDescription: {
      id: "bugDescriptionInput",
      label: "Bug description",
      type: "textarea",
      rows: 6,
      placeholder: "Short BugDB subject/description",
      taskLabel: "Bug description"
    },
    profileOptionCode: {
      id: "profileOptionCodeInput",
      label: "Profile option code",
      placeholder: "ORA_PER_EMPL_CLE_DASHBOARD_REDWOOD_ENABLED",
      taskLabel: "Profile option code",
      conditional: "profileOption"
    },
    profileOptionName: {
      id: "profileOptionNameInput",
      label: "Profile option name",
      placeholder: "Enable Redwood Change Legal Employer Dashboard",
      taskLabel: "Profile option name",
      conditional: "profileOption"
    },
    profileOptionDescription: {
      id: "profileOptionDescriptionInput",
      label: "Profile option description",
      type: "textarea",
      rows: 4,
      placeholder: "Enable the Redwood Change Legal Employer Dashboard.",
      taskLabel: "Profile option description",
      conditional: "profileOption"
    },
    profileOptionValue: {
      id: "profileOptionValueInput",
      label: "SITE profile option value",
      placeholder: "N",
      taskLabel: "SITE profile option value",
      conditional: "profileOption"
    },
    profileSiteEnabled: {
      id: "profileSiteEnabledInput",
      label: "Site enabled",
      type: "select",
      options: ["Y", "N"],
      taskLabel: "Site enabled",
      conditional: "profileOption"
    },
    profileSiteUpdatable: {
      id: "profileSiteUpdatableInput",
      label: "Site updatable",
      type: "select",
      options: ["Y", "N"],
      taskLabel: "Site updatable",
      conditional: "profileOption"
    },
    profileUserEnabled: {
      id: "profileUserEnabledInput",
      label: "User enabled",
      type: "select",
      options: ["N", "Y"],
      taskLabel: "User enabled",
      conditional: "profileOption"
    },
    profileUserUpdatable: {
      id: "profileUserUpdatableInput",
      label: "User updatable",
      type: "select",
      options: ["N", "Y"],
      taskLabel: "User updatable",
      conditional: "profileOption"
    },
    profileOptionUserValue: {
      id: "profileOptionUserValueInput",
      label: "USER profile option value",
      placeholder: "N",
      taskLabel: "USER profile option value",
      conditional: "profileOptionUserValue"
    },
    profileValidationSql: {
      id: "profileValidationSqlInput",
      label: "SQL validation",
      type: "textarea",
      rows: 5,
      placeholder: "SELECT meaning, lookup_code FROM hcm_lookups WHERE lookup_type='YES_NO' ORDER BY MEANING",
      taskLabel: "SQL validation",
      conditional: "profileOption"
    },
    messageSql: {
      id: "messageSqlInput",
      label: "Message SQL",
      type: "textarea",
      rows: 8,
      placeholder: "-- Example values from MessageSD.xml: MessageName=PER_ACTION_DUP_REASON; MessageType=ERROR; MessageText=You can't associate the same action reason twice with an action.",
      taskLabel: "Message SQL",
      conditional: "message"
    },
    lookupType: {
      id: "lookupTypeInput",
      label: "Lookup type",
      placeholder: "BUDGET_MEASUREMENT_TYPE",
      taskLabel: "Lookup type",
      conditional: "lookup"
    },
    lookupMeaning: {
      id: "lookupMeaningInput",
      label: "Lookup meaning",
      placeholder: "Work Measures Unit Type",
      taskLabel: "Lookup meaning",
      conditional: "lookup"
    },
    lookupDescription: {
      id: "lookupDescriptionInput",
      label: "Lookup description",
      type: "textarea",
      rows: 4,
      placeholder: "Budget measurement types such as headcount or full time equivalent.",
      taskLabel: "Lookup description",
      conditional: "lookup"
    },
    lookupValues: {
      id: "lookupValuesInput",
      label: "Lookup values",
      type: "textarea",
      rows: 8,
      placeholder: "JAN - January\nFEB - February\nMAR - March",
      taskLabel: "Lookup values",
      conditional: "lookup"
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
    },
    instructions: {
      id: "instructionsInput",
      label: "Instructions",
      type: "textarea",
      rows: 12,
      placeholder: "Describe the VB bug request in plain English. Include bug number, base branch, important files, whether it is a regression, and what Codex should analyze or prepare.",
      taskLabel: "Instructions"
    }
  };

  var state = {
    config: fallbackConfig,
    workflows: [],
    projects: [],
    commands: [],
    runners: [],
    selectedCommands: [],
    commandSerial: 0,
    selectedWorkflowId: "",
    selectedOperationId: "",
    selectedProjectAlias: "",
    selectedRunnerId: ""
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
      "runnerSelect",
      "ownerInput",
      "repoInput",
      "dynamicFields",
      "commandBuilder",
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
    if (els.runnerSelect) {
      els.runnerSelect.addEventListener("change", function () {
        state.selectedRunnerId = els.runnerSelect.value;
        applySelectedRunner(true);
        updatePreview();
      });
    }

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
    state.selectedRunnerId = localStorage.getItem(STORAGE_RUNNER) || "";
    els.ownerInput.value = localStorage.getItem(STORAGE_OWNER) || "";
    els.repoInput.value = localStorage.getItem(STORAGE_REPO) || "";
  }

  function loadConfig() {
    setStatus("Loading", "busy");
    Promise.all([
      fetch("./projects.json", { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load projects.json");
        }
        return response.json();
      }),
      fetch("./commands.json", { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          return { commands: [] };
        }
        return response.json();
      }).catch(function () {
        return { commands: [] };
      })
    ])
      .then(function (response) {
        var config = response[0];
        var commandConfig = response[1] || {};
        state.config = config;
        state.workflows = Array.isArray(config.workflows) ? config.workflows : [];
        state.projects = Array.isArray(config.projects) ? config.projects : [];
        state.commands = Array.isArray(commandConfig.commands) ? commandConfig.commands : [];
        state.runners = githubRunners(config);
        if (!runnerById(state.selectedRunnerId)) {
          state.selectedRunnerId = state.runners.length ? state.runners[0].id : "";
        }
        renderRunnerSelect();
        applySelectedRunner(false);
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
        state.commands = fallbackConfig.commands;
        state.runners = githubRunners(fallbackConfig);
        if (!runnerById(state.selectedRunnerId)) {
          state.selectedRunnerId = state.runners.length ? state.runners[0].id : "";
        }
        renderRunnerSelect();
        applySelectedRunner(false);
        state.selectedCommands = [];
        selectWorkflow(state.workflows[0].id);
        renderWorkflows();
        updateRepoLabel();
        updatePreview();
        setStatus("Using fallback", "error");
      });
  }

  function updateRepoLabel() {
    var runner = selectedRunner();
    var repoText = (els.ownerInput.value || "owner") + "/" + (els.repoInput.value || "repo");
    els.repoLabel.textContent = runner && runner.name ? runner.name + " - " + repoText : repoText;
    els.labelPreview.textContent = queuedLabel();
  }

  function githubRunners(config) {
    var github = config && config.github ? config.github : {};
    var runners = Array.isArray(github.runners) ? github.runners : [];
    if (!runners.length) {
      runners = [{
        id: "default",
        name: "Default runner",
        owner: github.owner || "",
        repo: github.repo || ""
      }];
    }
    return runners.map(function (runner, index) {
      return {
        id: String(runner.id || "runner" + (index + 1)),
        name: String(runner.name || runner.id || "Runner " + (index + 1)),
        owner: String(runner.owner || github.owner || ""),
        repo: String(runner.repo || github.repo || ""),
        description: String(runner.description || "")
      };
    });
  }

  function renderRunnerSelect() {
    if (!els.runnerSelect) {
      return;
    }
    els.runnerSelect.innerHTML = state.runners.map(function (runner) {
      var selected = runner.id === state.selectedRunnerId ? " selected" : "";
      return '<option value="' + escapeHtml(runner.id) + '"' + selected + ">" + escapeHtml(runner.name) + "</option>";
    }).join("");
    els.runnerSelect.value = state.selectedRunnerId;
  }

  function selectedRunner() {
    return runnerById(state.selectedRunnerId) || (state.runners.length ? state.runners[0] : null);
  }

  function runnerById(runnerId) {
    return state.runners.find(function (runner) {
      return runner.id === runnerId;
    }) || null;
  }

  function applySelectedRunner(force) {
    var runner = selectedRunner();
    if (!runner) {
      return;
    }
    if (force || !els.ownerInput.value.trim()) {
      els.ownerInput.value = runner.owner;
    }
    if (force || !els.repoInput.value.trim()) {
      els.repoInput.value = runner.repo;
    }
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
    if (state.selectedWorkflowId !== workflowId) {
      state.selectedCommands = [];
    }
    state.selectedWorkflowId = workflowId;
    var operation = firstOperation(selectedWorkflow());
    state.selectedOperationId = operation ? operation.id : "";
    ensureSelectedProjectForWorkflow();
    renderDynamicFields();
    renderCommandBuilder();
  }

  function ensureSelectedProjectForWorkflow() {
    var projects = projectOptionsForWorkflow();
    if (!projects.length) {
      state.selectedProjectAlias = "";
      return;
    }
    var hasSelected = projects.some(function (project) {
      return project.alias === state.selectedProjectAlias;
    });
    if (!hasSelected) {
      state.selectedProjectAlias = projects[0].alias;
    }
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

    if (workflowHasOperations(workflow)) {
      html += operationSelectHtml(workflow);
    }
    if (workflow.requiresProject) {
      html += projectSelectHtml();
    }

    workflowFields(workflow, operation).forEach(function (fieldName) {
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

    Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("input, select, textarea"), function (element) {
      element.addEventListener("input", updatePreview);
      element.addEventListener("change", function () {
        refreshSeedDataFields();
        updatePreview();
      });
    });
    refreshSeedDataFields();
    updateSelectedWorkflowLabel();
    renderCommandBuilder();
  }

  function seedFileDefaultForType(type) {
    if (type === "Message") {
      return defaultMessageSeedFile;
    }
    if (type === "Lookup") {
      return defaultLookupSeedFile;
    }
    return defaultProfileSeedFile;
  }

  function isDefaultSeedFile(value) {
    return value === defaultProfileSeedFile || value === defaultMessageSeedFile || value === defaultLookupSeedFile;
  }

  function refreshSeedDataFields() {
    var workflow = selectedWorkflow();
    if (!workflow || workflow.id !== "seeddata") {
      return;
    }
    var typeInput = document.getElementById("seedDataTypeInput");
    var targetInput = document.getElementById("seedTargetInput");
    var seedFileInput = document.getElementById("seedFilePathInput");
    var type = typeInput ? typeInput.value : "Profile Option";
    var target = targetInput ? targetInput.value : "Bronze";
    var userEnabledInput = document.getElementById("profileUserEnabledInput");
    var userEnabled = userEnabledInput ? userEnabledInput.value : "N";
    if (seedFileInput && (!seedFileInput.value.trim() || isDefaultSeedFile(seedFileInput.value.trim()))) {
      seedFileInput.value = seedFileDefaultForType(type);
    }
    Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("[data-conditional]"), function (field) {
      var conditional = field.getAttribute("data-conditional");
      var show = true;
      if (conditional === "profileOption") {
        show = type === "Profile Option";
      } else if (conditional === "profileOptionUserValue") {
        show = type === "Profile Option" && userEnabled === "Y";
      } else if (conditional === "message") {
        show = type === "Message";
      } else if (conditional === "lookup") {
        show = type === "Lookup";
      } else if (conditional === "seedRelease") {
        show = target === "Release";
      }
      field.hidden = !show;
      field.style.display = show ? "" : "none";
    });
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
    var projects = projectOptionsForWorkflow();
    return [
      '<label class="field">',
      "<span>Project</span>",
      '<select id="projectInput">',
      projects.map(function (project) {
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
    var conditional = spec.conditional ? ' data-conditional="' + escapeHtml(spec.conditional) + '"' : "";
    var fieldAttrs = ' data-field-name="' + escapeHtml(fieldName) + '"' + conditional;
    if (spec.type === "select") {
      return [
        '<label class="field"' + fieldAttrs + '>',
        "<span>" + escapeHtml(spec.label) + "</span>",
        '<select id="' + spec.id + '">',
        (spec.options || []).map(function (option) {
          return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + "</option>";
        }).join(""),
        "</select>",
        "</label>"
      ].join("");
    }
    if (spec.type === "textarea") {
      return [
        '<label class="field"' + fieldAttrs + '>',
        "<span>" + escapeHtml(spec.label) + "</span>",
        '<textarea id="' + spec.id + '" rows="' + (spec.rows || 6) + '" placeholder="' + escapeHtml(spec.placeholder || "") + '"></textarea>',
        "</label>"
      ].join("");
    }
    return [
      '<label class="field"' + fieldAttrs + '>',
      "<span>" + escapeHtml(spec.label) + "</span>",
      '<input id="' + spec.id + '" autocomplete="off" spellcheck="false" placeholder="' + escapeHtml(spec.placeholder || "") + '" value="' + escapeHtml(spec.defaultValue || "") + '">',
      "</label>"
    ].join("");
  }

  function renderCommandBuilder() {
    var workflow = selectedWorkflow();
    var commands = commandsForWorkflow(workflow ? workflow.id : "");
    if (!els.commandBuilder || !commands.length) {
      if (els.commandBuilder) {
        els.commandBuilder.innerHTML = "";
      }
      return;
    }

    var selectedId = commands[0].id;
    var html = [
      '<section class="command-panel" aria-label="Command sequence">',
      '<div class="command-panel-head">',
      "<h3>Commands</h3>",
      '<div class="command-adder">',
      '<select id="commandSelect">',
      commands.map(function (command) {
        return '<option value="' + escapeHtml(command.id) + '">' + escapeHtml(command.label || command.id) + "</option>";
      }).join(""),
      "</select>",
      '<button id="addCommandButton" class="secondary-button" type="button">Add</button>',
      "</div>",
      "</div>",
      '<div class="command-list">'
    ];

    if (!state.selectedCommands.length) {
      html.push('<div class="empty-command-row">No commands selected</div>');
    }

    state.selectedCommands.forEach(function (entry, index) {
      var spec = commandSpec(entry.id);
      if (!spec) {
        return;
      }
      html.push(commandCardHtml(entry, spec, index));
    });

    html.push("</div></section>");
    els.commandBuilder.innerHTML = html.join("");

    var commandSelect = document.getElementById("commandSelect");
    if (commandSelect) {
      commandSelect.value = selectedId;
    }
    var addButton = document.getElementById("addCommandButton");
    if (addButton) {
      addButton.addEventListener("click", function () {
        addSelectedCommand(commandSelect ? commandSelect.value : selectedId);
      });
    }

    Array.prototype.forEach.call(els.commandBuilder.querySelectorAll("[data-remove-command]"), function (button) {
      button.addEventListener("click", function () {
        removeCommand(button.getAttribute("data-remove-command"));
      });
    });
    Array.prototype.forEach.call(els.commandBuilder.querySelectorAll("[data-command-param]"), function (element) {
      element.addEventListener("input", function () {
        updateCommandParam(
          element.getAttribute("data-command-uid"),
          element.getAttribute("data-command-param"),
          element.value
        );
      });
      element.addEventListener("change", function () {
        updateCommandParam(
          element.getAttribute("data-command-uid"),
          element.getAttribute("data-command-param"),
          element.value
        );
      });
    });
  }

  function commandCardHtml(entry, spec, index) {
    var params = Array.isArray(spec.parameters) ? spec.parameters : [];
    var html = [
      '<article class="command-card">',
      '<div class="command-card-head">',
      "<strong>" + (index + 1) + ". " + escapeHtml(spec.label || spec.id) + "</strong>",
      '<button class="icon-button" type="button" aria-label="Remove command" title="Remove command" data-remove-command="' + escapeHtml(entry.uid) + '">x</button>',
      "</div>",
      '<div class="command-param-grid">'
    ];

    params.forEach(function (param) {
      var name = normalizeParamName(param.name);
      var value = entry.params && entry.params[name] ? entry.params[name] : "";
      html.push(commandParamHtml(entry.uid, param, value));
    });

    html.push("</div></article>");
    return html.join("");
  }

  function commandParamHtml(uid, param, value) {
    var name = normalizeParamName(param.name);
    var label = param.label || name;
    var required = param.required ? " *" : "";
    if (param.type === "textarea") {
      return [
        '<label class="field command-param command-param-wide">',
        "<span>" + escapeHtml(label + required) + "</span>",
        '<textarea rows="' + (param.rows || 4) + '" data-command-uid="' + escapeHtml(uid) + '" data-command-param="' + escapeHtml(name) + '">' + escapeHtml(value) + "</textarea>",
        "</label>"
      ].join("");
    }
    if (Array.isArray(param.options) && param.options.length) {
      return [
        '<label class="field command-param">',
        "<span>" + escapeHtml(label + required) + "</span>",
        '<select data-command-uid="' + escapeHtml(uid) + '" data-command-param="' + escapeHtml(name) + '">',
        param.options.map(function (option) {
          var selected = String(option) === String(value || param.default || "") ? " selected" : "";
          return '<option value="' + escapeHtml(option) + '"' + selected + ">" + escapeHtml(option) + "</option>";
        }).join(""),
        "</select>",
        "</label>"
      ].join("");
    }
    return [
      '<label class="field command-param">',
      "<span>" + escapeHtml(label + required) + "</span>",
      '<input data-command-uid="' + escapeHtml(uid) + '" data-command-param="' + escapeHtml(name) + '" autocomplete="off" spellcheck="false" value="' + escapeHtml(value) + '">',
      "</label>"
    ].join("");
  }

  function addSelectedCommand(commandId) {
    var spec = commandSpec(commandId);
    if (!spec) {
      return;
    }
    state.commandSerial += 1;
    state.selectedCommands.push({
      uid: "cmd" + state.commandSerial,
      id: commandId,
      params: defaultCommandParams(spec)
    });
    renderCommandBuilder();
    updatePreview();
  }

  function removeCommand(uid) {
    state.selectedCommands = state.selectedCommands.filter(function (entry) {
      return entry.uid !== uid;
    });
    renderCommandBuilder();
    updatePreview();
  }

  function updateCommandParam(uid, paramName, value) {
    state.selectedCommands.forEach(function (entry) {
      if (entry.uid === uid) {
        entry.params[paramName] = value.trim();
      }
    });
    updatePreview();
  }

  function defaultCommandParams(spec) {
    var params = {};
    (spec.parameters || []).forEach(function (param) {
      var name = normalizeParamName(param.name);
      if (param.default !== undefined) {
        params[name] = String(param.default);
      } else if (name === "view") {
        params[name] = inputValue("adeView");
      } else if (name === "branch") {
        params[name] = inputValue("adeBranch");
      } else if (name === "txn") {
        params[name] = inputValue("adeTxn");
      } else if (name === "bug") {
        params[name] = inputValue("bugNumber");
      } else {
        params[name] = "";
      }
    });
    return params;
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

  function workflowHasOperations(workflow) {
    return workflowOperations(workflow).length > 0;
  }

  function firstOperation(workflow) {
    var operations = workflowOperations(workflow);
    return operations.length ? operations[0] : null;
  }

  function operationFields(operation) {
    return operation && Array.isArray(operation.fields) ? operation.fields : ["details"];
  }

  function workflowFields(workflow, operation) {
    if (!workflowHasOperations(workflow)) {
      return ["instructions"];
    }
    return operationFields(operation);
  }

  function commandsForWorkflow(workflowId) {
    return state.commands.filter(function (command) {
      return commandAllowedForWorkflow(command, workflowId);
    });
  }

  function commandAllowedForWorkflow(command, workflowId) {
    if (workflowId === "custom") {
      return true;
    }
    if (Array.isArray(command.workflows) && command.workflows.length) {
      return command.workflows.indexOf("any") !== -1 || command.workflows.indexOf(workflowId) !== -1;
    }
    if (!command.workflow || command.workflow === "any" || command.workflow === workflowId) {
      return true;
    }
    return false;
  }

  function projectOptionsForWorkflow() {
    var workflow = selectedWorkflow();
    if (!workflow || !Array.isArray(workflow.projectAliases) || !workflow.projectAliases.length) {
      return state.projects;
    }
    var allowed = {};
    workflow.projectAliases.forEach(function (alias) {
      allowed[alias] = true;
    });
    return state.projects.filter(function (project) {
      return allowed[project.alias];
    });
  }

  function commandSpec(commandId) {
    return state.commands.find(function (command) {
      return command.id === commandId;
    }) || null;
  }

  function normalizeParamName(value) {
    return String(value || "").trim().toLowerCase().replace(/-/g, "_");
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
    if (!primary && workflow && !workflowHasOperations(workflow)) {
      primary = firstLine(inputValue("instructions"));
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
      operation && operation.name ? operation.name : "Instructions",
      primary
    ].join(": ");
  }

  function buildTaskText() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var fields = workflowFields(workflow, operation);
    var lines = [];

    if (workflow && !workflowHasOperations(workflow)) {
      return inputValue("instructions").trim() + "\n";
    }

    if (operation && operation.description) {
      lines.push(operation.description);
      lines.push("");
    }

    fields.forEach(function (fieldName) {
      if (fieldName === "details") {
        return;
      }
      if (workflow && workflow.id === "alm-backport" && (fieldName === "releaseYear" || fieldName === "releaseMonth")) {
        return;
      }
      if (workflow && workflow.id === "seeddata") {
        var seedConditional = fieldSpecs[fieldName] && fieldSpecs[fieldName].conditional;
        if (seedConditional === "seedRelease") {
          return;
        }
        if (seedConditional === "profileOption" && inputValue("seedDataType") !== "Profile Option") {
          return;
        }
        if (seedConditional === "profileOptionUserValue" && (inputValue("seedDataType") !== "Profile Option" || inputValue("profileUserEnabled") !== "Y")) {
          return;
        }
        if (seedConditional === "message" && inputValue("seedDataType") !== "Message") {
          return;
        }
        if (seedConditional === "lookup" && inputValue("seedDataType") !== "Lookup") {
          return;
        }
      }
      var value = inputValue(fieldName);
      if (value) {
        lines.push((fieldSpecs[fieldName] && fieldSpecs[fieldName].taskLabel ? fieldSpecs[fieldName].taskLabel : fieldName) + ": " + value);
      }
    });

    if (workflow && workflow.id === "alm-backport" && fields.indexOf("releaseYear") !== -1 && fields.indexOf("releaseMonth") !== -1) {
      var year = inputValue("releaseYear");
      var month = inputValue("releaseMonth");
      if (year && month) {
        lines.push("Target release: " + year + "." + month);
      }
    }

    if (workflow && workflow.id === "seeddata" && inputValue("seedTarget") === "Release") {
      var seedYear = inputValue("seedReleaseYear");
      var seedMonth = inputValue("seedReleaseMonth");
      if (seedYear && seedMonth) {
        lines.push("Target release: " + seedYear + "." + seedMonth);
      }
    }

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

  function buildCommandLines() {
    if (!state.selectedCommands.length) {
      return [];
    }

    var lines = ["Commands:"];
    state.selectedCommands.forEach(function (entry) {
      var spec = commandSpec(entry.id);
      if (!spec) {
        return;
      }
      lines.push("- command: " + entry.id);
      (spec.parameters || []).forEach(function (param) {
        var name = normalizeParamName(param.name);
        var value = entry.params && entry.params[name] ? entry.params[name].trim() : "";
        if (!value && param.default !== undefined) {
          value = String(param.default);
        }
        if (value) {
          value.split(/\r?\n/).forEach(function (valueLine, index) {
            if (index === 0) {
              lines.push("  " + name + ": " + valueLine);
            } else {
              lines.push("    " + valueLine);
            }
          });
        }
      });
    });
    return lines;
  }

  function buildIssueBody() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var context = selectedContextForIssue();
    var lines = [
      "Queue: " + queuedLabel(),
      "",
      "Workflow: " + (workflow ? workflow.id : "")
    ];

    if (operation) {
      lines.push("Operation: " + operation.id);
    }

    if (workflow && workflow.requiresProject) {
      lines.push("Project: " + state.selectedProjectAlias);
    }

    lines.push("");

    if (context) {
      lines.push("Context:");
      lines.push(context);
      lines.push("");
    }

    var commandLines = buildCommandLines();
    if (commandLines.length) {
      Array.prototype.push.apply(lines, commandLines);
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
    localStorage.setItem(STORAGE_RUNNER, state.selectedRunnerId);
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
    if (workflowHasOperations(workflow) && !operation) {
      throw new Error("Select an operation.");
    }
    if (!workflowHasOperations(workflow)) {
      requiredFields = ["instructions"];
    }
    if (workflow.requiresProject && !state.selectedProjectAlias) {
      throw new Error("Select a project.");
    }

    requiredFields.forEach(function (fieldName) {
      if (!inputValue(fieldName)) {
        throw new Error("Enter " + (fieldSpecs[fieldName] ? fieldSpecs[fieldName].label : fieldName) + ".");
      }
    });

    validateWorkflowFields(workflow);
    validateSelectedCommands(workflow);
  }

  function validateWorkflowFields(workflow) {
    if (!workflow) {
      return;
    }

    if (workflow.id === "seeddata") {
      var seedType = inputValue("seedDataType").trim();
      if (["Profile Option", "Message", "Lookup"].indexOf(seedType) === -1) {
        throw new Error("Seed Data Type must be Profile Option, Message, or Lookup.");
      }

      var seedTarget = inputValue("seedTarget").trim();
      if (["Bronze", "Silver", "Release"].indexOf(seedTarget) === -1) {
        throw new Error("Target codeline must be Bronze, Silver, or Release.");
      }

      if (seedTarget === "Release") {
        var seedYear = inputValue("seedReleaseYear").trim();
        if (["26", "27", "28", "29", "30"].indexOf(seedYear) === -1) {
          throw new Error("Release year must be 26, 27, 28, 29, or 30.");
        }

        var seedMonth = inputValue("seedReleaseMonth").trim();
        if (["01", "04", "07", "10"].indexOf(seedMonth) === -1) {
          throw new Error("Release month must be 01, 04, 07, or 10.");
        }
      }

      if (seedType === "Profile Option") {
        if (!inputValue("profileOptionCode")) {
          throw new Error("Enter Profile option code.");
        }
        if (!inputValue("profileOptionName")) {
          throw new Error("Enter Profile option name.");
        }
        if (!inputValue("profileOptionDescription")) {
          throw new Error("Enter Profile option description.");
        }
        if (!inputValue("profileOptionValue")) {
          throw new Error("Enter SITE profile option value.");
        }
        if (
          ["Y", "N"].indexOf(inputValue("profileSiteEnabled")) === -1 ||
          ["Y", "N"].indexOf(inputValue("profileSiteUpdatable")) === -1 ||
          ["Y", "N"].indexOf(inputValue("profileUserEnabled")) === -1 ||
          ["Y", "N"].indexOf(inputValue("profileUserUpdatable")) === -1
        ) {
          throw new Error("Profile option enabled/updatable fields must be Y or N.");
        }
        if (inputValue("profileUserEnabled") === "Y" && !inputValue("profileOptionUserValue")) {
          throw new Error("Enter USER profile option value when User enabled is Y.");
        }
      } else if (seedType === "Message") {
        if (!inputValue("messageSql")) {
          throw new Error("Enter Message SQL.");
        }
      } else {
        if (!inputValue("lookupType")) {
          throw new Error("Enter Lookup type.");
        }
        if (!inputValue("lookupMeaning")) {
          throw new Error("Enter Lookup meaning.");
        }
        if (!inputValue("lookupDescription")) {
          throw new Error("Enter Lookup description.");
        }
        if (!inputValue("lookupValues")) {
          throw new Error("Enter Lookup values.");
        }
      }
      return;
    }

    if (workflow.id !== "alm-backport") {
      return;
    }

    var backportType = inputValue("backportType").trim();
    if (["VB", "ADE"].indexOf(backportType) === -1) {
      throw new Error("Backport type must be VB or ADE.");
    }

    var baseBug = inputValue("baseBugNumber").trim();
    if (!/^\d+$/.test(baseBug)) {
      throw new Error("Base bug number must contain digits only.");
    }

    var year = inputValue("releaseYear").trim();
    if (["26", "27", "28", "29", "30"].indexOf(year) === -1) {
      throw new Error("Release year must be 26, 27, 28, 29, or 30.");
    }

    var month = inputValue("releaseMonth").trim();
    if (["01", "04", "07", "10"].indexOf(month) === -1) {
      throw new Error("Release month must be 01, 04, 07, or 10.");
    }
  }

  function validateSelectedCommands(workflow) {
    var views = {};
    state.selectedCommands.forEach(function (entry) {
      var spec = commandSpec(entry.id);
      if (!spec) {
        throw new Error("Unknown command: " + entry.id + ".");
      }
      if (workflow && !commandAllowedForWorkflow(spec, workflow.id)) {
        throw new Error("Command " + entry.id + " is not valid for this workflow.");
      }
      (spec.parameters || []).forEach(function (param) {
        var name = normalizeParamName(param.name);
        var value = entry.params && entry.params[name] ? entry.params[name].trim() : "";
        if (!value && param.default !== undefined) {
          value = String(param.default);
        }
        if (param.required && !value) {
          throw new Error("Enter " + (param.label || name) + " for " + (spec.label || spec.id) + ".");
        }
        if (value && Array.isArray(param.options) && param.options.length && param.options.indexOf(value) === -1) {
          throw new Error((param.label || name) + " for " + (spec.label || spec.id) + " is invalid.");
        }
        if (value && param.pattern) {
          var regex = new RegExp(param.pattern);
          if (!regex.test(value)) {
            throw new Error((param.label || name) + " for " + (spec.label || spec.id) + " is invalid.");
          }
        }
        if (name === "view" && value) {
          views[value] = true;
        }
      });
    });
    if (Object.keys(views).length > 1) {
      throw new Error("Use one ADE view per trigger.");
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
