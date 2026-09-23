# Codex Trigger UI

Static browser UI for composing Codex trigger issues and chatting through a
private GitHub repository.

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
GitHub personal access tokens, or local ALM paths. The Triggers tab does not call
the GitHub API or need a token. The separate Chat tab uses a user-supplied token
as described below.

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

## Chat tab

Open `index.html#chat`, select the runner, and connect using a **fine-grained
GitHub personal access token**. Select only the private trigger repository and
grant repository **Issues: read and write** (Metadata read is implicit). Honor
any organization token approval requirements. The token is sent only in the
Authorization header to `https://api.github.com`; it is never saved in browser
storage, URLs, issues, or source files. Disconnect/reload clears it. VM usernames
and passwords are not accepted: GitHub Pages cannot authenticate against an
unreachable VM, and OS passwords must not be relayed through GitHub issues.

Choose a work context and model, then send a message. Each conversation is a
private issue marked `<!-- codex-chat:v1 -->`, using the existing `custom`
workflow and `custom` operation. Messages after the first become comments with
the `Codex follow-up:` prefix; adding `followup-codex` queues them for the current
runner. The token's user must be in the VM runner's `github.allowed_authors` when
that list is configured. Connect verifies repository visibility and access;
write permission is checked by GitHub when a message is sent.

This is a chat interface over the **existing runner**, not a replacement worker
or Codex Remote. Existing session-resume, fresh-session, approval, sandbox, and
workflow policies still apply. The page waits for the current run to finish
before accepting another message; it does not interrupt or steer a running
Codex turn. Replies use readable plain text so untrusted issue HTML cannot run
inside the page. Full GitHub Markdown is available through “Open in GitHub”.

History and replies refresh every 15 seconds while Chat is visible. Runner
pickup depends on its own polling interval. Labels show the last reported
state, not a live VM health check. Older conversations can be loaded separately;
comment history is paginated. Disconnect clears loaded conversations and drafts
from the page but does not delete issues or stop work on the VM.

Interrupted sends preserve a delivery marker in memory. **Retry delivery** checks
for the existing issue/comment before posting again and retries a failed queue
label separately. After a reload, check the conversation in GitHub before
resending because the in-memory delivery record has been cleared. Browser tabs
and external GitHub clients do not share a submission lock; avoid submitting
simultaneous requests to the same conversation from different clients.

Optional `github.chat.labels` in `projects.json` can override `queued`, `running`,
`done`, `failed`, `input`, and `followup` to match the VM configuration. Defaults
are `codex:queued`, `codex:running`, `codex:done`, `codex:failed`, `reply-user`, and
`followup-codex`. The runner must use the standard `Codex follow-up:` marker.

Publish the new Chat assets together with `index.html`; existing Triggers assets
are still required. No VM runner restart is needed for this UI-only change.
From the private automation repository, the existing export script commits and
pushes the console. Its optional third argument `chat` publishes only the Chat
assets, index, and README while retaining the destination's workflow configuration:

```bash
./scripts/export_trigger_ui.sh /path/to/console-checkout "Publish Chat tab" chat
```

Omit `chat` to export the full console, including the Chat assets.

Run the transport regression checks from the repository root:

```bash
node --test tests/test_chat_api.js
python3.11 -m unittest discover -s tests -p test_chat_runner_contract.py -v
```

Browser tests use Playwright with simulated GitHub API responses; they never
create live issues. With Playwright and Chromium installed:

```bash
node --test tests/test_chat_browser.js
```

`PLAYWRIGHT_MODULE` and `CHAT_BROWSER_EXECUTABLE` can select existing installations.
