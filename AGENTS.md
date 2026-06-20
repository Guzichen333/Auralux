# Repository Guidelines

## Project Structure & Module Organization
`src/main/` contains the Electron main process in TypeScript, organized around `controllers/`, `services/`, `core/`, and `utils/`. `src/renderer/` contains the Vite renderer; most UI code lives in `src/renderer/src/js/`, with styles in `src/renderer/src/styles/` and assets in `src/renderer/src/assets/`. `native/` is the Rust N-API audio engine. `scripts/` holds build helpers, `docs/` stores documentation, `build/` contains packaging assets, and `test-files/` is used for local media fixtures.

## Build, Test, and Development Commands
- `npm install && npm run install:renderer && npm run install:rs`: install root, renderer, and native dependencies.
- `pip install -r requirements.txt`: install Python tooling used by `src/main/metadata_editor.py`.
- `npm run dev`: build renderer, Rust, and main-process code, then launch Electron.
- `npm run dev:renderer`: run the renderer only with Vite for UI work.
- `npm run build`: produce the full packaged app.
- `npm run build:rs` and `npm run build:python`: rebuild only the native audio module or Python helper.
- `cd src/renderer && npm run lint`: lint renderer JavaScript.

## Coding Style & Naming Conventions
Follow the style already present in each area instead of reformatting unrelated files. Main-process TypeScript uses 4-space indentation, semicolons, `PascalCase` classes such as `AppController.ts`, and `camelCase` methods. Renderer components are also `PascalCase`, while shared helpers stay `camelCase`. Keep import aliases such as `@components`, `@services`, and `@utils` intact. Use concise log messages and keep the emoji-prefixed logging convention.

## Testing Guidelines
There is no single automated test suite at the root today. For UI or playback changes, run `npm run dev` and smoke-test library scan, playback, lyrics, settings, and plugin loading. Put reusable media fixtures in `test-files/`. If you add renderer code, run `cd src/renderer && npm run lint` before opening a PR. Include manual verification steps when automated coverage is not practical.

## Commit & Pull Request Guidelines
Recent history uses lowercase prefixes such as `feature:`, `refactor:`, and `docs:`. Keep commit subjects short, imperative, and scoped to one change. PRs should explain user-visible impact, list commands or manual checks performed, link related issues, and include screenshots for renderer or desktop UI changes. Call out changes in `native/`, packaging, or preload/API boundaries explicitly because they affect release builds and security review.

## Security & Integration Notes
Do not bypass the preload boundary with direct renderer access to Node APIs. Reuse existing main-process utilities such as `src/main/utils/pathSecurity.ts` for filesystem-facing work, and keep native or Python changes isolated to their build paths.

<!-- gitnexus:start -->
# GitNexus 鈥?Code Intelligence

This project is indexed by GitNexus as **MusicBox** (13459 symbols, 40565 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root 鈥?it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash 鈫?`npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "dev"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol 鈥?callers, callees, which execution flows it participates in 鈥?use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace 鈥?use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MusicBox/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MusicBox/clusters` | All functional areas |
| `gitnexus://repo/MusicBox/processes` | All execution flows |
| `gitnexus://repo/MusicBox/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
