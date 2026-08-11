import { chordKey, formatChord, type Chord } from './chord.js'
import type { Binding } from './keymap.js'

export type Source = 'standard' | 'override' | 'extra'

export interface ResolvedBinding extends Binding {
    readonly source: Source
}

export interface AppBindings {
    readonly overrides?: Readonly<Record<string, Chord>>
    readonly unbind?: readonly string[]
    readonly extras?: readonly Binding[]
}

export function resolveBindings(standard: readonly Binding[], app: AppBindings = {}): ResolvedBinding[] {
    const overrides = app.overrides ?? {}
    const unbound = new Set(app.unbind ?? [])
    const extras = app.extras ?? []

    const known = new Set(standard.map(b => b.action))
    for (const action of [...Object.keys(overrides), ...unbound])
        if (!known.has(action)) throw new Error(`Binding for unknown action "${action}"`)

    const resolved: ResolvedBinding[] = []
    for (const binding of standard) {
        if (unbound.has(binding.action)) continue
        const chord = overrides[binding.action]
        resolved.push(chord === undefined ? { ...binding, source: 'standard' } : { ...binding, chord, source: 'override' })
    }
    for (const binding of extras) resolved.push({ ...binding, source: 'extra' })

    const claimed = new Map<string, string>()
    for (const binding of resolved) {
        const key = chordKey(binding.chord)
        const holder = claimed.get(key)
        if (holder !== undefined)
            throw new Error(`Chord "${formatChord(binding.chord)}" is bound to both "${holder}" and "${binding.action}"`)
        claimed.set(key, binding.action)
    }
    return resolved
}
