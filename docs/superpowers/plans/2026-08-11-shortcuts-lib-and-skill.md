# Electron Music-App Keyboard Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the renderer-only shortcuts library (keymap, resolve, dispatcher, overlay) plus the Claude skill that applies it to Andy's Electron music apps.

**Architecture:** Pure functional core (chord parsing, keymap data, binding resolution) with side effects at two edges: a `keydown` dispatcher and a vanilla-DOM help overlay. Zero runtime deps, zero Electron imports. Spec: `docs/superpowers/specs/2026-08-10-electron-music-shortcuts-design.md`.

**Tech Stack:** TypeScript (strict), vitest + happy-dom (dev only). Distribution via git-URL dependency with semver git tags.

## Global Constraints

- Zero runtime dependencies. Dev deps only: `typescript`, `vitest`, `happy-dom`.
- Zero Electron imports anywhere in `src/` or `test/`.
- 4-space indent, max line 140 columns.
- Only `Shift` may appear in a chord. `Ctrl`/`Meta`/`Alt` chords are a parse error.
- Guard order in the dispatcher (from the spec): editable target → modifier keys → key repeat → handler.
- Every module: test file first, watch it fail, implement, watch it pass, commit.

---

### Task 1: Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`

**Interfaces:**
- Produces: a repo where `npm test` and `npm run build` run. Package name `keybarre`, ESM, entry `dist/index.js`.

- [ ] **Step 1: Write `package.json`**

```json
{
    "name": "keybarre",
    "version": "0.0.0",
    "description": "Standard keyboard shortcuts for Electron music apps: keymap, dispatcher, help overlay",
    "license": "MIT",
    "type": "module",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    },
    "files": ["dist"],
    "scripts": {
        "build": "tsc",
        "test": "vitest run",
        "prepare": "tsc"
    },
    "devDependencies": {
        "typescript": "^5.5.0",
        "vitest": "^2.1.0",
        "happy-dom": "^15.11.0"
    }
}
```

The `prepare` script matters: npm runs it on git-URL installs, so consumers get `dist/` built from a bare clone.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM"],
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "declaration": true,
        "outDir": "dist",
        "skipLibCheck": true
    },
    "include": ["src"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['test/**/*.test.ts'],
    },
});
```

- [ ] **Step 4: Install and verify**

Run: `npm install && npm run build && npx vitest run --passWithNoTests`
Expected: install succeeds; `tsc` exits 0 (no inputs is fine — if it errors with "No inputs were found", create `src/index.ts` containing only `export {};` and rerun); vitest reports no test files, exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/index.ts
git commit -m "Scaffold TS package: vitest + happy-dom, prepare-builds dist for git installs"
```

---

### Task 2: `chord` module

**Files:**
- Create: `src/chord.ts`
- Test: `test/chord.test.ts`

**Interfaces:**
- Produces:
  - `interface Chord { readonly key: string; readonly shift: boolean }`
  - `parseChord(input: string): Chord` — accepts `"Space"`, `"m"`, `"Shift+Tab"`, `"?"`, `"["`, `"ArrowLeft"`, `"Esc"`; throws on `Ctrl+`/`Cmd+`/`Meta+`/`Alt+` and empty keys. Aliases: `Space` → `' '`, `Esc` → `Escape`.
  - `matchesEvent(chord: Chord, event: KeyboardEvent): boolean` — exact `event.key` match; for single-character keys `shiftKey` is ignored (the character encodes shift); for named keys (`Tab`, `ArrowLeft`, …) `shiftKey` must equal `chord.shift`.
  - `chordKey(chord: Chord): string` — canonical string for Map/Set keys, `"Tab|true"` style.
  - `formatChord(chord: Chord): string` — display form: `' '` → `Space`, `ArrowLeft` → `←`, `Escape` → `Esc`, letters upper-cased, `Shift+` prefix kept.

- [ ] **Step 1: Write the failing test**

