---
name: electron-music-app-shortcuts
description: Use when building or editing any of Andy's Electron music apps (carter-drummer, practice-player, tempo-head-tracking-poc, or a new one) — scaffolding a new app, adding a feature that needs keys, or doing any keyboard-shortcut work. Applies the standard shortcut scheme from the music-app-keyboard-shortcuts library instead of ad-hoc keydown listeners.
---

# Electron Music-App Shortcuts

Andy's Electron music apps share one keyboard standard. It lives in the
`music-app-keyboard-shortcuts` library. Do not write ad-hoc keydown listeners
in these apps. Wire the library.

The keymap lives in the library README:
https://github.com/andybp85/music-app-keyboard-shortcuts#the-standard-keymap
(local checkout: ~/Projects/music-app-keyboard-shortcuts/README.md).
Read it there. Do not copy it into app code or into this skill.

## New app, or adding shortcuts

1. Install the library: `npm install github:andybp85/music-app-keyboard-shortcuts#semver:^1`.
2. In the renderer, build the bindings with `resolveBindings(STANDARD_KEYMAP, { overrides, extras })`.
3. Create the overlay with `createHelpOverlay(bindings)`. Wire `'toggle-help'` to `overlay.toggle`.
4. Create the dispatcher with `createShortcuts(bindings, handlers)` and call `attach()`.
5. Implement handlers only for the actions that the app has. Unhandled standard actions stay inert.
6. Do not add main-process menus or accelerators for shortcuts. The library is renderer-only.

## Overrides and extras

- The standard is the default. Override a standard key only with a reason.
- Give each override a one-line "why" comment at the override site.
- Put app-specific shortcuts in `extras`, on keys the standard does not claim.
- A chord conflict throws at startup. Fix the conflict; do not catch the error.

## Retrofit (an app with existing ad-hoc shortcuts)

1. Inventory the current bindings from the app's keyboard module.
2. Map each one to a standard action, an override (with its "why"), or an extra.
3. Replace the ad-hoc listener and help overlay with the library.
4. Keep app dialogs (prompts, editors) on their own capture-phase listeners, above the dispatcher.
5. Known per-app mappings are in the spec:
   ~/Projects/music-app-keyboard-shortcuts/docs/superpowers/specs/2026-08-10-electron-music-shortcuts-design.md
   (Migration Notes and Override Policy sections).
