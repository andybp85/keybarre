# Design: Electron Music-App Keyboard Shortcuts (Lib + Skill)

Date: 2026-08-10
Status: Approved pending spec review
Revision: 2 — keymap rebuilt from an audit of the three existing apps

## Purpose

Andy has three Electron music apps, all vanilla TS/JS with an Elm-style architecture:

- **carter-drummer** — jazz drum accompaniment over iReal Pro charts.
- **practice-player** — audio practice tool: waveform, speed change, loops, markers, bass-stem isolation.
- **tempo-head-tracking-poc** — groove follower: live tempo tracking, click track, gaze cues.

Each app wires its own keyboard shortcuts. The keys mostly agree, and the wiring code is duplicated. This project defines one standard scheme and ships it in two parts:

- **A library** that holds the keymap data and the shared behavior.
- **A skill** that tells Claude when and how to apply the library.

Success: every app answers to the same keys, shows the same `?` help overlay, and adds no duplicated shortcut code.

## Decision: Library, Yes

Three apps exist, so the rule of three is satisfied. The audit found the same logic in all three: a pure `handleKey` function, a commands interface, target and modifier guards, and a bindings-driven help overlay. The library extracts this proven shape. It does not invent one.

## Repo Layout

```
keybarre/
├── src/               # the library: vanilla TS, zero runtime deps, zero Electron imports
├── test/
├── skill/
│   └── SKILL.md       # the skill; symlinked into ~/.claude/skills/
├── README.md          # documents the standard keymap — single source of truth
└── package.json
```

The library is renderer-only. No app defines an Electron `Menu`, registers a `globalShortcut`, or uses accelerators. All three ride the Electron default menu for chrome (devtools, close, fullscreen). The library keeps that stance.

## Distribution

Apps install the library as a git-URL dependency:

```
npm install github:andybp85/keybarre#semver:^1
```

Versions follow Semantic Versioning 2.0.0 through git tags.

## The Standard Keymap

Built from the audit. Every key below exists in at least one app today, and no app contradicts it — with one resolved conflict, noted under Migration.

| Category  | Action                          | Key                  | Today in                     |
|-----------|---------------------------------|----------------------|------------------------------|
| Transport | play / stop                     | `Space`              | all three                    |
| Transport | return to start                 | `Enter`              | practice-player              |
| Transport | tap tempo                       | `T`                  | tempo-head, practice-player  |
| Tempo     | nudge down / up (holds repeat)  | `[` / `]`            | all three                    |
| Tempo     | set 50%–90%                     | `5`–`9`              | carter, practice-player      |
| Tempo     | set 100%                        | `0`                  | carter, practice-player      |
| Click     | toggle metronome/click          | `M`                  | carter, tempo-head           |
| Click     | toggle downbeat accent          | `A`                  | carter, tempo-head           |
| Click     | cycle count-in (0/1/2 bars)     | `C`                  | carter, tempo-head           |
| Nav       | seek back / forward             | `←` / `→`            | practice-player              |
| Nav       | fine seek                       | `Shift+←` / `Shift+→`| practice-player              |
| Nav       | add marker / jump point         | `J`                  | new (was `m` in practice-player) |
| Nav       | next / prev marker              | `Tab` / `Shift+Tab`  | practice-player              |
| Loop      | set loop (start, then end)      | `L`                  | practice-player              |
| Dismiss   | close overlay, else clear loop  | `Esc`                | all three (layered)          |
| Help      | toggle shortcut overlay         | `?`                  | all three                    |

Modified combos (`Cmd+Z`, `Cmd+C`) pass through the dispatcher untouched. Apps that need them (practice-player chart editing) handle them locally.

Cut from revision 1, because no app has them and the guards would fight them: record, split, snap toggle, `Alt`-nudge, zoom, and the whole Chrome category.

## Override Policy

The standard is the default. An app can override a standard key when it has a reason. Each override carries a one-line "why" comment in the app code. Apps add their own extra shortcuts on unclaimed keys.

Known overrides and extras after migration:

- **tempo-head-tracking-poc**: digits force meter, not tempo percent (override, POC-specific); `f`, `e`, `w`, `r`, `k` are extras.
- **carter-drummer**: `1`–`4` select personality (extra); `v` vamps loop (extra); `Backspace` arms chart delete (extra).
- **practice-player**: `b`, `n` are extras.