```ts
// test/chord.test.ts
import { describe, expect, it } from 'vitest';
import { chordKey, formatChord, matchesEvent, parseChord } from '../src/chord.js';

const event = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key, ...init });

describe('parseChord', () => {
    it('parses a bare key', () => {
        expect(parseChord('m')).toEqual({ key: 'm', shift: false });
    });

    it('parses Shift+ chords', () => {
        expect(parseChord('Shift+Tab')).toEqual({ key: 'Tab', shift: true });
    });

    it('aliases Space and Esc to their event.key values', () => {
        expect(parseChord('Space').key).toBe(' ');
        expect(parseChord('Esc').key).toBe('Escape');
    });

    it('rejects banned modifiers', () => {
        for (const input of ['Ctrl+S', 'Cmd+=', 'Meta+z', 'Alt+ArrowLeft']) {
            expect(() => parseChord(input)).toThrow(/only Shift/);
        }
    });

    it('rejects empty keys', () => {
        expect(() => parseChord('')).toThrow(/empty/i);
        expect(() => parseChord('Shift+')).toThrow(/empty/i);
    });
});

describe('matchesEvent', () => {
    it('matches on event.key', () => {
        expect(matchesEvent(parseChord('m'), event('m'))).toBe(true);
        expect(matchesEvent(parseChord('m'), event('n'))).toBe(false);
    });

    it('is case-sensitive for letters, so Shift+M does not match m', () => {
        expect(matchesEvent(parseChord('m'), event('M', { shiftKey: true }))).toBe(false);
    });

    it('ignores shiftKey for printed characters like ?', () => {
        expect(matchesEvent(parseChord('?'), event('?', { shiftKey: true }))).toBe(true);
    });

    it('requires shiftKey to match for named keys', () => {
        expect(matchesEvent(parseChord('Tab'), event('Tab', { shiftKey: true }))).toBe(false);
        expect(matchesEvent(parseChord('Shift+Tab'), event('Tab', { shiftKey: true }))).toBe(true);
        expect(matchesEvent(parseChord('Shift+Tab'), event('Tab'))).toBe(false);
    });
});

describe('chordKey', () => {
    it('distinguishes shifted from unshifted named keys', () => {
        expect(chordKey(parseChord('Tab'))).not.toBe(chordKey(parseChord('Shift+Tab')));
    });
});

describe('formatChord', () => {
    it('renders display names', () => {
        expect(formatChord(parseChord('Space'))).toBe('Space');
        expect(formatChord(parseChord('ArrowLeft'))).toBe('←');
        expect(formatChord(parseChord('Esc'))).toBe('Esc');
        expect(formatChord(parseChord('m'))).toBe('M');
        expect(formatChord(parseChord('Shift+ArrowRight'))).toBe('Shift+→');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/chord.test.ts`
Expected: FAIL — cannot resolve `../src/chord.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/chord.ts
export interface Chord {
    readonly key: string;
    readonly shift: boolean;
}

const BANNED_MODIFIERS = new Set(['ctrl', 'control', 'cmd', 'meta', 'alt', 'option']);
const KEY_ALIASES: Record<string, string> = { Space: ' ', Esc: 'Escape' };

export function parseChord(input: string): Chord {
    const shift = input.startsWith('Shift+');
    const raw = shift ? input.slice('Shift+'.length) : input;
    if (raw.length === 0) {
        throw new Error(`Chord "${input}" has an empty key`);
    }
    const head = raw.split('+')[0]!.toLowerCase();
    if (BANNED_MODIFIERS.has(head)) {
        throw new Error(`Chord "${input}": only Shift is supported as a modifier; ${head} combos pass through to the platform`);
    }
    return { key: KEY_ALIASES[raw] ?? raw, shift };
}

export function matchesEvent(chord: Chord, event: KeyboardEvent): boolean {
    if (event.key !== chord.key) {
        return false;
    }
    if (chord.key.length === 1) {
        return true;
    }
    return event.shiftKey === chord.shift;
}

export function chordKey(chord: Chord): string {
    return `${chord.key}|${chord.shift}`;
}

const DISPLAY_NAMES: Record<string, string> = {
    ' ': 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Escape: 'Esc',
};

export function formatChord(chord: Chord): string {
    const name = DISPLAY_NAMES[chord.key] ?? (chord.key.length === 1 ? chord.key.toUpperCase() : chord.key);
    return chord.shift ? `Shift+${name}` : name;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/chord.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/chord.ts test/chord.test.ts
git commit -m "Add chord: parse/match/format, Shift-only modifier policy"
```

---

### Task 3: `keymap` module

**Files:**
- Create: `src/keymap.ts`
- Test: `test/keymap.test.ts`

**Interfaces:**
- Consumes: `parseChord`, `Chord`, `chordKey` from `src/chord.ts`.
- Produces:
  - `interface Binding { readonly action: string; readonly chord: Chord; readonly label: string; readonly category: string; readonly repeats?: boolean }`
  - `STANDARD_KEYMAP: readonly Binding[]` — the spec's table, exactly. Categories used: `Transport`, `Tempo`, `Click`, `Nav`, `Loop`, `Dismiss`, `Help`.
  - Repeating bindings (hold-to-slew): `tempo-down`, `tempo-up`, `seek-back`, `seek-forward`, `seek-back-fine`, `seek-forward-fine`.

