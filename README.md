# token-stats — Hermes Desktop plugin

Token analytics for Hermes Desktop, built on the official plugin SDK
(`@hermes/plugin-sdk`) — no Hermes source modifications.

## What it shows

- **Status bar chip** (`statusBar.right`) — the FOCUSED CHAT SESSION's usage,
  rendered inline (no tooltip):
  `⚡ ↑50,000 ↓12,345 · $0.1234 · 7 calls · 43 tok/s · ctx 84,000/200,000`
  (each segment appears only when the host reports it). Data source:
  `host.state.focusedUsage` (the backend's `UsageStats` for the focused
  session).
- **Right sidebar panel** (`panes` area, docked beside the file browser as a
  FILES | TOKEN ANALYTICS tab strip, managed by the same right-sidebar
  toggle):
  - **Focused Session** — API calls, input/output/total tokens, decode
    throughput, cache hit %, compressions, context usage, cost.
  - **Recent Turns** — per-turn table (model, in/out, tok/s, TTFT, duration)
    from the gateway event tap, last 50 turns, persisted across restarts.

By design there is **no** cross-session/cross-model cumulative: the
statistics object is the focused session, plus its recent turns.

## Package layout (Agent Plugins v1 portable package)

```
token-stats/
├── plugin.json        # portable manifest (Agent Plugins v1)
├── desktop/
│   └── plugin.js      # the desktop runtime plugin
└── README.md
```

 ## Install

 This package is **desktop-only**: `plugin.json` is a portable Agent
 Plugins v1 manifest, but the package carries no agent-side runtime —
 all of its behavior lives in `desktop/plugin.js`. The desktop app loads
 desktop plugins from the standalone door: a `<name>/plugin.js` folder
 under `<hermes home>/desktop-plugins/`. Install there:

 - Windows:   `%LOCALAPPDATA%\hermes\desktop-plugins\token-stats\plugin.js`
 - macOS/Linux: `~/.hermes/desktop-plugins/token-stats/plugin.js`

 The door is file-watched and hot-reloaded, so the running app picks the
 entry up without a restart.

 Run a sanity pass before installing (expects "Validation passed."):

 ```
 hermes plugins validate <path-to-this-folder>
 ```

 **Done when** the ⚡ chip is visible in the status bar and the
 TOKEN ANALYTICS tab in the right sidebar (restart Hermes Desktop if
 your build loads the door only at startup).

 > Keep exactly one entry per plugin id: a folder in `plugins/` named
 > `token-stats` is the same plugin — when switching placement, delete
 > the previous entry first, or the loader loads one copy and logs an
 > error row for the other.

 ### From Git (recommended for updates)

 Push this folder to a Git repository (e.g. GitHub), then in Hermes Desktop
 open **Capabilities → Plugins → Install from Git** and enter
 `owner/repo` or the repo URL. Alternatively from a terminal:

 ```
 hermes plugins install <git-url-or-owner/repo>
 ```

 The desktop half lands in `<hermes home>/desktop-plugins/token-stats/`
 stamped with a `.hermes-package.json` package marker (immediately from
 the Desktop UI; at next launch when installed via the CLI), so
 `hermes plugins update token-stats` keeps it in sync with the repo.
 Same completion check as above.

 ### Full package into the agent plugins root (alternate)

 Copy the whole `token-stats/` folder to `<hermes home>/plugins/token-stats`
 (Windows: `%LOCALAPPDATA%\hermes\plugins\token-stats`). The app
 materializes `desktop/plugin.js` into the door at next launch, and the
 package additionally registers on the agent side as a portable plugin
 (a `hermes plugins list` row, disabled by default; `hermes plugins
 enable token-stats` turns that row on). The door — and the chip —
 appear after the restart; clean up with `hermes plugins remove
 token-stats`.

 ## Uninstall

 - Door install (local or Git): delete the `desktop-plugins\token-stats`
   folder (its persisted turn history lives in the plugin storage and is
   dropped with the folder's registrations).
 - Agent-root package: `hermes plugins remove token-stats`; the app
   prunes the materialized door copy at next launch.

## Notes

- Requires a recent Hermes Desktop build that ships the `panes` /
  `statusBar.*` contribution areas and `host.state.focusedUsage`.
- The panel's per-turn table is event-derived and only fills up as you
  chat; the session section is live host data.
- Verified against the desktop loader contract: import allowlist
  (`@hermes/plugin-sdk`, `react/jsx-runtime`), contribution shapes, and the
  static admission lint (`hermes plugins validate`).
