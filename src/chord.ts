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