- [ ] **Step 1: Write the failing test**

```ts
// test/keymap.test.ts
import { describe, expect, it } from 'vitest';
import { chordKey } from '../src/chord.js';
import { STANDARD_KEYMAP } from '../src/keymap.js';

describe('STANDARD_KEYMAP', () => {
    it('has unique actions', () => {
        const actions = STANDARD_KEYMAP.map((b) => b.action);
        expect(new Set(actions).size).toBe(actions.length);
    });

    it('has unique chords', () => {
        const keys = STANDARD_KEYMAP.map((b) => chordKey(b.chord));
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('binds the audited conventions', () => {
        const byAction = new Map(STANDARD_KEYMAP.map((b) => [b.action, b]));
        expect(byAction.get('play-stop')?.chord.key).toBe(' ');
        expect(byAction.get('tempo-down')?.chord.key).toBe('[');
        expect(byAction.get('tempo-down')?.repeats).toBe(true);
        expect(byAction.get('toggle-click')?.chord.key).toBe('m');
        expect(byAction.get('add-marker')?.chord.key).toBe('j');
        expect(byAction.get('prev-marker')?.chord).toEqual({ key: 'Tab', shift: true });
        expect(byAction.get('toggle-help')?.chord.key).toBe('?');
        expect(byAction.get('dismiss')?.chord.key).toBe('Escape');
        expect(byAction.get('tempo-50')?.chord.key).toBe('5');
        expect(byAction.get('tempo-100')?.chord.key).toBe('0');
    });

    it('marks only slew/seek bindings as repeating', () => {
        const repeating = STANDARD_KEYMAP.filter((b) => b.repeats === true).map((b) => b.action).sort();
        expect(repeating).toEqual(['seek-back', 'seek-back-fine', 'seek-forward', 'seek-forward-fine', 'tempo-down', 'tempo-up']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/keymap.test.ts`
Expected: FAIL — cannot resolve `../src/keymap.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/keymap.ts
import { parseChord, type Chord } from './chord.js';

export interface Binding {
    readonly action: string;
    readonly chord: Chord;
    readonly label: string;
    readonly category: string;
    readonly repeats?: boolean;
}

function bind(action: string, chord: string, label: string, category: string, repeats?: boolean): Binding {
    return repeats === undefined
        ? { action, chord: parseChord(chord), label, category }
        : { action, chord: parseChord(chord), label, category, repeats };
}

export const STANDARD_KEYMAP: readonly Binding[] = [
    bind('play-stop', 'Space', 'Play / stop', 'Transport'),
    bind('return-to-start', 'Enter', 'Return to start', 'Transport'),
    bind('tap-tempo', 't', 'Tap tempo', 'Transport'),
    bind('tempo-down', '[', 'Tempo / speed down', 'Tempo', true),
    bind('tempo-up', ']', 'Tempo / speed up', 'Tempo', true),
    bind('tempo-50', '5', 'Tempo / speed 50%', 'Tempo'),
    bind('tempo-60', '6', 'Tempo / speed 60%', 'Tempo'),
    bind('tempo-70', '7', 'Tempo / speed 70%', 'Tempo'),
    bind('tempo-80', '8', 'Tempo / speed 80%', 'Tempo'),
    bind('tempo-90', '9', 'Tempo / speed 90%', 'Tempo'),
    bind('tempo-100', '0', 'Tempo / speed 100%', 'Tempo'),
    bind('toggle-click', 'm', 'Toggle metronome / click', 'Click'),
    bind('toggle-accent', 'a', 'Toggle downbeat accent', 'Click'),
    bind('cycle-count-in', 'c', 'Cycle count-in (0/1/2 bars)', 'Click'),
    bind('seek-back', 'ArrowLeft', 'Seek back', 'Nav', true),
    bind('seek-forward', 'ArrowRight', 'Seek forward', 'Nav', true),
    bind('seek-back-fine', 'Shift+ArrowLeft', 'Seek back (fine)', 'Nav', true),
    bind('seek-forward-fine', 'Shift+ArrowRight', 'Seek forward (fine)', 'Nav', true),
    bind('add-marker', 'j', 'Add marker / jump point', 'Nav'),
    bind('next-marker', 'Tab', 'Next marker', 'Nav'),
    bind('prev-marker', 'Shift+Tab', 'Previous marker', 'Nav'),
    bind('set-loop', 'l', 'Set loop (start, then end)', 'Loop'),
    bind('dismiss', 'Esc', 'Close overlay / clear loop', 'Dismiss'),
    bind('toggle-help', '?', 'Show / hide shortcuts', 'Help'),
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/keymap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/keymap.ts test/keymap.test.ts
git commit -m "Add STANDARD_KEYMAP: the audited cross-app conventions as data"
```

