import { parseChord, type Chord } from './chord.js'

export interface Binding {
    readonly action: string
    readonly chord: Chord
    readonly label: string
    readonly category: string
    readonly repeats?: boolean
}

function bind(action: string, chord: string, label: string, category: string, repeats?: boolean): Binding {
    return repeats === undefined
        ? { action, chord: parseChord(chord), label, category }
        : { action, chord: parseChord(chord), label, category, repeats }
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
]
