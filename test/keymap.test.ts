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