---

### Task 4: `resolve` module

**Files:**
- Create: `src/resolve.ts`
- Test: `test/resolve.test.ts`

**Interfaces:**
- Consumes: `Binding` from `src/keymap.ts`; `Chord`, `chordKey`, `formatChord` from `src/chord.ts`.
- Produces:
  - `type Source = 'standard' | 'override' | 'extra'`
  - `interface ResolvedBinding extends Binding { readonly source: Source }`
  - `interface AppBindings { readonly overrides?: Readonly<Record<string, Chord | null>>; readonly extras?: readonly Binding[] }`
  - `resolveBindings(standard: readonly Binding[], app?: AppBindings): ResolvedBinding[]` — pure; `null` override unbinds; unknown override action throws; duplicate chord across the effective set throws naming both actions.

- [ ] **Step 1: Write the failing test**

```ts
// test/resolve.test.ts
import { describe, expect, it } from 'vitest';
import { parseChord } from '../src/chord.js';
import { STANDARD_KEYMAP } from '../src/keymap.js';
import { resolveBindings } from '../src/resolve.js';

const extra = (action: string, chord: string) => ({ action, chord: parseChord(chord), label: action, category: 'Nav' });

describe('resolveBindings', () => {
    it('returns the standard set unchanged with no app bindings', () => {
        const resolved = resolveBindings(STANDARD_KEYMAP);
        expect(resolved).toHaveLength(STANDARD_KEYMAP.length);
        expect(resolved.every((b) => b.source === 'standard')).toBe(true);
    });

    it('applies a chord override and marks its source', () => {
        const resolved = resolveBindings(STANDARD_KEYMAP, { overrides: { 'add-marker': parseChord('k') } });
        const marker = resolved.find((b) => b.action === 'add-marker');
        expect(marker?.chord.key).toBe('k');
        expect(marker?.source).toBe('override');
    });

    it('unbinds on a null override', () => {
        const resolved = resolveBindings(STANDARD_KEYMAP, { overrides: { 'set-loop': null } });
        expect(resolved.find((b) => b.action === 'set-loop')).toBeUndefined();
    });

    it('appends extras marked as extras', () => {
        const resolved = resolveBindings(STANDARD_KEYMAP, { extras: [extra('toggle-bass', 'b')] });
        expect(resolved.find((b) => b.action === 'toggle-bass')?.source).toBe('extra');
    });

    it('throws on an override for an unknown action', () => {
        expect(() => resolveBindings(STANDARD_KEYMAP, { overrides: { 'no-such-action': parseChord('x') } }))
            .toThrow(/unknown action "no-such-action"/);
    });

    it('throws on a chord conflict, naming both actions', () => {
        expect(() => resolveBindings(STANDARD_KEYMAP, { extras: [extra('my-thing', 'm')] }))
            .toThrow(/toggle-click.*my-thing|my-thing.*toggle-click/);
    });

    it('lets an extra claim a chord freed by an unbind', () => {
        const resolved = resolveBindings(STANDARD_KEYMAP, {
            overrides: { 'toggle-click': null },
            extras: [extra('my-thing', 'm')],
        });
        expect(resolved.find((b) => b.action === 'my-thing')?.chord.key).toBe('m');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/resolve.test.ts`
