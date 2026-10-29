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

Separate **Model** and **Effort** selectors write the existing `Codex-Model: <preset-id>`
into the issue body. Current VM defaults to **gpt-6.1-sol + high**. Existing issue
presets, including `cheap-default` and the explicit GPT-5.5 Priority choice, remain supported.

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
session. The uPatch label action asks only for a complete FusionApps label and reads
the target database from `/scratch/<user>/codeshare/dbdetails.txt`. Label completion
requires an explicit successful uPatch request summary as well as exit code zero.
After a reported request failure or nonzero client exit, the shared helper checks
that the patch queue is idle, gracefully restarts uPatch, then retries the same
label once. Each client starts with a clean `SHLVL` to avoid shell-depth warnings
corrupting downloader JSON. Active or unreadable queues and failed restarts stop
recovery; missing request outcomes are reported as unconfirmed. Direct helper
callers can pass `--no-restart-retry` to disable recovery. PMC defaults to
cloud submission (`run_in_cloud: Y`); select N for the existing local PMC flow.
Cloud PMC supports Bronze, Silver, Gold and V2MIB, saves the transaction, and reports
submission separately from validation completion. With `submit_mergereq: Y` (default N),
the script polls BugDB every minute while queued and every 15 minutes after PMC
starts, for up to five hours, checks a fresh overall PASS
report for that submission and verifies the transaction has not changed before the
normal MergeReq preflight/submission. Monitor state is printed and retained for
`--cloud-pmc-state <file> --submit-mergereq` resume without another cloud submission.
Other BugDB and
ADE requests can still use `Workflow: custom`.
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
plain-English request. No Project selection is needed: Codex starts in the
automation workspace and receives the VM workspace map, then selects relevant
ADE/VB/repository references from your request. **Project Work → Inspect, Fix, Test, or Custom Project
Task** and **VB** also use direct Codex conversations when no structured
`Commands:` sequence is supplied. Codex can consult runner guides as needed and
returns its answer or question directly, without runner planning or completion
audits. Replies continue in the same Codex session: comment on the GitHub issue
with `Codex follow-up:` and add the `followup-codex` label.

ADE Actions, Backport, SeedData, Silver Merge, Copy Person Data, Backport check,
and explicit command sequences retain their specialized execution paths.
RAG Study uses its separate RAG runner. The direct conversation update is active
on Current VM; other VMs need the matching runner code deployed.

## Model and reasoning effort

On Current VM, `models.json` supplies recent models and the effort values each
supports, including low, medium, high, xhigh, max, and ultra when available.
The default is `gpt-6.1-sol-high`: model `gpt-6.1-sol` and effort `high`.
Changing Model updates Effort to show only supported combinations. Model, effort,
workflow, and project selections persist across reloads. Switching runners uses
that runner's own model default; Mumbai and RAG retain their existing choices.

The page fetches the published catalog on load. **Refresh models** reloads that
published catalog and preserves the draft and any still-valid selection. If the
catalog cannot load, Current VM submissions wait for a successful refresh;
there is no silent downgrade to another model. Refresh failures retain existing
choices and show friendly retry guidance.

The catalog is a public, credential-free snapshot generated on the VM, rather
than a browser connection to the VM. To update the snapshot from native Codex,
run the sync command below, then publish the console. The sync preserves the
previous catalog if the requested default is unavailable.

Refresh the catalog in the private runner repo with
`python3 scripts/sync_codex_models.py`, then publish the console. The runner
validates the selected model and effort against its native catalog before
execution and does not silently substitute another model.

## Publishing

From the private automation repository, the existing export script commits and
pushes the console. The `console` export mode updates the page, application, model list, README,
and inactive Chat assets while preserving deployed workflow/command configuration:

```bash
./scripts/export_trigger_ui.sh /path/to/console-checkout "Update direct Codex console" console
```

Omit the third argument to export the full console.
