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
