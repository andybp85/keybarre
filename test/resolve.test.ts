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