Expected: FAIL — cannot resolve `../src/resolve.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/resolve.ts
import { chordKey, formatChord, type Chord } from './chord.js';
import type { Binding } from './keymap.js';

export type Source = 'standard' | 'override' | 'extra';

export interface ResolvedBinding extends Binding {
    readonly source: Source;
}

export interface AppBindings {
    readonly overrides?: Readonly<Record<string, Chord | null>>;
    readonly extras?: readonly Binding[];
}

export function resolveBindings(standard: readonly Binding[], app: AppBindings = {}): ResolvedBinding[] {
    const overrides = app.overrides ?? {};
    const extras = app.extras ?? [];

    const known = new Set(standard.map((b) => b.action));
    for (const action of Object.keys(overrides)) {
        if (!known.has(action)) {
            throw new Error(`Override for unknown action "${action}"`);
        }
    }

    const resolved: ResolvedBinding[] = [];
    for (const binding of standard) {
        if (!(binding.action in overrides)) {
            resolved.push({ ...binding, source: 'standard' });
            continue;
        }
        const chord = overrides[binding.action];
        if (chord != null) {
            resolved.push({ ...binding, chord, source: 'override' });
        }
    }
    for (const binding of extras) {
        resolved.push({ ...binding, source: 'extra' });
    }

    const claimed = new Map<string, string>();
    for (const binding of resolved) {
        const key = chordKey(binding.chord);
        const holder = claimed.get(key);
        if (holder !== undefined) {
            throw new Error(`Chord "${formatChord(binding.chord)}" is bound to both "${holder}" and "${binding.action}"`);
        }
        claimed.set(key, binding.action);
    }
    return resolved;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/resolve.ts test/resolve.test.ts
git commit -m "Add resolveBindings: overrides/unbinds/extras, conflicts throw at startup"
```

---

### Task 5: `dispatcher` module

**Files:**
- Create: `src/dispatcher.ts`
- Test: `test/dispatcher.test.ts`

**Interfaces:**
- Consumes: `ResolvedBinding` from `src/resolve.ts`; `matchesEvent` from `src/chord.ts`.
- Produces:
  - `type Handlers = Readonly<Record<string, () => void>>`
  - `createShortcuts(bindings: readonly ResolvedBinding[], handlers: Handlers): { attach(target?: EventTarget): void; detach(): void }` — one bubble-phase `keydown` listener on `document` by default. Guards in spec order. A matched binding with no handler stays inert: no `preventDefault`, event falls through. Handled keys get `preventDefault()`.

- [ ] **Step 1: Write the failing test**

```ts
// test/dispatcher.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShortcuts } from '../src/dispatcher.js';
import { STANDARD_KEYMAP } from '../src/keymap.js';
import { resolveBindings } from '../src/resolve.js';

const bindings = resolveBindings(STANDARD_KEYMAP);

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
}

let shortcuts: { attach(target?: EventTarget): void; detach(): void } | null = null;
afterEach(() => {
    shortcuts?.detach();
    shortcuts = null;
    document.body.innerHTML = '';
});

describe('createShortcuts', () => {
    it('runs the handler and prevents default for a handled key', () => {
        const play = vi.fn();
        shortcuts = createShortcuts(bindings, { 'play-stop': play });
        shortcuts.attach();
        const event = press(' ');
        expect(play).toHaveBeenCalledOnce();
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves a matched binding with no handler inert', () => {
        shortcuts = createShortcuts(bindings, {});
        shortcuts.attach();
        const event = press('Tab');
        expect(event.defaultPrevented).toBe(false);
    });

    it('skips editable targets: input, textarea, select, contenteditable', () => {
        const play = vi.fn();
        shortcuts = createShortcuts(bindings, { 'play-stop': play });
        shortcuts.attach();
        for (const tag of ['input', 'textarea', 'select']) {
            const el = document.createElement(tag);
            document.body.append(el);
            press(' ', {}, el);
        }
        const editable = document.createElement('div');
        editable.contentEditable = 'true';
        document.body.append(editable);
        press(' ', {}, editable);
        expect(play).not.toHaveBeenCalled();
    });

    it('skips ctrl/meta/alt combos so platform shortcuts pass through', () => {
        const click = vi.fn();
        shortcuts = createShortcuts(bindings, { 'toggle-click': click });
        shortcuts.attach();
        press('m', { ctrlKey: true });
        press('m', { metaKey: true });
        press('m', { altKey: true });
        expect(click).not.toHaveBeenCalled();
    });

    it('suppresses key repeat except on repeats bindings', () => {
        const click = vi.fn();
        const down = vi.fn();
        shortcuts = createShortcuts(bindings, { 'toggle-click': click, 'tempo-down': down });
        shortcuts.attach();
        press('m', { repeat: true });
        press('[', { repeat: true });
        expect(click).not.toHaveBeenCalled();
        expect(down).toHaveBeenCalledOnce();
    });

    it('stops dispatching after detach', () => {
        const play = vi.fn();
        shortcuts = createShortcuts(bindings, { 'play-stop': play });
        shortcuts.attach();
        shortcuts.detach();
        press(' ');
        expect(play).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/dispatcher.test.ts`
