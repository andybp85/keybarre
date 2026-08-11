export interface Chord {
    readonly key: string
    readonly shift: boolean
}

const BANNED_MODIFIERS = new Set(['ctrl', 'control', 'cmd', 'meta', 'alt', 'option'])
const KEY_ALIASES: Record<string, string> = { Space: ' ', Esc: 'Escape' }
const NAMED_KEYS = new Set([
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'Backspace',
    'Delete',
    'End',
    'Enter',
    'Escape',
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
    'Home',
    'PageDown',
    'PageUp',
    'Tab',
])

export function parseChord(input: string): Chord {
    if (!input.startsWith('Shift+') && /^shift\+/i.test(input))
        throw new Error(`Chord "${input}": the Shift prefix must be written exactly as "Shift+"`)

    const shift = input.startsWith('Shift+')
    const raw = shift ? input.slice('Shift+'.length) : input
    if (raw.length === 0) throw new Error(`Chord "${input}" has an empty key`)

    const head = raw.split('+')[0]!.toLowerCase()
    if (BANNED_MODIFIERS.has(head))
        throw new Error(`Chord "${input}": only Shift is supported as a modifier; ${head} combos pass through to the platform`)

    if (raw.length > 1 && raw.includes('+')) throw new Error(`Chord "${input}": "${raw}" is not a recognized key or modifier combo`)

    const key = KEY_ALIASES[raw] ?? raw
    if (shift && key.length === 1)
        throw new Error(
            `Chord "${input}": Shift+${raw} is redundant — a shifted printable character already arrives as its ` +
                'own event.key (e.g. "?" instead of "/"), so the Shift here can never be matched',
        )

    if (key.length > 1 && !NAMED_KEYS.has(key)) throw new Error(`Chord "${input}": "${key}" is not a known named key`)

    return { key, shift }
}

export function matchesEvent(chord: Chord, event: KeyboardEvent): boolean {
    if (event.key !== chord.key) return false
    if (chord.key.length === 1) return true
    return event.shiftKey === chord.shift
}

export function chordKey(chord: Chord): string {
    return `${chord.key}|${chord.shift}`
}

const DISPLAY_NAMES: Record<string, string> = {
    ' ': 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Escape: 'Esc',
}

export function formatChord(chord: Chord): string {
    const name = DISPLAY_NAMES[chord.key] ?? (chord.key.length === 1 ? chord.key.toUpperCase() : chord.key)
    return chord.shift ? `Shift+${name}` : name
}
