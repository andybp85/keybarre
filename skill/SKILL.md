---
name: electron-music-app-shortcuts
description: Use when building or editing an Electron music app — a player, practice tool, metronome, drum machine, or DAW-like editor — and the work involves keyboard shortcuts: scaffolding a new app, adding a feature that needs keys, or replacing ad-hoc keydown listeners. Applies the standard shortcut scheme from the keybarre library.
---

# Electron Music-App Shortcuts

Electron music apps share one keyboard standard. It lives in the `keybarre`
library. Do not write ad-hoc keydown listeners in these apps. Wire the library.

The keymap lives in the library README, under "The Standard Keymap":
https://github.com/andybp85/keybarre

Read it there. Do not copy it into app code or into this skill.

## New app, or adding shortcuts

1. Install the library: `npm install github:andybp85/keybarre#semver:^1`.
2. In the renderer, build the bindings with `resolveBindings(STANDARD_KEYMAP, { overrides, unbind, extras })`.
3. Create the overlay with `createHelpOverlay(bindings)`. Wire `'toggle-help'` to `overlay.toggle`.
4. Create the dispatcher with `createShortcuts(bindings, handlers)` and call `attach()`.
5. Implement handlers only for the actions that the app has. Unhandled standard actions stay inert.
6. Do not add main-process menus or accelerators for shortcuts. The library is renderer-only.
7. Follow the host app's existing code style and test conventions.

## Overrides and extras

- The standard is the default. Override a standard key only with a reason.
- Give each override a one-line "why" comment at the override site.
- Use `unbind` for standard actions the app does not have. This frees the chord for an extra.
- Put app-specific shortcuts in `extras`, on keys the standard does not claim.
- A chord conflict throws at startup. Fix the conflict; do not catch the error.
- An unknown action name in `overrides`, `unbind`, or `handlers` also throws at startup.

## Retrofit (an app with existing ad-hoc shortcuts)

1. Inventory the current bindings from the app's keyboard module.
2. Map each one to a standard action, an override (with its "why"), or an extra.
3. Replace the ad-hoc listener and help overlay with the library.
4. Keep app dialogs (prompts, editors) on their own capture-phase listeners, above the dispatcher.
5. Record the mapping in the app's own docs, so the next reader knows why each key moved.
