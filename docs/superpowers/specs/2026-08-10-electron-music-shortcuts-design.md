# Design: Electron Music-App Keyboard Shortcuts (Lib + Skill)

Date: 2026-08-10
Status: Approved pending spec review

## Purpose

Andy has several Electron music apps, all vanilla TS/JS. Each app wires its own keyboard shortcuts. The keys differ between apps, and the wiring code is duplicated.

This project defines one standard shortcut scheme and ships it in two parts:

- **A library** that holds the keymap data and the shared behavior.
- **A skill** that tells Claude when and how to apply the library.

Success: every app answers to the same keys, shows the same `?` help overlay, and adds no duplicated shortcut code.

## Decision: Library, Yes

Several apps exist already, so the rule of three is satisfied. The shared material is behavior, not only data: a key dispatcher, a menu builder, and a help overlay. A skill-only approach copies this logic into each app, and the copies drift. The library removes that drift. The skill stays thin and points at the library.

## Repo Layout

```
music-app-keyboard-shortcuts/
├── src/               # the library: vanilla TS, zero runtime deps
├── test/
├── skill/
│   └── SKILL.md       # the skill; symlinked into ~/.claude/skills/
├── README.md          # documents the standard keymap — single source of truth
└── package.json
```

One repo, two deliverables. The `?` overlay renders from the same keymap data that the dispatcher uses, so the docs, the overlay, and the behavior cannot drift apart.

## Distribution

Apps install the library as a git-URL dependency:

```
npm install github:andybp85/music-app-keyboard-shortcuts#semver:^1
```

Versions follow Semantic Versioning 2.0.0 through git tags. No npm registry account is necessary.

## The Standard Keymap

Draft v1. Keys lean on Reaper conventions. Each key is open to change until the v1.0.0 tag.

| Category  | Action                       | Key                             |
|-----------|------------------------------|---------------------------------|
| Transport | play/pause                   | `Space`                         |
| Transport | stop (return to play-start)  | `Esc`                           |
| Transport | record                       | `R`                             |
| Transport | loop toggle                  | `L`                             |
| Transport | return to start              | `Home` / `Return`               |
| Nav/view  | zoom in / out                | `Cmd+=` / `Cmd+-`               |
| Nav/view  | seek back / forward          | `←` / `→`                       |
| Nav/view  | drop marker                  | `M`                             |
| Nav/view  | prev / next marker           | `[` / `]`                       |
| Editing   | split at cursor              | `S`                             |
| Editing   | snap toggle                  | `N`                             |
| Editing   | nudge left / right           | `Alt+←` / `Alt+→`               |
| Editing   | undo / redo                  | `Cmd+Z` / `Shift+Cmd+Z`         |
| Chrome    | preferences                  | `Cmd+,`                         |
| Chrome    | fullscreen                   | `Ctrl+Cmd+F`                    |
| Chrome    | devtools                     | `Cmd+Alt+I`                     |
| Chrome    | close window                 | `Cmd+W`                         |
| Help      | toggle shortcut overlay      | `?`                             |

## Override Policy

The standard is the default. An app can override a standard key when it has a reason. Each override carries a one-line "why" comment in the app code. Apps add their own extra shortcuts on unclaimed keys.

## Library Architecture

Four small modules. Pure functional core, side effects at the edges.

### `keymap`

`STANDARD_KEYMAP: readonly Binding[]`. Pure data.

`Binding = { action, chord, label, category }`. A chord is a parsed type, not a string blob. String input parses into a `Chord` at the boundary (parse, don't validate).

### `resolve`

`resolveBindings(standard, overrides, extras)` returns the effective binding set. Pure function.

- `overrides: { [action]: Chord | null }` — `null` unbinds the action.
- `extras: Binding[]` — app-specific additions.
- A conflict (two actions on one chord) throws at startup. Errors surface immediately, in development.

### `dispatcher`

`createShortcuts(bindings, handlers)` returns `{ attach(), detach() }`.

- Renderer-side `keydown` listener.
- Skips events from editable targets: `input`, `textarea`, `contenteditable`.
- Apps supply a handler for each action that they implement. Unhandled standard actions stay inert, so a metronome app does not fake a "split" action.

### `overlay` and `menu`

- `overlay`: the `?` help overlay, vanilla DOM. It renders from the *effective* bindings, so it shows overrides and extras and never lies.
- `menu`: builds the app-chrome accelerator entries for the main-process Menu template. It emits plain accelerator strings, so it needs no Electron import.
- One `Chord` type, two emitters: DOM key matching in the renderer, Electron accelerator strings in main.

## The Skill

Name: `electron-music-app-shortcuts`. Lives in `skill/SKILL.md`, symlinked into `~/.claude/skills/`.

**Triggers.** Claude builds or edits one of Andy's Electron music apps: new app scaffolding, a feature that needs keys, or any shortcut work.

**Instructions to Claude:**

1. Install the library as the git-URL dependency, pinned `#semver:^1`.
2. Wire `dispatcher` and `overlay` in the renderer. Wire `menu` in main.
3. Implement handlers only for the actions that the app has.
4. Declare overrides and extras explicitly. Give each override a one-line "why" comment.
5. Point at the repo README for the keymap. Never inline the keymap in the skill.

**Retrofit path.** For an existing app: inventory the current bindings, map each one to a standard action, an override, or an extra. Then replace the ad-hoc listeners with the library.

## Testing

Test-first. Unit tests cover the pure core:

- Chord parsing.
- `resolveBindings`: override, unbind, extra, conflict-throw.
- Event-to-chord matching with synthetic `KeyboardEvent`s.
- Editable-target detection.

One thin integration test mounts the overlay in a DOM (happy-dom or jsdom). No Electron runs in the test loop: `menu` emits plain strings, so unit tests cover it.

Dev dependencies: TypeScript, a test runner, one DOM shim. Zero runtime dependencies.

## Out of Scope (YAGNI)

- Runtime remapping UI.
- Global (OS-level) shortcuts.
- Chord sequences (vim-style).
- Windows/Linux nuances beyond Electron's `CmdOrCtrl` handling.