## Migration Notes (from the audit)

- **`m` conflict, resolved**: `m` = click toggle (carter and tempo-head win, 2-vs-1). practice-player's add-jump-point moves to `j`.
- **carter-drummer gap**: `Esc` does not close its help overlay today. The library's layered `Esc` fixes this for free.
- **tempo-head gap**: its editable-target guard misses `SELECT`, so shortcuts fire while a device dropdown has focus. The library's guard includes `SELECT`.
- **practice-player**: four layered `document` listeners form its `Esc` priority chain. The library owns the overlay layer; the app keeps its prompt-dialog and chart layers above the dispatcher.

## Library Architecture

Four small modules. Pure functional core, side effects at the edges. This is the shape all three apps already use — the library is an extraction, not an invention.

### `keymap`

`STANDARD_KEYMAP: readonly Binding[]`. Pure data.

`Binding = { action, chord, label, category, repeats? }`. A chord is a parsed type, not a string blob. String input parses into a `Chord` at the boundary (parse, don't validate). `repeats: true` lets a held key auto-repeat (`[` and `]` in the standard).

### `resolve`

`resolveBindings(standard, { overrides, unbind, extras })` returns the effective binding set. Pure function.

- `overrides: { [action]: Chord }` — moves an action to a different chord.
- `unbind: string[]` — removes standard actions, freeing their chords for extras.
- `extras: Binding[]` — app-specific additions.
- An unknown action name in `overrides` or `unbind` throws at startup.
- A conflict (two actions on one chord) throws at startup.

### `dispatcher`

`createShortcuts(bindings, handlers)` returns `{ attach(), detach() }`. One `keydown` listener. The guard order, taken from the apps:

1. Skip editable targets: `input`, `textarea`, `select`, `contenteditable`.
2. Skip when `ctrlKey`, `metaKey`, or `altKey` is set. Shift stays live (`?`, `Shift+Tab`, fine seek).
3. Skip `event.repeat` unless the binding has `repeats: true`.
4. On a handled key: run the handler, call `preventDefault()`, return `true`. Unhandled keys fall through untouched.

Apps supply a handler for each action that they implement. Unhandled standard actions stay inert.

### `overlay`

The `?` help overlay, vanilla DOM. It renders from the *effective* bindings, grouped by category, with extras and overrides shown, so it never lies. `Esc` and `?` close it; the overlay consumes `Esc` before the app's dismiss handler sees it.

## The Skill

Name: `electron-music-app-shortcuts`. Lives in `skill/SKILL.md`, symlinked into `~/.claude/skills/`.

**Triggers.** Claude builds or edits one of Andy's Electron music apps: new app scaffolding, a feature that needs keys, or any shortcut work.

**Instructions to Claude:**

1. Install the library as the git-URL dependency, pinned `#semver:^1`.
2. Wire `dispatcher` and `overlay` in the renderer. No main-process wiring exists.
3. Implement handlers only for the actions that the app has.
4. Declare overrides and extras explicitly. Give each override a one-line "why" comment.
5. Point at the repo README for the keymap. Never inline the keymap in the skill.

**Retrofit path.** For an existing app: inventory the current bindings, map each one to a standard action, an override, or an extra. Then replace the ad-hoc listeners with the library. The three current apps' mappings are in Migration Notes above.

## Testing

Test-first. Unit tests cover the pure core:

- Chord parsing.
- `resolveBindings`: override, unbind, extra, conflict-throw.
- Event-to-chord matching with synthetic `KeyboardEvent`s.
- Guards: editable targets (including `SELECT`), modifiers, repeat allowlist.

One thin integration test mounts the overlay in a DOM (happy-dom or jsdom) and checks `Esc` close. No Electron runs anywhere in the library or its tests.

Dev dependencies: TypeScript, a test runner, one DOM shim. Zero runtime dependencies.

## Out of Scope (YAGNI)

- Runtime remapping UI.
- Global (OS-level) shortcuts.
- Chord sequences (vim-style).
- Main-process menus and accelerators (cut in revision 2 — no app uses them).