Expected: FAIL — cannot resolve `../src/dispatcher.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/dispatcher.ts
import { matchesEvent } from './chord.js';
import type { ResolvedBinding } from './resolve.js';

export type Handlers = Readonly<Record<string, () => void>>;

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable;
}

export function createShortcuts(bindings: readonly ResolvedBinding[], handlers: Handlers): { attach(target?: EventTarget): void; detach(): void } {
    let attached: EventTarget | null = null;

    const onKeydown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent)) {
            return;
        }
        if (isEditable(event.target)) {
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        const binding = bindings.find((b) => matchesEvent(b.chord, event));
        if (binding === undefined) {
            return;
        }
        if (event.repeat && binding.repeats !== true) {
            return;
        }
        const handler = handlers[binding.action];
        if (handler === undefined) {
            return;
        }
        event.preventDefault();
        handler();
    };

    return {
        attach(target: EventTarget = document): void {
            if (attached !== null) {
                return;
            }
            attached = target;
            attached.addEventListener('keydown', onKeydown);
        },
        detach(): void {
            if (attached === null) {
                return;
            }
            attached.removeEventListener('keydown', onKeydown);
            attached = null;
        },
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/dispatcher.test.ts`
Expected: PASS.

Note: happy-dom implements `KeyboardEvent` with `repeat` and modifier flags and `isContentEditable`; if the contenteditable case fails on happy-dom quirks, set `editable.setAttribute('contenteditable', 'true')` and assert via `target.isContentEditable` in a precondition `expect` before pressing.

- [ ] **Step 5: Commit**

```bash
git add src/dispatcher.ts test/dispatcher.test.ts
git commit -m "Add dispatcher: guard chain from the app audit, unhandled keys fall through"
```

---

### Task 6: `overlay` module

**Files:**
- Create: `src/overlay.ts`
- Test: `test/overlay.test.ts`

**Interfaces:**
- Consumes: `ResolvedBinding` from `src/resolve.ts`; `formatChord` from `src/chord.ts`.
- Produces:
  - `createHelpOverlay(bindings: readonly ResolvedBinding[], doc?: Document): { element: HTMLElement; open(): void; close(): void; toggle(): void; isOpen(): boolean }`
  - Renders a hidden `div.mak-overlay` appended to `doc.body`: one `section` per category in first-appearance order, each with an `h3` and a table of `<kbd>` chord / label rows. Rows for `source: 'extra'` get class `mak-extra`; `source: 'override'` rows get class `mak-override`. Injects one `<style id="mak-overlay-style">` element (idempotent).
  - While open, a capture-phase `keydown` listener on `doc` consumes `Escape` and `?` (prevent default, stop propagation, close) — this is the Esc layering: the overlay eats Esc before the dispatcher's `dismiss` handler sees it.

- [ ] **Step 1: Write the failing test**

```ts
// test/overlay.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseChord } from '../src/chord.js';
import { STANDARD_KEYMAP } from '../src/keymap.js';
import { createHelpOverlay } from '../src/overlay.js';
import { resolveBindings } from '../src/resolve.js';

const resolved = resolveBindings(STANDARD_KEYMAP, {
    overrides: { 'add-marker': parseChord('k') },
    extras: [{ action: 'toggle-bass', chord: parseChord('b'), label: 'Toggle bass stem', category: 'Nav' }],
});

function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event;
}

beforeEach(() => {
    document.body.innerHTML = '';
    document.getElementById('mak-overlay-style')?.remove();
});

describe('createHelpOverlay', () => {
    it('starts hidden and toggles', () => {
        const overlay = createHelpOverlay(resolved);
        expect(overlay.isOpen()).toBe(false);
        expect(overlay.element.hidden).toBe(true);
        overlay.toggle();
        expect(overlay.isOpen()).toBe(true);
        overlay.toggle();
        expect(overlay.isOpen()).toBe(false);
    });

    it('renders every effective binding with its display chord', () => {
        const overlay = createHelpOverlay(resolved);
        const text = overlay.element.textContent ?? '';
        expect(text).toContain('Play / stop');
        expect(text).toContain('Space');
        expect(text).toContain('Toggle bass stem');
        expect(overlay.element.querySelectorAll('tr')).toHaveLength(resolved.length);
    });

    it('marks extras and overrides', () => {
        const overlay = createHelpOverlay(resolved);
        expect(overlay.element.querySelectorAll('tr.mak-extra')).toHaveLength(1);
        expect(overlay.element.querySelectorAll('tr.mak-override')).toHaveLength(1);
    });

    it('closes on Escape and consumes the event', () => {
        const overlay = createHelpOverlay(resolved);
        overlay.open();
        const event = press('Escape');
        expect(overlay.isOpen()).toBe(false);
        expect(event.defaultPrevented).toBe(true);
    });

    it('closes on ? while open', () => {
        const overlay = createHelpOverlay(resolved);
        overlay.open();
        press('?');
        expect(overlay.isOpen()).toBe(false);
    });

    it('does not listen when closed', () => {
        const overlay = createHelpOverlay(resolved);
        overlay.open();
        overlay.close();
        const event = press('Escape');
        expect(event.defaultPrevented).toBe(false);
    });

    it('injects its style element once across instances', () => {
        createHelpOverlay(resolved);
        createHelpOverlay(resolved);
        expect(document.querySelectorAll('#mak-overlay-style')).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/overlay.test.ts`
