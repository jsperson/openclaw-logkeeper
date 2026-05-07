# Changelog

All notable changes to `openclaw-logkeeper` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-05-07

### Added

- Startup warning when `allowConversationAccess` is not set in `openclaw.json`. Without
  this setting the `agent_end` hook is silently blocked by the gateway and nothing gets
  logged. The warning prints to gateway stderr with exact instructions for fixing the config.

### Fixed

- Discord envelope stripping. The Discord metadata envelope (Conversation info block,
  Sender block, EXTERNAL_UNTRUSTED_CONTENT section) is now stripped correctly, leaving
  only the actual user message text in the log.

## [1.0.3] - 2026-05-07

### Fixed

- Strip OpenClaw's injected system envelope from user messages before logging. The envelope
  (`System: [...]`, `Sender (untrusted metadata): ...`, bracketed timestamp) is metadata
  added by the gateway — only the actual user text is now written to the log.

## [1.0.0] - 2026-05-07

### Added

- Initial release.
- Turn-by-turn conversation logging via the `agent_end` plugin hook.
- Covers all OpenClaw surfaces: Discord, TUI, webchat, cron.
- Configurable `logDir`, filename templates with `{date}`, `{channel}`, `{agent}` variables.
- Per-channel filename overrides via `channels` map.
- Configurable speaker aliases (`userAlias`, `assistantAlias`).
- Assistant alias auto-resolved from workspace `IDENTITY.md` via `resolveAgentIdentity`.
- Configurable response truncation (`maxLength`, default 4000).
- Optional metadata line with model name and token counts (`metadata: true`).
- Cron/heartbeat turn exclusion by default (`includeCron: false`).
- Atomic file creation using `flag: 'ax'` to prevent duplicate headers.
- Published to npm as `openclaw-logkeeper` and submitted to ClawHub.
