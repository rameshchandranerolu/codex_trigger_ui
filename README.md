# Codex Trigger UI

Static browser UI for creating Codex trigger issues.

This public UI repo should contain only these files:

```text
index.html
app.js
styles.css
projects.json
.nojekyll
README.md
```

The page creates issues in the private `codex_automation` trigger repository.
It does not contain the VM runner, BugDB helpers, `config.json`, OAuth tokens,
or local ALM paths.

Use a fine-grained GitHub token scoped only to the private trigger repository,
with Issues read/write permission. If you use "Remember token", it is stored
only in that browser's local storage.

Before making this repo public, review `projects.json` and keep project names,
aliases, and descriptions non-sensitive.
