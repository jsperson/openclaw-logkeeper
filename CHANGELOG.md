# Changelog

All notable changes to `openclaw-scribe` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Published to npm as `openclaw-scribe` and submitted to ClawHub.
