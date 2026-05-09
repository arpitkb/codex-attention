# Changelog

## 2.0.0

- **Notifications:** richer project-aware messages, redacted tool summaries, better question detection, per-event sounds, and cooldown that never suppresses approvals.
- **Webhooks:** Slack, Discord, and raw webhook support with `always`, `idle`, and `never` delivery modes.
- **CLI:** added `config`, `status`, `log`, `preview`, presets, stronger `doctor`, and installer `--dry-run`.
- **Safety:** `showToolInput=false` hides tool input, common secrets are redacted, and config commands work before install.
- **Breaking:** `redactToolInput` became `showToolInput`, question detection defaults to `enhanced`, templates changed, and logs default to JSON-lines.
- **Migration:** old configs still load; use `config reset` for all defaults or `config set <key> <value>` for specific changes.

## 0.2.0

- Initial macOS release with `PermissionRequest` / `Stop` notifications and `install`, `doctor`, `uninstall`.
