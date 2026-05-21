# Codex Trigger UI

Static browser UI for composing Codex trigger issues.

This public UI repo should contain only these files:

```text
index.html
app.js
styles.css
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

It does not contain the VM runner, BugDB helpers, `config.json`, OAuth tokens,
GitHub personal access tokens, or local ALM paths. The browser UI does not call
the GitHub API and does not ask users to paste a token.

Before making this repo public, review `projects.json` and keep workflow names,
project aliases, and descriptions non-sensitive.

The UI is workflow-first. BugDB and ADE requests are submitted through
`Workflow: custom` with a selected run project, so they can be typed naturally
in the Additional inputs box. `Project:` is generated for workflows that require
a selected local context. `commands.json` drives optional structured command
entries that the private runner validates before execution.
Keep the private runner repo's `config.json` mapped with matching workflows and
run-project aliases before using newly added workflow buttons.
