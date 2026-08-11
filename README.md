# music-app-keyboard-shortcuts

This library defines the standard keyboard shortcut scheme for Andy's Electron music apps. It is extracted from
carter-drummer, practice-player, and tempo-head-tracking-poc. The library holds the keymap data, chord parsing,
binding resolution, event dispatch, and the help overlay. It has zero runtime dependencies and no Electron imports.

## Install

```bash
npm install github:andybp85/music-app-keyboard-shortcuts#semver:^1
```

## The Standard Keymap

| Category  | Action                          | Key                    |
|-----------|----------------------------------|-------------------------|
| Transport | play / stop                     | `Space`                 |
| Transport | return to start                 | `Enter`                 |
| Transport | tap tempo                       | `T`                     |
| Tempo     | nudge down / up (holds repeat)  | `[` / `]`                |
| Tempo     | set 50%–90%                     | `5`–`9`                  |
| Tempo     | set 100%                        | `0`                      |
| Click     | toggle metronome/click          | `M`                      |
| Click     | toggle downbeat accent          | `A`                      |
| Click     | cycle count-in (0/1/2 bars)     | `C`                      |
| Nav       | seek back / forward             | `←` / `→`                |
| Nav       | fine seek                       | `Shift+←` / `Shift+→`    |
| Nav       | add marker / jump point         | `J`                      |
| Nav       | next / prev marker              | `Tab` / `Shift+Tab`      |
| Loop      | set loop (start, then end)      | `L`                      |
| Dismiss   | close overlay, else clear loop  | `Esc`                    |
| Help      | toggle shortcut overlay         | `?`                      |

An app can override a standard key or add extra shortcuts on unclaimed keys. See the Usage section.

## Usage

```ts
import { createHelpOverlay, createShortcuts, parseChord, resolveBindings, STANDARD_KEYMAP } from 'music-app-keyboard-shortcuts';

const bindings = resolveBindings(STANDARD_KEYMAP, {
    // why: digits force the meter in this app, so tempo percent moves off the digit row
    overrides: { 'tempo-50': null },
    extras: [{ action: 'toggle-bass', chord: parseChord('b'), label: 'Toggle bass stem', category: 'Nav' }],
});
const overlay = createHelpOverlay(bindings);
const shortcuts = createShortcuts(bindings, {
    'play-stop': () => player.toggle(),
    'toggle-help': () => overlay.toggle(),
});
shortcuts.attach();
```

## Guards

The dispatcher applies these guards before it calls a handler for a keydown event:

- An editable target skips the shortcut. This includes `input`, `textarea`, `select`, and any `contenteditable`
  element.
- Ctrl, Meta, and Alt combos pass through untouched. Only Shift is a supported modifier.
- A repeated keydown (a held key) is ignored, unless the binding sets `repeats: true`.
- A handled key calls `preventDefault` on the event.

## Versioning

This package uses semantic versioning through git tags. Pin a major version range in the install command, for
example `#semver:^1`.
