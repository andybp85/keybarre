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
