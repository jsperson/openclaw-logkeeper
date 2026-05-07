# openclaw-scribe

Turn-by-turn conversation logger for [OpenClaw](https://openclaw.ai). Appends every completed agent exchange to daily markdown files — across Discord, TUI, webchat, cron, and any other surface — regardless of which model is running.

Unlike the built-in `session-memory` hook (which saves a snapshot only when you issue `/new` or `/reset`), Scribe writes continuously: one entry per turn, every turn, to a configurable directory.

Output is plain markdown, compatible with [QMD](https://github.com/openclaw/qmd) and other local search tools.

## Install

**From ClawHub (recommended):**

```bash
openclaw plugins install clawhub:openclaw-scribe
```

**From npm:**

```bash
npm install -g openclaw-scribe
openclaw plugins install ./node_modules/openclaw-scribe
```

**From source:**

```bash
git clone https://github.com/jsperson/openclaw-scribe.git
cd openclaw-scribe
npm install && npm run build
openclaw plugins install ./
```

## Required configuration

Scribe requires two things in your `~/.openclaw/openclaw.json`:

**1. Grant conversation access** (required for `agent_end` hook to fire):

```json
{
  "plugins": {
    "entries": {
      "openclaw-scribe": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true
        },
        "config": {
          "logDir": "~/your/log/directory"
        }
      }
    }
  }
}
```

Without `allowConversationAccess: true`, the hook is silently blocked by OpenClaw and no logs will be written.

**2. Set `logDir`** — the directory where daily files are written. Supports `~/` expansion. This field is required; the plugin will not start without it.

**Verify it's working:** Send a message in any channel, then check your `logDir` for a file named `YYYY-MM-DD-discord.md` (or `YYYY-MM-DD-tui.md` for TUI sessions). It should appear within 30 seconds.

## Configuration reference

All options go under `plugins.entries.openclaw-scribe.config` in `openclaw.json`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logDir` | `string` | **required** | Directory for log files. Supports `~/`. |
| `filename` | `string` | `"{date}-{channel}.md"` | Filename template. Variables: `{date}` (YYYY-MM-DD), `{channel}` (provider name or `tui`), `{agent}` (agentId). |
| `channels` | `object` | `{}` | Per-channel filename overrides. Key: provider name (`discord`, `telegram`, etc.) or `tui`. Value: filename template. |
| `userAlias` | `string` | `"user"` | Speaker label for the user. |
| `assistantAlias` | `string` | `"assistant"` | Fallback label for the assistant. Scribe first reads the agent name from `IDENTITY.md` — set this only if you want to override that. |
| `maxLength` | `integer` | `4000` | Maximum characters written for the assistant response. `0` = unlimited. Truncated entries include a note with the original character count. |
| `includeCron` | `boolean` | `false` | Include cron/heartbeat turns in logs. |
| `metadata` | `boolean` | `false` | Append a metadata line after the timestamp: `· {model} · {input}↑ {output}↓`. Silently omitted if model or token data is unavailable. |

### Full example

```json
{
  "plugins": {
    "entries": {
      "openclaw-scribe": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true
        },
        "config": {
          "logDir": "~/clawcode/memory",
          "filename": "{date}-{channel}.md",
          "channels": {
            "discord": "{date}-discord.md",
            "tui": "{date}-tui.md"
          },
          "userAlias": "scott",
          "maxLength": 4000,
          "includeCron": false,
          "metadata": false
        }
      }
    }
  }
}
```

### QMD integration

If you use QMD to search your logs, point `logDir` at the directory QMD's `daily-logs` collection scans. QMD's `**/*.md` pattern picks up any filename suffix automatically — no QMD config changes needed.

## Example output

**`~/clawcode/memory/2026-05-07-discord.md`:**

```markdown
# 2026-05-07

### 14:32
**scott:** What's on my calendar today?

**jomama:** You have three items: standup at 09:30, PT at 14:00, and Jason's soccer game at 18:00.

### 15:01
**scott:** Set a reminder to call Mom at 19:00.

**jomama:** Done — reminder added to Apple Reminders.
```

**`~/clawcode/memory/2026-05-07-tui.md`:**

```markdown
# 2026-05-07

### 09:15
**scott:** Show me last week's summary.

**jomama:** Here's what happened last week: ...
```

With `metadata: true`:

```markdown
### 14:32
· claude-opus-4-7 · 312↑ 87↓
**scott:** What's on my calendar today?

**jomama:** You have three items: ...
```

## How it works

Scribe uses OpenClaw's `agent_end` plugin hook, which fires after every completed agent turn — regardless of surface, model, or channel. This makes it:

- **Model-agnostic**: works with Claude, Qwen, local models, anything OpenClaw supports
- **Surface-complete**: Discord, TUI, webchat, cron, and future channels all produce logs
- **Continuous**: one entry per turn, no manual `/reset` required

The assistant's display name is read from your workspace `IDENTITY.md` automatically (`- Name: YourAgentName`).

## Compatibility

- OpenClaw 2026.x+ (plugin API `>=2026.3.24-beta.2`)
- Node.js 22+

## Contributing

Bug reports and PRs welcome at [github.com/jsperson/openclaw-scribe](https://github.com/jsperson/openclaw-scribe/issues).

## License

MIT © Scott Person
