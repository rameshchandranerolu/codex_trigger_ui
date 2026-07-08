(function () {
  "use strict";

  var STORAGE_OWNER = "codexTrigger.owner";
  var STORAGE_REPO = "codexTrigger.repo";
  var STORAGE_RUNNER = "codexTrigger.runner";
  var STORAGE_MODEL = "codexTrigger.modelPreset";
  var ASSET_VERSION = "20260616-rag-study-modes";
  var defaultProfileSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/HcmEmploymentCore/ProfileOptionSD.xml";
  var defaultMessageSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/MessageSD.xml";
  var defaultLookupSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/CommonLookupTypeSD.xml";
  var defaultValueSetSeedFile = "$AVR/fusionapps/hcm/per/db/data/HcmEmploymentTop/ValueSetSD.xml";
  var defaultStagingDbUrl = "(DESCRIPTION=(SOURCE_ROUTE=YES)(ADDRESS=(PROTOCOL=TCP)(HOST=faeops-oci-cman.oraclecorp.com)(PORT=1999))(ADDRESS=(PROTOCOL=TCP)(HOST=phx00041-8xib5-scan.dbfepint.adpdb01phxpint.oraclevcn.com)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=uspjiamp_f_fb)))";
  var defaultStagingEnvironmentName = "Bronze Manual";
  var customStagingEnvironmentName = "Custom";
  var defaultStagingUsername = "fusion_read_only";
  var defaultStagingPassword = "Welcome1!";

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
        },
        {
          id: "rag-current",
          name: "RAG Runner",
          owner: "rameshchandranerolu",
          repo: "codex_rag_runner",
          workflowIds: ["rag"]
        }
      ]
    },
    codexModelPresets: [
      {
        id: "cheap-default",
        label: "Cheap default",
        model: "gpt-5.5",
        reasoningEffort: "medium",
        serviceTier: "instant",
        default: true
      },
      {
        id: "gpt-5.5-priority",
        label: "GPT-5.5 Priority",
        model: "gpt-5.5",
        reasoningEffort: "xhigh",
        serviceTier: "priority"
      }
    ],
    workflows: [
      {
        id: "rag",
        name: "RAG Study",
        kind: "Study",
        description: "Ask source-grounded study questions over files indexed by the standalone RAG runner.",
        defaultRunner: "rag-current",
        requiresProject: false,
        operations: [
          {
            id: "ask",
            name: "Ask",
            description: "Get a direct source-grounded answer with certification-relevant explanation.",
            fields: ["details"],
            requiredFields: ["details"],
            titleField: "details"
          },
          {
            id: "teach",
            name: "Teach",
            description: "Learn a concept step by step through the uploaded certification material.",
            fields: ["details"],
            requiredFields: ["details"],
            titleField: "details"
          },
          {
            id: "quiz",
            name: "Quiz",
            description: "Generate practice questions and a cited answer key from the uploaded material.",
            fields: ["details"],
            requiredFields: ["details"],
            titleField: "details"
          },
          {
            id: "flashcards",
            name: "Flashcards",
            description: "Create concise source-grounded flashcards for revision.",
            fields: ["details"],
            requiredFields: ["details"],
            titleField: "details"
          },
          {
            id: "revise",
            name: "Revise",
            description: "Build a certification revision sheet with must-know points and checklist.",
            fields: ["details"],
            requiredFields: ["details"],
            titleField: "details"
          }
        ]
      },
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
    personIdentifier: {
      id: "personIdentifierInput",
      label: "Person ID or name",
      placeholder: "300100123456789 or Jane Smith",
      taskLabel: "Person identifier"
    },
    toDb: {
      id: "toDbInput",
      label: "To DB",
      placeholder: "defaultDB",
      defaultValue: "defaultDB",
      taskLabel: "To DB"
    },
    backportType: {
      id: "backportTypeInput",
      label: "Backport type",
      type: "select",
      options: ["VB", "ADE"],
      taskLabel: "Backport type"
    },
    backportCheckSourceType: {
      id: "backportCheckSourceTypeInput",
      label: "Source type",
      type: "select",
      options: ["ADE", "VB"],
      taskLabel: "Source type"
    },
    backportCheckSource: {
      id: "backportCheckSourceInput",
      label: "Source bug / transaction / MR",
      placeholder: "39313317, rnerolu_bug-39313317, VB branch, or MR URL",
      taskLabel: "Source"
    },
    backportCheckBaseReleaseYear: {
      id: "backportCheckBaseReleaseYearInput",
      label: "Base release year",
      type: "select",
      options: ["26", "27", "28", "29", "30"],
      taskLabel: "Base release year",
      conditional: "backportCheckBaseRelease"
    },
    backportCheckBaseReleaseMonth: {
      id: "backportCheckBaseReleaseMonthInput",
      label: "Base release month",
      type: "select",
      options: ["01", "04", "07", "10"],
      taskLabel: "Base release month",
      conditional: "backportCheckBaseRelease"
    },
    backportCheckTargetReleaseYear: {
      id: "backportCheckTargetReleaseYearInput",
      label: "Target release year",
      type: "select",
      options: ["26", "27", "28", "29", "30"],
      taskLabel: "Target release year"
    },
    backportCheckTargetReleaseMonth: {
      id: "backportCheckTargetReleaseMonthInput",
      label: "Target release month",
      type: "select",
      options: ["01", "04", "07", "10"],
      taskLabel: "Target release month"
    },
    backportCheckSafeBypass: {
      id: "backportCheckSafeBypassInput",
      label: "Safe to bypass backport",
      type: "checkbox",
      taskLabel: "Safe to bypass backport"
    },
    backportCheckBypassReason: {
      id: "backportCheckBypassReasonInput",
      label: "Bypass reason",
      type: "textarea",
      rows: 3,
      placeholder: "Optional reason for bypassing this source/target release",
      taskLabel: "Bypass reason",
      conditional: "backportCheckBypass"
    },
    silverMergeNote: {
      id: "silverMergeNote",
      label: "Note",
      type: "note",
      text: "Only ADE Bronze bugs should be provided. Do not enter VB/ALM bugs."
    },
    bronzeBugs: {
      id: "bronzeBugsInput",
      label: "Bronze bugs",
      type: "textarea",
      rows: 4,
      placeholder: "38831761, 38831762",
      taskLabel: "Bronze bugs"
    },
    silverBugNumber: {
      id: "silverBugNumberInput",
      label: "Silver bug number",
      placeholder: "Optional",
      taskLabel: "Silver bug number"
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
      options: ["Profile Option", "Message", "Lookup", "Value Set"],
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
    existingBugNumber: {
      id: "existingBugNumberInput",
      label: "Existing bug number",
      placeholder: "39483803",
      taskLabel: "Existing bug number"
    },
    bugDescription: {
      id: "bugDescriptionInput",
      label: "Bug description",
      type: "textarea",
      rows: 6,
      placeholder: "Short BugDB subject/description",
      taskLabel: "Bug description"
    },
    copyFromStaging: {
      id: "copyFromStagingInput",
      label: "Copy from staging",
      type: "select",
      options: ["No", "Yes"],
      taskLabel: "Copy from staging",
      conditional: "stagingCopySupported"
    },
    stagingEnvironment: {
      id: "stagingEnvironmentInput",
      label: "Staging environment",
      type: "select",
      options: ["Bronze Manual", "Bronze Cookie Cutter", "Silver Manual", "Custom"],
      defaultValue: defaultStagingEnvironmentName,
      taskLabel: "Staging environment",
      conditional: "stagingCopy"
    },
    stagingDbUrl: {
      id: "stagingDbUrlInput",
      label: "Staging environment URL",
      type: "textarea",
      rows: 4,
      defaultValue: defaultStagingDbUrl,
      readOnly: true,
      taskLabel: "Staging URL",
      conditional: "stagingCopy"
    },
    stagingUsername: {
      id: "stagingUsernameInput",
      label: "Staging username",
      defaultValue: defaultStagingUsername,
      taskLabel: "Staging username",
      conditional: "stagingCopy"
    },
    stagingPassword: {
      id: "stagingPasswordInput",
      label: "Staging password",
      inputType: "password",
      defaultValue: defaultStagingPassword,
      taskLabel: "Staging password",
      conditional: "stagingCopy"
    },
    stagingKey: {
      id: "stagingKeyInput",
      label: "Staging key",
      placeholder: "ORA_PER_RETGRD_GRADE_LADDER_VS",
      taskLabel: "Staging key",
      conditional: "stagingCopy"
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
      type: "lookupRows",
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
    modelPresets: [],
    selectedCommands: [],
    commandSerial: 0,
    selectedWorkflowId: "",
    selectedOperationId: "",
    selectedProjectAlias: "",
    selectedRunnerId: "",
    selectedModelPresetId: "",
    stagingEnvironments: null
  };

  var commandRecipes = [
    {
      id: "refresh-clean-validation-pmc",
      label: "Refresh + Clean + Validate + PMC",
      workflows: ["custom", "seeddata"],
      commands: [
        { id: "ade.refresh-view", params: { view: "$adeView" } },
        { id: "ade.clean-view", params: { view: "$adeView" } },
        { id: "hcm.bug-validation", params: { bug_ref: "$bugNumber" } },
        { id: "hcm.pmc", params: { bug: "$bugNumber", view: "$adeView" } }
      ]
    },
    {
      id: "create-bug-view-validation-pmc",
      label: "Create Bug + View + Validate + PMC",
      workflows: ["custom", "seeddata"],
      commands: [
        { id: "bugdb.create-bug", params: {} },
        { id: "ade.create-view", params: { view: "$adeView", branch: "$adeBranch", txn: "${bug_ref}" } },
        { id: "hcm.bug-validation", params: { bug_ref: "${bug}" } },
        { id: "hcm.pmc", params: { bug: "${bug}", view: "$adeView" } }
      ]
    },
    {
      id: "create-view-orareview",
      label: "Create View + OraReview",
      workflows: ["custom"],
      commands: [
        { id: "ade.create-view", params: { view: "$adeView", branch: "$adeBranch", txn: "$adeTxn" } },
        { id: "orareview.create", params: { view: "$adeView", bug: "$bugNumber" } }
      ]
    },
    {
      id: "close-duplicate",
      label: "Close Duplicate Bug",
      workflows: ["custom"],
      commands: [
        { id: "bugdb.set-status", params: { bug: "$bugNumber", status: "36" } }
      ]
    }
  ];

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
      "modelPresetSelect",
      "ownerInput",
      "repoInput",
      "dynamicFields",
      "commandBuilder",
      "contextInput",
      "titleInput",
      "previewButton",
      "submitLink",
      "copyIssueUrlButton",
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
    if (els.modelPresetSelect) {
      els.modelPresetSelect.addEventListener("change", function () {
        state.selectedModelPresetId = els.modelPresetSelect.value;
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
    els.submitLink.addEventListener("click", openIssueLink);
    els.copyIssueUrlButton.addEventListener("click", copyIssueUrl);
  }

  function loadLocalSettings() {
    localStorage.removeItem("codexTrigger.githubToken");
    state.selectedRunnerId = localStorage.getItem(STORAGE_RUNNER) || "";
    state.selectedModelPresetId = localStorage.getItem(STORAGE_MODEL) || "";
    els.ownerInput.value = localStorage.getItem(STORAGE_OWNER) || "";
    els.repoInput.value = localStorage.getItem(STORAGE_REPO) || "";
  }

  function loadConfig() {
    setStatus("Loading", "busy");
    Promise.all([
      fetch(assetUrl("./projects.json"), { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load projects.json");
        }
        return response.json();
      }),
      fetch(assetUrl("./commands.json"), { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          return { commands: [] };
        }
        return response.json();
      }).catch(function () {
        return { commands: [] };
      }),
      fetch(assetUrl("./seeddata_staging_environments.json"), { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          return {};
        }
        return response.json();
      }).catch(function () {
        return {};
      })
    ])
      .then(function (response) {
        var config = response[0];
        var commandConfig = response[1] || {};
        var stagingConfig = response[2] || {};
        state.config = config;
        state.workflows = Array.isArray(config.workflows) ? config.workflows : [];
        state.projects = Array.isArray(config.projects) ? config.projects : [];
        state.commands = Array.isArray(commandConfig.commands) ? commandConfig.commands : [];
        state.stagingEnvironments = normalizeStagingEnvironments(stagingConfig);
        updateStagingEnvironmentOptions();
        state.runners = githubRunners(config);
        state.modelPresets = codexModelPresets(config);
        if (!runnerById(state.selectedRunnerId)) {
          state.selectedRunnerId = state.runners.length ? state.runners[0].id : "";
        }
        if (!modelPresetById(state.selectedModelPresetId)) {
          state.selectedModelPresetId = defaultModelPresetId();
        }
        renderRunnerSelect();
        renderModelPresetSelect();
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
        state.stagingEnvironments = defaultStagingEnvironments();
        updateStagingEnvironmentOptions();
        state.runners = githubRunners(fallbackConfig);
        state.modelPresets = codexModelPresets(fallbackConfig);
        if (!runnerById(state.selectedRunnerId)) {
          state.selectedRunnerId = state.runners.length ? state.runners[0].id : "";
        }
        if (!modelPresetById(state.selectedModelPresetId)) {
          state.selectedModelPresetId = defaultModelPresetId();
        }
        renderRunnerSelect();
        renderModelPresetSelect();
        applySelectedRunner(false);
        state.selectedCommands = [];
        selectWorkflow(state.workflows[0].id);
        renderWorkflows();
        updateRepoLabel();
        updatePreview();
        setStatus("Using fallback", "error");
      });
  }

  function assetUrl(path) {
    return path + "?v=" + encodeURIComponent(ASSET_VERSION);
  }

  function defaultStagingEnvironments() {
    var environments = {};
    environments[defaultStagingEnvironmentName] = defaultStagingDbUrl;
    environments["Bronze Cookie Cutter"] = "";
    environments["Silver Manual"] = "";
    return environments;
  }

  function normalizeStagingEnvironments(raw) {
    var environments = {};
    Object.keys(raw || {}).forEach(function (name) {
      var trimmedName = String(name || "").trim();
      if (trimmedName) {
        environments[trimmedName] = String(raw[name] || "").trim();
      }
    });
    return Object.keys(environments).length ? environments : defaultStagingEnvironments();
  }

  function stagingEnvironments() {
    return normalizeStagingEnvironments(state.stagingEnvironments || defaultStagingEnvironments());
  }

  function stagingEnvironmentNames() {
    return Object.keys(stagingEnvironments());
  }

  function updateStagingEnvironmentOptions() {
    var names = stagingEnvironmentNames();
    fieldSpecs.stagingEnvironment.options = names.concat([customStagingEnvironmentName]);
    if (fieldSpecs.stagingEnvironment.options.indexOf(defaultStagingEnvironmentName) !== -1) {
      fieldSpecs.stagingEnvironment.defaultValue = defaultStagingEnvironmentName;
    } else {
      fieldSpecs.stagingEnvironment.defaultValue = names[0] || customStagingEnvironmentName;
    }
  }

  function stagingUrlForEnvironment(name) {
    var environments = stagingEnvironments();
    return String(environments[name] || "").trim();
  }

  function updateStagingUrlFromEnvironment() {
    var environmentInput = document.getElementById("stagingEnvironmentInput");
    var stagingDbUrl = document.getElementById("stagingDbUrlInput");
    if (!stagingDbUrl) {
      return;
    }
    var environment = environmentInput ? environmentInput.value : defaultStagingEnvironmentName;
    var isCustom = environment === customStagingEnvironmentName;
    stagingDbUrl.readOnly = !isCustom;
    if (isCustom) {
      if (!stagingDbUrl.value.trim()) {
        stagingDbUrl.value = defaultStagingDbUrl;
      }
      return;
    }
    stagingDbUrl.value = stagingUrlForEnvironment(environment);
  }

  function lookupValueRowHtml(row) {
    row = row || {};
    return [
      '<div class="lookup-value-row">',
      '<input class="lookup-code-input" autocomplete="off" spellcheck="false" placeholder="JAN" value="' + escapeHtml(row.code || "") + '">',
      '<input class="lookup-meaning-input" autocomplete="off" spellcheck="false" placeholder="January" value="' + escapeHtml(row.meaning || "") + '">',
      '<input class="lookup-sequence-input" autocomplete="off" inputmode="numeric" placeholder="1" value="' + escapeHtml(row.displaySequence || "") + '">',
      '<button class="secondary-button lookup-row-remove" type="button">Remove</button>',
      "</div>"
    ].join("");
  }

  function lookupRowsHtml(fieldAttrs) {
    return [
      '<div class="field wide lookup-values-field"' + fieldAttrs + '>',
      "<span>Lookup values</span>",
      '<div id="lookupValuesRows" class="lookup-values-grid">',
      lookupValueRowHtml(),
      "</div>",
      '<div class="lookup-values-actions">',
      '<button id="addLookupValueRowButton" class="secondary-button" type="button">Add row</button>',
      "</div>",
      '<textarea id="lookupValuesInput" hidden></textarea>',
      "</div>"
    ].join("");
  }

  function ensureLookupValueRows() {
    var rows = document.getElementById("lookupValuesRows");
    if (rows && !rows.children.length) {
      rows.innerHTML = lookupValueRowHtml();
    }
  }

  function lookupValueLinesFromRows() {
    var rows = document.getElementById("lookupValuesRows");
    if (!rows) {
      return [];
    }
    var lines = [];
    Array.prototype.forEach.call(rows.querySelectorAll(".lookup-value-row"), function (row, index) {
      var code = row.querySelector(".lookup-code-input").value.trim();
      var meaning = row.querySelector(".lookup-meaning-input").value.trim();
      var sequence = row.querySelector(".lookup-sequence-input").value.trim();
      if (!code && !meaning && !sequence) {
        return;
      }
      if (!code) {
        throw new Error("Lookup value row " + (index + 1) + " is missing key");
      }
      if (!meaning) {
        throw new Error("Lookup value row " + (index + 1) + " is missing value");
      }
      if (sequence && !/^[0-9]+$/.test(sequence)) {
        throw new Error("Lookup value row " + (index + 1) + " display sequence must contain digits only");
      }
      lines.push(code + " - " + meaning + (sequence ? " - " + sequence : ""));
    });
    return lines;
  }

  function syncLookupValuesField() {
    var input = document.getElementById("lookupValuesInput");
    if (!input) {
      return;
    }
    try {
      input.value = lookupValueLinesFromRows().join("\n");
    } catch (error) {
      input.value = "";
    }
  }

  function bindLookupValueRows() {
    var rows = document.getElementById("lookupValuesRows");
    var addButton = document.getElementById("addLookupValueRowButton");
    if (!rows || !addButton) {
      return;
    }
    addButton.addEventListener("click", function () {
      rows.insertAdjacentHTML("beforeend", lookupValueRowHtml());
      syncLookupValuesField();
      updatePreview();
    });
    rows.addEventListener("input", function () {
      syncLookupValuesField();
      updatePreview();
    });
    rows.addEventListener("click", function (event) {
      if (event.target && event.target.classList.contains("lookup-row-remove")) {
        event.target.closest(".lookup-value-row").remove();
        ensureLookupValueRows();
        syncLookupValuesField();
        updatePreview();
      }
    });
    syncLookupValuesField();
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
        description: String(runner.description || ""),
        workflowIds: Array.isArray(runner.workflowIds) ? runner.workflowIds.map(String) : []
      };
    });
  }

  function codexModelPresets(config) {
    var presets = config && Array.isArray(config.codexModelPresets) ? config.codexModelPresets : [];
    if (!presets.length) {
      presets = fallbackConfig.codexModelPresets;
    }
    return presets.map(function (preset, index) {
      return {
        id: String(preset.id || "preset" + (index + 1)),
        label: String(preset.label || preset.name || preset.id || "Preset " + (index + 1)),
        model: String(preset.model || ""),
        reasoningEffort: String(preset.reasoningEffort || preset.reasoning_effort || ""),
        serviceTier: String(preset.serviceTier || preset.service_tier || ""),
        default: Boolean(preset.default)
      };
    }).filter(function (preset) {
      return preset.id && preset.model;
    });
  }

  function defaultModelPresetId() {
    var found = state.modelPresets.find(function (preset) {
      return preset.default;
    });
    if (found) {
      return found.id;
    }
    return state.modelPresets.length ? state.modelPresets[0].id : "";
  }

  function renderRunnerSelect() {
    if (!els.runnerSelect) {
      return;
    }
    var runners = visibleRunnersForSelectedWorkflow();
    els.runnerSelect.innerHTML = runners.map(function (runner) {
      var selected = runner.id === state.selectedRunnerId ? " selected" : "";
      return '<option value="' + escapeHtml(runner.id) + '"' + selected + ">" + escapeHtml(runner.name) + "</option>";
    }).join("");
    els.runnerSelect.value = state.selectedRunnerId;
  }

  function renderModelPresetSelect() {
    if (!els.modelPresetSelect) {
      return;
    }
    els.modelPresetSelect.innerHTML = state.modelPresets.map(function (preset) {
      var selected = preset.id === state.selectedModelPresetId ? " selected" : "";
      return '<option value="' + escapeHtml(preset.id) + '"' + selected + ">" + escapeHtml(preset.label) + "</option>";
    }).join("");
    els.modelPresetSelect.value = state.selectedModelPresetId;
  }

  function selectedRunner() {
    var runners = visibleRunnersForSelectedWorkflow();
    return runnerByIdIn(runners, state.selectedRunnerId) || (runners.length ? runners[0] : null);
  }

  function selectedModelPreset() {
    return modelPresetById(state.selectedModelPresetId) || (state.modelPresets.length ? state.modelPresets[0] : null);
  }

  function runnerById(runnerId) {
    return state.runners.find(function (runner) {
      return runner.id === runnerId;
    }) || null;
  }

  function runnerByIdIn(runners, runnerId) {
    return runners.find(function (runner) {
      return runner.id === runnerId;
    }) || null;
  }

  function visibleRunnersForSelectedWorkflow() {
    return visibleRunnersForWorkflow(state.selectedWorkflowId);
  }

  function visibleRunnersForWorkflow(workflowId) {
    var specific = state.runners.filter(function (runner) {
      return runner.workflowIds.indexOf(workflowId) !== -1;
    });
    if (specific.length) {
      return specific;
    }
    var shared = state.runners.filter(function (runner) {
      return !runner.workflowIds.length;
    });
    return shared.length ? shared : state.runners;
  }

  function ensureSelectedRunnerForWorkflow() {
    var runners = visibleRunnersForSelectedWorkflow();
    var workflow = selectedWorkflow();
    var defaultRunner = workflow && workflow.defaultRunner ? String(workflow.defaultRunner) : "";
    if (defaultRunner && runnerByIdIn(runners, defaultRunner)) {
      state.selectedRunnerId = defaultRunner;
    } else if (!runnerByIdIn(runners, state.selectedRunnerId)) {
      state.selectedRunnerId = runners.length ? runners[0].id : "";
    }
    renderRunnerSelect();
    applySelectedRunner(true);
  }

  function modelPresetById(presetId) {
    return state.modelPresets.find(function (preset) {
      return preset.id === presetId;
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
    ensureSelectedRunnerForWorkflow();
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
        if (!commandBuilderEnabled(selectedWorkflow())) {
          state.selectedCommands = [];
        }
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
    bindLookupValueRows();
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
    if (type === "Value Set") {
      return defaultValueSetSeedFile;
    }
    return defaultProfileSeedFile;
  }

  function isDefaultSeedFile(value) {
    return value === defaultProfileSeedFile || value === defaultMessageSeedFile || value === defaultLookupSeedFile || value === defaultValueSetSeedFile;
  }

  function supportsStagingCopy(type) {
    return type === "Profile Option" || type === "Lookup" || type === "Value Set";
  }

  function seeddataCopyFromStagingYes() {
    return supportsStagingCopy(inputValue("seedDataType")) && inputValue("copyFromStaging") === "Yes";
  }

  function stagingKeyLabelForType(type) {
    if (type === "Profile Option") {
      return "Profile option code";
    }
    if (type === "Lookup") {
      return "Lookup type";
    }
    if (type === "Value Set") {
      return "Value set code";
    }
    return "Staging key";
  }

  function setFieldLabel(fieldName, label) {
    var spec = fieldSpecs[fieldName];
    var element = spec ? document.getElementById(spec.id) : null;
    var field = element ? element.closest("[data-field-name]") : null;
    var span = field ? field.querySelector("span") : null;
    if (span) {
      span.textContent = label;
    }
  }

  function ensureStagingDefaults() {
    var stagingUsername = document.getElementById("stagingUsernameInput");
    var stagingPassword = document.getElementById("stagingPasswordInput");
    updateStagingUrlFromEnvironment();
    if (stagingUsername && !stagingUsername.value.trim()) {
      stagingUsername.value = defaultStagingUsername;
    }
    if (stagingPassword && !stagingPassword.value.trim()) {
      stagingPassword.value = defaultStagingPassword;
    }
  }

  function refreshSeedDataFields() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    var backportCheckSourceType = inputValue("backportCheckSourceType") || "ADE";
    var backportCheckBypass = inputValue("backportCheckSafeBypass") === "Y";
    if (workflow && workflow.id === "custom" && operation && operation.id === "copy-person-data") {
      ensureStagingDefaults();
      return;
    }
    if (!workflow || workflow.id !== "seeddata") {
      Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("[data-conditional]"), function (field) {
        var conditional = field.getAttribute("data-conditional");
        var show = true;
        if (conditional === "backportCheckBaseRelease") {
          show = workflow && workflow.id === "custom" && operation && operation.id === "backport-check" && backportCheckSourceType === "VB";
        } else if (conditional === "backportCheckBypass") {
          show = workflow && workflow.id === "custom" && operation && operation.id === "backport-check" && backportCheckBypass;
        }
        field.hidden = !show;
        field.style.display = show ? "" : "none";
      });
      return;
    }
    var typeInput = document.getElementById("seedDataTypeInput");
    var targetInput = document.getElementById("seedTargetInput");
    var seedFileInput = document.getElementById("seedFilePathInput");
    var type = typeInput ? typeInput.value : "Profile Option";
    var target = targetInput ? targetInput.value : "Bronze";
    var userEnabledInput = document.getElementById("profileUserEnabledInput");
    var userEnabled = userEnabledInput ? userEnabledInput.value : "N";
    var copyInput = document.getElementById("copyFromStagingInput");
    var canCopyFromStaging = supportsStagingCopy(type);
    if (copyInput && !canCopyFromStaging) {
      copyInput.value = "No";
    }
    ensureStagingDefaults();
    var copyFromStaging = canCopyFromStaging && copyInput && copyInput.value === "Yes";
    setFieldLabel("stagingKey", stagingKeyLabelForType(type));
    if (seedFileInput && (!seedFileInput.value.trim() || isDefaultSeedFile(seedFileInput.value.trim()))) {
      seedFileInput.value = seedFileDefaultForType(type);
    }
    Array.prototype.forEach.call(els.dynamicFields.querySelectorAll("[data-conditional]"), function (field) {
      var conditional = field.getAttribute("data-conditional");
      var show = true;
      if (conditional === "profileOption") {
        show = type === "Profile Option" && !copyFromStaging;
      } else if (conditional === "profileOptionUserValue") {
        show = type === "Profile Option" && !copyFromStaging && userEnabled === "Y";
      } else if (conditional === "message") {
        show = type === "Message";
      } else if (conditional === "lookup") {
        show = type === "Lookup" && !copyFromStaging;
      } else if (conditional === "seedRelease") {
        show = target === "Release";
      } else if (conditional === "stagingCopySupported") {
        show = canCopyFromStaging;
      } else if (conditional === "stagingCopy") {
        show = copyFromStaging;
      } else if (conditional === "backportCheckBaseRelease") {
        show = workflow && workflow.id === "custom" && operation && operation.id === "backport-check" && backportCheckSourceType === "VB";
      } else if (conditional === "backportCheckBypass") {
        show = workflow && workflow.id === "custom" && operation && operation.id === "backport-check" && backportCheckBypass;
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
    if (spec.type === "lookupRows") {
      return lookupRowsHtml(fieldAttrs);
    }
    if (spec.type === "note") {
      return [
        '<div class="workflow-note"' + fieldAttrs + '>',
        "<strong>" + escapeHtml(spec.label || "Note") + "</strong>",
        "<span>" + escapeHtml(spec.text || "") + "</span>",
        "</div>"
      ].join("");
    }
    if (spec.type === "select") {
      return [
        '<label class="field"' + fieldAttrs + '>',
        "<span>" + escapeHtml(spec.label) + "</span>",
        '<select id="' + spec.id + '">',
        (spec.options || []).map(function (option) {
          var selected = spec.defaultValue !== undefined && String(option) === String(spec.defaultValue) ? " selected" : "";
          return '<option value="' + escapeHtml(option) + '"' + selected + ">" + escapeHtml(option) + "</option>";
        }).join(""),
        "</select>",
        "</label>"
      ].join("");
    }
    if (spec.type === "checkbox") {
      var checked = spec.defaultValue === "Y" || spec.defaultValue === true ? " checked" : "";
      return [
        '<label class="field"' + fieldAttrs + '>',
        "<span>" + escapeHtml(spec.label) + "</span>",
        '<input id="' + spec.id + '" type="checkbox"' + checked + '>',
        "</label>"
      ].join("");
    }
    if (spec.type === "textarea") {
      var readOnly = spec.readOnly ? " readonly" : "";
      return [
        '<label class="field"' + fieldAttrs + '>',
        "<span>" + escapeHtml(spec.label) + "</span>",
        '<textarea id="' + spec.id + '" rows="' + (spec.rows || 6) + '" placeholder="' + escapeHtml(spec.placeholder || "") + '"' + readOnly + ">" + escapeHtml(spec.defaultValue || "") + "</textarea>",
        "</label>"
      ].join("");
    }
    var inputType = spec.inputType ? ' type="' + escapeHtml(spec.inputType) + '"' : "";
    return [
      '<label class="field"' + fieldAttrs + '>',
      "<span>" + escapeHtml(spec.label) + "</span>",
      '<input id="' + spec.id + '"' + inputType + ' autocomplete="off" spellcheck="false" placeholder="' + escapeHtml(spec.placeholder || "") + '" value="' + escapeHtml(spec.defaultValue || "") + '">',
      "</label>"
    ].join("");
  }

  function renderCommandBuilder() {
    var workflow = selectedWorkflow();
    var commands = commandsForWorkflow(workflow ? workflow.id : "");
    if (!els.commandBuilder || !commands.length || !commandBuilderEnabled(workflow)) {
      if (els.commandBuilder) {
        els.commandBuilder.innerHTML = "";
      }
      return;
    }

    var selectedId = commands[0].id;
    var recipes = commandRecipesForWorkflow(workflow.id);
    var html = [
      '<section class="command-panel" aria-label="Command sequence">',
      '<div class="command-panel-head">',
      "<h3>Command Sequence</h3>",
      '<div class="command-adder">',
      '<select id="commandSelect">',
      commands.map(function (command) {
        return '<option value="' + escapeHtml(command.id) + '">' + escapeHtml(commandOptionLabel(command)) + "</option>";
      }).join(""),
      "</select>",
      '<button id="addCommandButton" class="secondary-button" type="button">Add</button>',
      "</div>",
      "</div>"
    ];

    if (recipes.length) {
      html.push(
        '<div class="command-recipes">',
        recipes.map(function (recipe) {
          return '<button class="command-recipe-button" type="button" data-command-recipe="' + escapeHtml(recipe.id) + '">' + escapeHtml(recipe.label) + "</button>";
        }).join(""),
        "</div>"
      );
    }

    html.push(
      '<div class="command-list">'
    );

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
    Array.prototype.forEach.call(els.commandBuilder.querySelectorAll("[data-command-recipe]"), function (button) {
      button.addEventListener("click", function () {
        applyCommandRecipe(button.getAttribute("data-command-recipe"));
      });
    });

    Array.prototype.forEach.call(els.commandBuilder.querySelectorAll("[data-remove-command]"), function (button) {
      button.addEventListener("click", function () {
        removeCommand(button.getAttribute("data-remove-command"));
      });
    });
    Array.prototype.forEach.call(els.commandBuilder.querySelectorAll("[data-move-command]"), function (button) {
      button.addEventListener("click", function () {
        moveCommand(button.getAttribute("data-move-command"), Number(button.getAttribute("data-move-direction") || "0"));
      });
    });
    Array.prototype.forEach.call(els.commandBuilder.querySelectorAll("[data-duplicate-command]"), function (button) {
      button.addEventListener("click", function () {
        duplicateCommand(button.getAttribute("data-duplicate-command"));
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
      '<div class="command-card-actions">',
      '<button class="icon-button" type="button" aria-label="Move command up" title="Move command up" data-move-command="' + escapeHtml(entry.uid) + '" data-move-direction="-1"' + (index === 0 ? " disabled" : "") + ">&uarr;</button>",
      '<button class="icon-button" type="button" aria-label="Move command down" title="Move command down" data-move-command="' + escapeHtml(entry.uid) + '" data-move-direction="1"' + (index === state.selectedCommands.length - 1 ? " disabled" : "") + ">&darr;</button>",
      '<button class="icon-button" type="button" aria-label="Duplicate command" title="Duplicate command" data-duplicate-command="' + escapeHtml(entry.uid) + '">+</button>',
      '<button class="icon-button" type="button" aria-label="Remove command" title="Remove command" data-remove-command="' + escapeHtml(entry.uid) + '">x</button>',
      "</div>",
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

  function moveCommand(uid, direction) {
    var index = state.selectedCommands.findIndex(function (entry) {
      return entry.uid === uid;
    });
    var target = index + direction;
    var temp;
    if (index < 0 || target < 0 || target >= state.selectedCommands.length) {
      return;
    }
    temp = state.selectedCommands[index];
    state.selectedCommands[index] = state.selectedCommands[target];
    state.selectedCommands[target] = temp;
    renderCommandBuilder();
    updatePreview();
  }

  function duplicateCommand(uid) {
    var index = state.selectedCommands.findIndex(function (entry) {
      return entry.uid === uid;
    });
    var original;
    if (index < 0) {
      return;
    }
    original = state.selectedCommands[index];
    state.commandSerial += 1;
    state.selectedCommands.splice(index + 1, 0, {
      uid: "cmd" + state.commandSerial,
      id: original.id,
      params: Object.assign({}, original.params || {})
    });
    renderCommandBuilder();
    updatePreview();
  }

  function commandRecipesForWorkflow(workflowId) {
    return commandRecipes.filter(function (recipe) {
      return !Array.isArray(recipe.workflows) || recipe.workflows.indexOf(workflowId) !== -1;
    });
  }

  function recipeValue(value) {
    if (value === "$bugNumber") {
      return inputValue("bugNumber");
    }
    if (value === "$adeView") {
      return inputValue("adeView");
    }
    if (value === "$adeBranch") {
      return inputValue("adeBranch");
    }
    if (value === "$adeTxn") {
      return inputValue("adeTxn");
    }
    return value;
  }

  function applyCommandRecipe(recipeId) {
    var recipe = commandRecipes.find(function (item) {
      return item.id === recipeId;
    });
    if (!recipe) {
      return;
    }
    recipe.commands.forEach(function (item) {
      var spec = commandSpec(item.id);
      var params;
      if (!spec) {
        return;
      }
      params = defaultCommandParams(spec);
      Object.keys(item.params || {}).forEach(function (name) {
        params[normalizeParamName(name)] = recipeValue(item.params[name]);
      });
      state.commandSerial += 1;
      state.selectedCommands.push({
        uid: "cmd" + state.commandSerial,
        id: item.id,
        params: params
      });
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
      } else if (name === "bug_ref") {
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

  function commandBuilderEnabled(workflow) {
    var operation = selectedOperation();
    if (!workflow) {
      return false;
    }
    if (workflow.id === "custom" && operation && operation.id === "custom") {
      return false;
    }
    if (workflow.id === "custom" && operation && operation.id === "copy-person-data") {
      return false;
    }
    if (workflow.id === "custom" && operation && operation.id === "backport-check") {
      return false;
    }
    return true;
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

  function commandOptionLabel(command) {
    var group = command.ui_group || command.category || "";
    var label = command.label || command.id;
    return group ? group + " - " + label : label;
  }

  function normalizeParamName(value) {
    return String(value || "").trim().toLowerCase().replace(/-/g, "_");
  }

  function valueHasSequenceReference(value) {
    return /\$\{[A-Za-z][A-Za-z0-9_]*\}/.test(String(value || ""));
  }

  function queuedLabel() {
    return state.config.github && state.config.github.queuedLabel ? state.config.github.queuedLabel : "codex:queued";
  }

  function inputValue(fieldName) {
    var spec = fieldSpecs[fieldName];
    var id = spec ? spec.id : fieldName + "Input";
    var element = document.getElementById(id);
    if (!element) {
      return "";
    }
    if (spec && spec.type === "checkbox") {
      return element.checked ? "Y" : "N";
    }
    return element.value.trim();
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
      if (fieldSpecs[fieldName] && fieldSpecs[fieldName].type === "note") {
        return;
      }
      if (workflow && workflow.id === "alm-backport" && (fieldName === "releaseYear" || fieldName === "releaseMonth")) {
        return;
      }
      if (workflow && workflow.id === "seeddata") {
        var seedConditional = fieldSpecs[fieldName] && fieldSpecs[fieldName].conditional;
        var seedType = inputValue("seedDataType");
        var copyFromStaging = seeddataCopyFromStagingYes();
        if (seedConditional === "seedRelease") {
          return;
        }
        if (seedConditional === "profileOption" && (seedType !== "Profile Option" || copyFromStaging)) {
          return;
        }
        if (seedConditional === "profileOptionUserValue" && (seedType !== "Profile Option" || copyFromStaging || inputValue("profileUserEnabled") !== "Y")) {
          return;
        }
        if (seedConditional === "message" && seedType !== "Message") {
          return;
        }
        if (seedConditional === "lookup" && (seedType !== "Lookup" || copyFromStaging)) {
          return;
        }
        if (seedConditional === "stagingCopySupported" && !supportsStagingCopy(seedType)) {
          return;
        }
        if (seedConditional === "stagingCopy" && !copyFromStaging) {
          return;
        }
      }
      if (workflow && workflow.id === "custom" && operation && operation.id === "backport-check") {
        var checkConditional = fieldSpecs[fieldName] && fieldSpecs[fieldName].conditional;
        var sourceType = inputValue("backportCheckSourceType");
        var safeBypass = inputValue("backportCheckSafeBypass") === "Y";
        if (checkConditional === "backportCheckBaseRelease" && sourceType !== "VB") {
          return;
        }
        if (checkConditional === "backportCheckBypass" && !safeBypass) {
          return;
        }
        if (fieldName === "backportCheckTargetReleaseYear" || fieldName === "backportCheckTargetReleaseMonth" || fieldName === "backportCheckBaseReleaseYear" || fieldName === "backportCheckBaseReleaseMonth") {
          return;
        }
      }
      var value = inputValue(fieldName);
      if (value) {
        if (fieldSpecs[fieldName] && fieldSpecs[fieldName].type === "checkbox" && value !== "Y") {
          return;
        }
        var taskLabel = fieldSpecs[fieldName] && fieldSpecs[fieldName].taskLabel ? fieldSpecs[fieldName].taskLabel : fieldName;
        if (workflow && workflow.id === "seeddata" && fieldName === "stagingKey") {
          taskLabel = stagingKeyLabelForType(inputValue("seedDataType"));
        }
        lines.push(taskLabel + ": " + value);
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

    if (workflow && workflow.id === "custom" && operation && operation.id === "backport-check") {
      if (inputValue("backportCheckSourceType") === "VB") {
        var checkBaseYear = inputValue("backportCheckBaseReleaseYear");
        var checkBaseMonth = inputValue("backportCheckBaseReleaseMonth");
        if (checkBaseYear && checkBaseMonth) {
          lines.push("Base release: " + checkBaseYear + "." + checkBaseMonth);
        }
      }
      var checkTargetYear = inputValue("backportCheckTargetReleaseYear");
      var checkTargetMonth = inputValue("backportCheckTargetReleaseMonth");
      if (checkTargetYear && checkTargetMonth) {
        lines.push("Target release: " + checkTargetYear + "." + checkTargetMonth);
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
    return els.contextInput.value.trim();
  }

  function buildCommandLines() {
    var workflow = selectedWorkflow();
    var operation = selectedOperation();
    if (workflow && workflow.id === "custom" && operation && operation.id === "backport-check") {
      return buildBackportCheckCommandLines();
    }
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

  function buildBackportCheckCommandLines() {
    var sourceType = inputValue("backportCheckSourceType");
    var safeBypass = inputValue("backportCheckSafeBypass");
    var lines = [
      "Commands:",
      "- command: backport.check",
      "  source_type: " + sourceType,
      "  source: " + inputValue("backportCheckSource")
    ];
    if (sourceType === "VB") {
      lines.push("  base_release_year: " + inputValue("backportCheckBaseReleaseYear"));
      lines.push("  base_release_month: " + inputValue("backportCheckBaseReleaseMonth"));
    }
    lines.push("  target_release_year: " + inputValue("backportCheckTargetReleaseYear"));
    lines.push("  target_release_month: " + inputValue("backportCheckTargetReleaseMonth"));
    lines.push("  safe_bypass: " + safeBypass);
    if (safeBypass === "Y" && inputValue("backportCheckBypassReason")) {
      lines.push("  bypass_reason: " + inputValue("backportCheckBypassReason"));
    }
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
    if (selectedModelPreset()) {
      lines.push("Codex-Model: " + selectedModelPreset().id);
    }

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
    syncLookupValuesField();
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
    syncIssueLink();
  }

  function saveLocalSettings() {
    localStorage.setItem(STORAGE_OWNER, els.ownerInput.value.trim());
    localStorage.setItem(STORAGE_REPO, els.repoInput.value.trim());
    localStorage.setItem(STORAGE_RUNNER, state.selectedRunnerId);
    localStorage.setItem(STORAGE_MODEL, state.selectedModelPresetId);
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
    if (!selectedModelPreset()) {
      throw new Error("Select a model.");
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

    if (workflow.id === "custom" && operation && operation.id === "run" && !state.selectedCommands.length && !inputValue("details")) {
      throw new Error("Add at least one command or enter additional inputs.");
    }

    validateWorkflowFields(workflow);
    if (commandBuilderEnabled(workflow)) {
      validateSelectedCommands(workflow);
    }
  }

  function validateWorkflowFields(workflow) {
    if (!workflow) {
      return;
    }

    var operation = selectedOperation();
    if (workflow.id === "custom" && operation && operation.id === "copy-person-data") {
      updateStagingUrlFromEnvironment();
      if (!inputValue("personIdentifier")) {
        throw new Error("Enter Person ID or name.");
      }
      if (!inputValue("stagingEnvironment")) {
        throw new Error("Enter Staging environment.");
      }
      if (!inputValue("stagingDbUrl")) {
        throw new Error("Enter Staging URL.");
      }
      if (!inputValue("stagingUsername")) {
        throw new Error("Enter Staging username.");
      }
      if (!inputValue("stagingPassword")) {
        throw new Error("Enter Staging password.");
      }
      var toDb = inputValue("toDb").trim();
      if (toDb !== "defaultDB" && !/^jdbc:oracle:thin:@\S+$/i.test(toDb)) {
        throw new Error("To DB must be defaultDB or a jdbc:oracle:thin:@ URL.");
      }
      return;
    }

    if (workflow.id === "custom" && operation && operation.id === "backport-check") {
      validateBackportCheckInputs();
      return;
    }

    if (workflow.id === "silver-merge") {
      validateSilverMergeInputs();
      return;
    }

    if (workflow.id === "seeddata") {
      var seedType = inputValue("seedDataType").trim();
      if (["Profile Option", "Message", "Lookup", "Value Set"].indexOf(seedType) === -1) {
        throw new Error("Seed Data Type must be Profile Option, Message, Lookup, or Value Set.");
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

      var existingBugNumber = inputValue("existingBugNumber").trim();
      if (existingBugNumber && !/^[0-9]+$/.test(existingBugNumber)) {
        throw new Error("Existing bug number must contain digits only.");
      }
      if (!existingBugNumber && !inputValue("bugDescription")) {
        throw new Error("Enter Bug description.");
      }

      var copyChoice = inputValue("copyFromStaging");
      var copyFromStaging = supportsStagingCopy(seedType) && copyChoice === "Yes";
      if (copyChoice === "Yes" && !supportsStagingCopy(seedType)) {
        throw new Error("Copy from staging is supported only for Profile Option, Lookup, and Value Set.");
      }
      if (copyFromStaging) {
        updateStagingUrlFromEnvironment();
        if (!inputValue("stagingEnvironment")) {
          throw new Error("Enter Staging environment.");
        }
        if (!inputValue("stagingDbUrl")) {
          throw new Error("Enter Staging URL.");
        }
        if (!inputValue("stagingUsername")) {
          throw new Error("Enter Staging username.");
        }
        if (!inputValue("stagingPassword")) {
          throw new Error("Enter Staging password.");
        }
        if (!inputValue("stagingKey")) {
          throw new Error("Enter " + stagingKeyLabelForType(seedType) + ".");
        }
        return;
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
      } else if (seedType === "Lookup") {
        var lookupLines = lookupValueLinesFromRows();
        var lookupValuesInput = document.getElementById("lookupValuesInput");
        if (lookupValuesInput) {
          lookupValuesInput.value = lookupLines.join("\n");
        }
        if (!inputValue("lookupType")) {
          throw new Error("Enter Lookup type.");
        }
        if (!inputValue("lookupMeaning")) {
          throw new Error("Enter Lookup meaning.");
        }
        if (!inputValue("lookupDescription")) {
          throw new Error("Enter Lookup description.");
        }
        if (!lookupLines.length) {
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

  function validateBackportCheckInputs() {
    var sourceType = inputValue("backportCheckSourceType").trim();
    if (["ADE", "VB"].indexOf(sourceType) === -1) {
      throw new Error("Source type must be ADE or VB.");
    }
    if (!inputValue("backportCheckSource")) {
      throw new Error("Enter Source bug / transaction / MR.");
    }
    if (sourceType === "VB") {
      if (["26", "27", "28", "29", "30"].indexOf(inputValue("backportCheckBaseReleaseYear")) === -1) {
        throw new Error("Base release year must be 26, 27, 28, 29, or 30.");
      }
      if (["01", "04", "07", "10"].indexOf(inputValue("backportCheckBaseReleaseMonth")) === -1) {
        throw new Error("Base release month must be 01, 04, 07, or 10.");
      }
    }
    if (["26", "27", "28", "29", "30"].indexOf(inputValue("backportCheckTargetReleaseYear")) === -1) {
      throw new Error("Target release year must be 26, 27, 28, 29, or 30.");
    }
    if (["01", "04", "07", "10"].indexOf(inputValue("backportCheckTargetReleaseMonth")) === -1) {
      throw new Error("Target release month must be 01, 04, 07, or 10.");
    }
  }

  function validateSilverMergeInputs() {
    var text = inputValue("bronzeBugs").trim();
    if (!text) {
      throw new Error("Enter Bronze bugs.");
    }
    var parts = text.split(",");
    parts.forEach(function (part) {
      var bug = part.trim();
      if (!bug) {
        throw new Error("Bronze bugs must be comma-separated bug numbers.");
      }
      if (!/^[0-9]+$/.test(bug)) {
        throw new Error("Bronze bugs must contain digits only.");
      }
    });
    var silverBug = inputValue("silverBugNumber").trim();
    if (silverBug && !/^[0-9]+$/.test(silverBug)) {
      throw new Error("Silver bug number must contain digits only.");
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
          if (!(param.sequence_ref && valueHasSequenceReference(value)) && !regex.test(value)) {
            throw new Error((param.label || name) + " for " + (spec.label || spec.id) + " is invalid.");
          }
        }
        if (name === "view" && value && !valueHasSequenceReference(value)) {
          views[value] = true;
        }
      });
    });
    if (Object.keys(views).length > 1) {
      throw new Error("Use one ADE view per trigger.");
    }
  }

  function buildNewIssueUrl(owner, repo, title, body) {
    var params = new URLSearchParams();
    params.set("title", title);
    params.set("body", body);
    params.set("labels", queuedLabel());
    return "https://github.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/issues/new?" + params.toString();
  }

  function buildCurrentIssueUrl() {
    var owner;
    var repo;
    var title;
    var body;

    validateForm();
    owner = els.ownerInput.value.trim();
    repo = els.repoInput.value.trim();
    title = buildTitle();
    body = buildIssueBody();
    return buildNewIssueUrl(owner, repo, title, body);
  }

  function syncIssueLink() {
    try {
      els.submitLink.href = buildCurrentIssueUrl();
      els.submitLink.removeAttribute("aria-disabled");
    } catch (error) {
      els.submitLink.href = "#";
      els.submitLink.setAttribute("aria-disabled", "true");
    }
  }

  function openIssueLink(event) {
    try {
      els.submitLink.href = buildCurrentIssueUrl();
      setStatus("Opened", "ok");
      showResult("GitHub will open with the issue prefilled. Submit it there.", false);
    } catch (error) {
      event.preventDefault();
      showResult(error.message, true);
      setStatus("Needs input", "error");
    }
  }

  function copyIssueUrl() {
    var url;

    try {
      url = buildCurrentIssueUrl();
    } catch (error) {
      showResult(error.message, true);
      setStatus("Needs input", "error");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showResult("Copied the GitHub issue URL. Paste it into the Safari address bar to keep it in the browser.", false);
      }).catch(function () {
        showManualIssueUrl(url);
      });
    } else {
      showManualIssueUrl(url);
    }
  }

  function showManualIssueUrl(url) {
    showResult(
      'Copy this URL manually:<br><input class="manual-url-input" readonly value="' + escapeHtml(url) + '">',
      false
    );
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
