# keybarre

> One grip, all your keys.

This library defines the standard keyboard shortcut scheme for Andy's Electron music apps. It is extracted from
carter-drummer, practice-player, and tempo-head-tracking-poc. The library holds the keymap data, chord parsing,
binding resolution, event dispatch, and the help overlay. It has zero runtime dependencies and no Electron imports.

## Install

```bash
npm install github:andybp85/keybarre#semver:^1
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

An app can move a standard key, drop one it does not want, or add extra shortcuts on unclaimed keys. See the
Usage section.

## Usage

```ts
import { createHelpOverlay, createShortcuts, parseChord, resolveBindings, STANDARD_KEYMAP } from 'keybarre'

const bindings = resolveBindings(STANDARD_KEYMAP, {
    // why: digits force the meter in this app, so tempo percent moves off the digit row
    unbind: ['tempo-50'],
    overrides: { 'add-marker': parseChord('k') },
    extras: [{ action: 'toggle-bass', chord: parseChord('b'), label: 'Toggle bass stem', category: 'Nav' }],
})
const overlay = createHelpOverlay(bindings)
const shortcuts = createShortcuts(bindings, {
    'play-stop': () => player.toggle(),
    'toggle-help': () => overlay.toggle(),
})
shortcuts.attach()
```

`overrides` moves an action to a different chord. `unbind` removes standard actions the app does not have, and
frees their chords for `extras`. Both throw on an unknown action name.

## Validation

Both boundary functions throw on malformed input rather than degrading silently:

- `parseChord` throws on an unsupported modifier, an unrecognized `X+Y` combo, an unknown named key (e.g.
  `'Spacebar'`), or `Shift+<single character>` — a shifted printable character already arrives as its own
  `event.key`, so that Shift can never be matched.
- `createShortcuts` throws if any `handlers` key does not match the `action` of a binding, catching typos
  (`'play-sotp'`) at creation time instead of leaving the binding silently inert.

## Guards

The dispatcher applies these guards before it calls a handler for a keydown event:

- An editable target skips the shortcut. This includes `input`, `textarea`, `select`, and any `contenteditable`
  element.
- Ctrl, Meta, and Alt combos pass through untouched. Only Shift is a supported modifier.
- A repeated keydown (a held key) is ignored, unless the binding sets `repeats: true`.
- A handled key calls `preventDefault` on the event.

## Development

```bash
npm test           # vitest, happy-dom
npm run build      # tsc to dist/
npm run lint       # eslint: brace omission, TS strictness
npm run format     # prettier: no semicolons, no arrow parens, single quotes
```

Prettier and ESLint hold the house style. Run both before a commit.

## Versioning

This package uses semantic versioning through git tags. Pin a major version range in the install command, for
example `#semver:^1`.
