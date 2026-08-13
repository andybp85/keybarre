import { matchesEvent } from './chord.js'
import type { ResolvedBinding } from './resolve.js'

export type Handlers = Readonly<Record<string, () => void>>

/** Releases one attachment. Idempotent, and safe to call in any order against other attachments. */
export type DetachShortcuts = () => void

export type AttachShortcuts = (target?: EventTarget) => DetachShortcuts

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

// `event.target` is typed `EventTarget | null` by the DOM, so null is the API's, not ours.
function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable
}

export function createShortcuts(bindings: readonly ResolvedBinding[], handlers: Handlers): AttachShortcuts {
    const knownActions = new Set(bindings.map(b => b.action))
    const unknownKeys = Object.keys(handlers).filter(key => !knownActions.has(key))
    if (unknownKeys.length > 0) throw new Error(`Handlers key(s) do not match any binding action: ${unknownKeys.join(', ')}`)

    const onKeydown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent)) return
        if (isEditable(event.target)) return
        if (event.ctrlKey || event.metaKey || event.altKey) return

        const binding = bindings.find(b => matchesEvent(b.chord, event))
        if (binding === undefined) return
        if (event.repeat && binding.repeats !== true) return

        const handler = handlers[binding.action]
        if (handler === undefined) return

        event.preventDefault()
        handler()
    }

    // Attaching hands back its own undo, so there's no "am I attached" flag to keep in sync
    // and nothing to detach until you've attached. removeEventListener ignores a listener
    // that isn't registered, which is what makes the returned detach idempotent for free.
    return function attach(target: EventTarget = document): DetachShortcuts {
        target.addEventListener('keydown', onKeydown)
        return () => target.removeEventListener('keydown', onKeydown)
    }
}
