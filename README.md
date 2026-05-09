# codex-attention

Native macOS notifications for Codex CLI attention events.

> Built with OpenAI Codex.

`codex-attention` notifies you when Codex needs approval, finishes a turn, or appears to be waiting for your reply. Notifications include the project name and safe, redacted context so you can decide whether to switch back.

## Requirements

- macOS
- Node.js 20+
- Codex CLI with hooks enabled
- `terminal-notifier` (`install` can add it with Homebrew)

## Install

```bash
npx codex-attention@latest install
```

The installer sets up the hook, creates `~/.codex/codex-attention.json`, detects your terminal app, and asks which sounds to use.

Restart any running Codex CLI sessions after install.

Verify:

```bash
npx codex-attention@latest doctor --send-test
```

Useful install options:

```bash
npx codex-attention@latest install --yes
npx codex-attention@latest install --dry-run
npx codex-attention@latest install --activate-bundle-id com.apple.Terminal
```

## What It Shows

Approval request:

```text
Codex - my-api
Approval needed
Bash: npm install express
```

Question / turn complete:

```text
Codex - my-api
Waiting for reply
Should I also add unit tests?
```

Tool input is redacted by default for common secrets. Set `behavior.showToolInput=false` to hide tool input entirely.

## Common Commands

```bash
codex-attention status
codex-attention config show
codex-attention config set notifier.stopSound Basso
codex-attention config preset minimal
codex-attention preview approval --tool Bash --input "npm test"
codex-attention log -n 20
codex-attention uninstall
```

Presets:

- `minimal`: approval notifications only.
- `balanced`: approvals and turn completions.
- `verbose`: every supported notification, no cooldown.

## Slack / Discord Webhook

Enable webhooks:

```bash
codex-attention config set notifier.webhookEnabled true
```

Slack:

```bash
codex-attention config set notifier.webhookFormat slack
codex-attention config set notifier.webhookUrl "https://hooks.slack.com/services/..."
```

Discord:

```bash
codex-attention config set notifier.webhookFormat discord
codex-attention config set notifier.webhookUrl "https://discord.com/api/webhooks/..."
```

Choose when webhooks are sent:

```bash
codex-attention config set notifier.webhookWhen idle
codex-attention config set notifier.webhookIdleSeconds 120
```

Webhook modes:

- `always`: send webhook whenever a local notification is sent.
- `idle`: send webhook only if the Mac is already idle for `webhookIdleSeconds` when the event fires.
- `never`: keep the webhook URL configured but do not send webhooks.

`idle` does not send a delayed webhook later; it checks idle time only when Codex fires the hook.

Test webhook delivery:

```bash
codex-attention doctor --send-test
```

`doctor --send-test` sends a deliberate test webhook even when `webhookWhen=idle`.

## Configuration

Config file:

```bash
~/.codex/codex-attention.json
```

Useful settings:

| Key | Default | Meaning |
| --- | --- | --- |
| `events.permissionRequest` | `true` | Notify when Codex asks for approval. |
| `events.stop` | `true` | Notify when a Codex turn finishes. |
| `notifier.permissionSound` | `Basso` | Sound for approval notifications. |
| `notifier.stopSound` | `Ping` | Sound for turn-completion notifications. |
| `notifier.webhookWhen` | `always` | `always`, `idle`, or `never`. |
| `notifier.webhookIdleSeconds` | `120` | Idle threshold for webhook idle mode. |
| `behavior.cooldownSeconds` | `3` | Throttle repeated non-approval notifications. |
| `behavior.showToolInput` | `true` | Show redacted tool summaries. |

Approval requests are never cooldown-throttled.

## Rules

Suppress or customize specific tools:

```json
{
  "behavior": {
    "rules": [
      { "event": "PermissionRequest", "toolName": "apply_patch", "notify": false },
      { "event": "PermissionRequest", "toolName": "Bash", "sound": "Glass" }
    ]
  }
}
```

## Notes

- macOS Focus or notification permissions can suppress local notifications.
- Clicking a notification can activate your terminal app, but not a specific tab or pane.
- Webhooks send notification text off-device; leave them disabled if that is sensitive.
- This tool only notifies. It never auto-approves Codex permissions.
