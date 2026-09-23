# Codex Trigger UI

Static browser UI for composing Codex trigger issues in a private GitHub repository.

This public UI repo should contain only these files:

```text
index.html
app.js
styles.css
chat.js
chat-api.js
chat.css
projects.json
commands.json
.nojekyll
README.md
```

The page opens GitHub's new-issue screen with the title, body, and queued label
requested for the private `codex_automation` trigger repository. The user signs
in to GitHub normally and submits the issue there. If GitHub does not preselect
the label in the issue screen, the generated `Queue: codex:queued` body line is
still enough for the VM runner to pick up the trigger after the runner update is
deployed.

The Model selector writes `Codex-Model: <preset-id>` into the issue body. The
default `cheap-default` preset uses GPT-5.6 Sol with medium reasoning and the current instant service tier, while
`gpt-5.5-priority` is an explicit Pro preset for difficult debugging or code
logic checks.

It does not contain the VM runner, BugDB helpers, `config.json`, OAuth tokens,
GitHub personal access tokens, or local ALM paths. The trigger console does not
call the GitHub API or need a token.

Before making this repo public, review `projects.json` and keep workflow names,
project aliases, and descriptions non-sensitive.

The UI is workflow-first. `ADE Actions` renders the same conditional inputs as
the terminal `run_ade_action.sh` menu and generates a validated
`ade.run-action-workflow` command. Structured requests execute deterministically
in the private parent runner; the model is reserved for free-form parsing and
response wording. The BIP option defaults to export, accepts multiple mapped Workflow
Notifications reports/data models, and processes them sequentially in one ADE view
session. Other BugDB and ADE requests can still use `Workflow: custom`.
`Project:` is generated for workflows that require a selected local context.
`commands.json` drives optional structured command entries that the private
runner validates before execution.
Keep the private runner repo's `config.json` mapped with matching workflows and
run-project aliases before using newly added workflow buttons.

## Direct Codex conversations

The Chat tab is disabled. Existing conversations remain available as GitHub
issues; old `#chat` links display the trigger builder. Chat scripts are retained
as inactive assets and are not loaded by the page.

On **Current VM**, select **Custom Commands → Custom Instructions** for a
plain-English request. **Project Work → Inspect, Fix, Test, or Custom Project
Task** and **VB** also use direct Codex conversations when no structured
`Commands:` sequence is supplied. Codex can consult runner guides as needed and
returns its answer or question directly, without runner planning or completion
audits. Replies continue in the same Codex session: comment on the GitHub issue
with `Codex follow-up:` and add the `followup-codex` label.

ADE Actions, Backport, SeedData, Silver Merge, Copy Person Data, Backport check,
and explicit command sequences retain their specialized execution paths.
RAG Study uses its separate RAG runner. The direct conversation update is active
on Current VM; other VMs need the matching runner code deployed.

## Publishing

From the private automation repository, the existing export script commits and
pushes the console. The legacy `chat` export mode updates the page, README, and
inactive Chat assets while preserving the deployed trigger configuration:

```bash
./scripts/export_trigger_ui.sh /path/to/console-checkout "Disable Chat tab" chat
```

Omit `chat` to export the full console.
