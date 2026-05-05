# codex-attention

Native macOS notifications for Codex CLI attention events.

> Built with OpenAI Codex.

`codex-attention` installs Codex hooks that notify you when Codex needs permission approval and, optionally, when a turn finishes. Clicking a notification can activate your configured terminal app.

## Requirements

- macOS
- Node.js 20+
- Codex CLI with hooks enabled
- `terminal-notifier`

The installer can install `terminal-notifier` with Homebrew when you approve it. It does not install Homebrew itself.

## Install

Run the installer:

```bash
npx codex-attention@latest install
```

If it asks to install `terminal-notifier`, answer `y`. Then close and reopen any running Codex CLI sessions so hooks reload.

```bash
npx codex-attention@latest doctor --send-test
```

Useful install options:

- `--yes`: install `terminal-notifier` with Homebrew without prompting.
- `--no-install-deps`: skip dependency installation and print the manual fix.
- `--activate-bundle-id <id>`: choose the app opened when you click a notification. Common values: `com.apple.Terminal`, `com.googlecode.iterm2`.

## Uninstall

```bash
npx codex-attention@latest uninstall
```

Uninstall removes only the managed hook commands and hook script. It leaves `~/.codex/codex-attention.json` and `config.toml` in place for safety.

## Configuration

The user config lives at:

```bash
~/.codex/codex-attention.json
```

Useful fields:

- `events.permissionRequest`: notify when Codex needs approval.
- `events.stop`: notify when a turn finishes.
- `notifier.activateBundleId`: terminal app to activate on click.
- `behavior.notifyOnQuestionOnlyForStop`: notify on `Stop` only when the last assistant message looks like a question.
- `logging.enabled`: write hook diagnostics.

## Limitations

- macOS only.
- Exact terminal tab or pane targeting is not supported.
- Notifications can be suppressed by macOS Focus or notification permissions.
- This package does not auto-approve Codex permissions.