Expected: FAIL — cannot resolve `../src/overlay.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/overlay.ts
import { formatChord } from './chord.js';
import type { ResolvedBinding } from './resolve.js';

const STYLE_ID = 'mak-overlay-style';
const CSS = `
.mak-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.mak-overlay .mak-panel { background: #222; color: #eee; padding: 1.5rem 2rem; border-radius: 8px; max-height: 85vh; overflow-y: auto; font: 14px system-ui, sans-serif; }
.mak-overlay h3 { margin: 0.75rem 0 0.25rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; }
.mak-overlay table { border-collapse: collapse; }
.mak-overlay td { padding: 0.15rem 0.75rem 0.15rem 0; }
.mak-overlay kbd { background: #444; border-radius: 4px; padding: 0.1rem 0.45rem; font-family: inherit; }
.mak-overlay tr.mak-extra td:last-child::after { content: " ·"; opacity: 0.6; }
.mak-overlay tr.mak-override kbd { outline: 1px solid #888; }
`;

function ensureStyle(doc: Document): void {
    if (doc.getElementById(STYLE_ID) !== null) {
        return;
    }
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    doc.head.append(style);
}

function render(doc: Document, bindings: readonly ResolvedBinding[]): HTMLElement {
    const root = doc.createElement('div');
    root.className = 'mak-overlay';
    root.hidden = true;
    const panel = doc.createElement('div');
    panel.className = 'mak-panel';
    root.append(panel);

    const categories = [...new Set(bindings.map((b) => b.category))];
    for (const category of categories) {
        const section = doc.createElement('section');
        const heading = doc.createElement('h3');
        heading.textContent = category;
        const table = doc.createElement('table');
        for (const binding of bindings.filter((b) => b.category === category)) {
            const row = doc.createElement('tr');
            if (binding.source !== 'standard') {
                row.className = `mak-${binding.source}`;
            }
            const keyCell = doc.createElement('td');
            const kbd = doc.createElement('kbd');
            kbd.textContent = formatChord(binding.chord);
            keyCell.append(kbd);
            const labelCell = doc.createElement('td');
            labelCell.textContent = binding.label;
            row.append(keyCell, labelCell);
            table.append(row);
        }
        section.append(heading, table);
        panel.append(section);
    }
    return root;
}

export function createHelpOverlay(
    bindings: readonly ResolvedBinding[],
    doc: Document = document,
): { element: HTMLElement; open(): void; close(): void; toggle(): void; isOpen(): boolean } {
    ensureStyle(doc);
    const element = render(doc, bindings);
    doc.body.append(element);

    const onKeydown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent) || (event.key !== 'Escape' && event.key !== '?')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        close();
    };

    function open(): void {
        if (!element.hidden) {
            return;
        }
        element.hidden = false;
        doc.addEventListener('keydown', onKeydown, true);
    }

    function close(): void {
        if (element.hidden) {
            return;
        }
        element.hidden = true;
        doc.removeEventListener('keydown', onKeydown, true);
    }

    return {
        element,
        open,
        close,
        toggle(): void {
            if (element.hidden) {
                open();
            } else {
                close();
            }
        },
        isOpen: (): boolean => !element.hidden,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/overlay.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/overlay.ts test/overlay.test.ts
git commit -m "Add help overlay: renders effective bindings, capture-phase Esc layering"
```

---

### Task 7: Public API, build, README

**Files:**
- Modify: `src/index.ts`
- Create: `README.md`

**Interfaces:**
- Produces: the package surface consumers import:
  `Chord`, `parseChord`, `formatChord`, `matchesEvent`, `chordKey`, `Binding`, `STANDARD_KEYMAP`, `Source`, `ResolvedBinding`, `AppBindings`, `resolveBindings`, `Handlers`, `createShortcuts`, `createHelpOverlay`.

- [ ] **Step 1: Write `src/index.ts`** (replaces the scaffold's empty export)

```ts
export { chordKey, formatChord, matchesEvent, parseChord, type Chord } from './chord.js';
export { STANDARD_KEYMAP, type Binding } from './keymap.js';
export { resolveBindings, type AppBindings, type ResolvedBinding, type Source } from './resolve.js';
export { createShortcuts, type Handlers } from './dispatcher.js';
export { createHelpOverlay } from './overlay.js';
```

- [ ] **Step 2: Full test run and build**

Run: `npm test && npm run build`
Expected: all suites pass; `dist/index.js` and `dist/index.d.ts` exist.

- [ ] **Step 3: Write `README.md`**

Content requirements (write in ASD-STE100 pragmatic style — the simple-english skill):
- Title, one-paragraph purpose: the standard shortcut scheme for Andy's Electron music apps, extracted from carter-drummer, practice-player, and tempo-head-tracking-poc.
- Install section with the exact command: `npm install github:andybp85/keybarre#semver:^1`.
- **The keymap table copied exactly from the spec** (`docs/superpowers/specs/2026-08-10-electron-music-shortcuts-design.md`, "The Standard Keymap" section, without the "Today in" column). This README table is the single source of truth the skill points at.
- Usage section with this snippet:

```ts
import { createHelpOverlay, createShortcuts, parseChord, resolveBindings, STANDARD_KEYMAP } from 'keybarre';

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

- Guards section: four bullet lines for the guard chain (editable targets incl. `select`; ctrl/meta/alt pass through; repeat suppressed unless `repeats`; handled keys `preventDefault`).
- Versioning line: semver via git tags.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts README.md
git commit -m "Export public API; README documents the standard keymap and usage"
```

---

### Task 8: The skill, symlink, release tag

**Files:**
- Create: `skill/SKILL.md`
- Create (outside repo): symlink `~/.claude/skills/electron-music-app-shortcuts` → `<repo>/skill`

**Interfaces:**
- Consumes: the README keymap table (referenced, never copied) and the package surface from Task 7.

- [ ] **Step 1: Write `skill/SKILL.md`**

```markdown
---
name: electron-music-app-shortcuts
description: Use when building or editing any of Andy's Electron music apps (carter-drummer, practice-player, tempo-head-tracking-poc, or a new one) — scaffolding a new app, adding a feature that needs keys, or doing any keyboard-shortcut work. Applies the standard shortcut scheme from the keybarre library instead of ad-hoc keydown listeners.
---

# Electron Music-App Shortcuts

Andy's Electron music apps share one keyboard standard. It lives in the
`keybarre` library. Do not write ad-hoc keydown listeners
in these apps. Wire the library.

The keymap lives in the library README:
https://github.com/andybp85/keybarre#the-standard-keymap
(local checkout: ~/Projects/keybarre/README.md).
Read it there. Do not copy it into app code or into this skill.

## New app, or adding shortcuts

1. Install the library: `npm install github:andybp85/keybarre#semver:^1`.
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
   ~/Projects/keybarre/docs/superpowers/specs/2026-08-10-electron-music-shortcuts-design.md
   (Migration Notes and Override Policy sections).
```

- [ ] **Step 2: Symlink the skill**

Run: `ln -sfn ~/Projects/keybarre/skill ~/.claude/skills/electron-music-app-shortcuts`
Verify: `ls -l ~/.claude/skills/electron-music-app-shortcuts` shows the link, and the target contains `SKILL.md`.

- [ ] **Step 3: Full verification**

Run: `npm test && npm run build`
Expected: all suites pass, build clean.

- [ ] **Step 4: Commit**

```bash
git add skill/SKILL.md
git commit -m "Add electron-music-app-shortcuts skill pointing at the lib and README keymap"
```

- [ ] **Step 5: Version and tag**

Set `"version": "1.0.0"` in `package.json`. Then:

```bash
git add package.json
git commit -m "Release 1.0.0"
git tag v1.0.0
```

Do not push — publishing the repo to GitHub (required before apps can install the git URL) is Andy's call.

---

## Verification Checklist (end of plan)

- [ ] `npm test` green: chord, keymap, resolve, dispatcher, overlay suites.
- [ ] `npm run build` emits `dist/` with declarations.
- [ ] `grep -ri electron src/ test/` finds nothing (renderer-only promise).
- [ ] README keymap table matches `STANDARD_KEYMAP` action-for-action.
- [ ] `~/.claude/skills/electron-music-app-shortcuts/SKILL.md` resolves through the symlink.
- [ ] `git tag` lists `v1.0.0`.
