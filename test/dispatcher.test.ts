import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShortcuts, type Shortcuts } from '../src/dispatcher.js'
import { STANDARD_KEYMAP } from '../src/keymap.js'
import { resolveBindings } from '../src/resolve.js'

const bindings = resolveBindings(STANDARD_KEYMAP)

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    target.dispatchEvent(event)
    return event
}

let shortcuts: Shortcuts | undefined
afterEach(() => {
    shortcuts?.detach()
    shortcuts = undefined
    document.body.innerHTML = ''
})

describe('createShortcuts validation', () => {
    it('throws at creation time when a handler key has no matching binding action', () => {
        expect(() => createShortcuts(bindings, { 'play-sotp': vi.fn() })).toThrow(/play-sotp/)
    })

    it('names every offending handler key when several are unknown', () => {
        expect(() => createShortcuts(bindings, { 'play-sotp': vi.fn(), 'bogus-action': vi.fn() })).toThrow(
            /play-sotp.*bogus-action|bogus-action.*play-sotp/s,
        )
    })

    it('allows a handlers object naming only some of the bindings actions', () => {
        expect(() => createShortcuts(bindings, { 'play-stop': vi.fn(), 'tap-tempo': vi.fn() })).not.toThrow()
    })

    it('allows an empty handlers object', () => {
        expect(() => createShortcuts(bindings, {})).not.toThrow()
    })
})

describe('createShortcuts', () => {
    it('runs the handler and prevents default for a handled key', () => {
        const play = vi.fn()
        shortcuts = createShortcuts(bindings, { 'play-stop': play })
        shortcuts.attach()
        const event = press(' ')
        expect(play).toHaveBeenCalledOnce()
        expect(event.defaultPrevented).toBe(true)
    })

    it('leaves a matched binding with no handler inert', () => {
        shortcuts = createShortcuts(bindings, {})
        shortcuts.attach()
        const event = press('Tab')
        expect(event.defaultPrevented).toBe(false)
    })

    it('skips editable targets: input, textarea, select, contenteditable', () => {
        const play = vi.fn()
        shortcuts = createShortcuts(bindings, { 'play-stop': play })
        shortcuts.attach()
        for (const tag of ['input', 'textarea', 'select']) {
            const el = document.createElement(tag)
            document.body.append(el)
            press(' ', {}, el)
        }
        const editable = document.createElement('div')
        // happy-dom does not implement isContentEditable; define what a browser would compute
        Object.defineProperty(editable, 'isContentEditable', { value: true })
        document.body.append(editable)
        press(' ', {}, editable)
        expect(play).not.toHaveBeenCalled()
    })

    it('skips ctrl/meta/alt combos so platform shortcuts pass through', () => {
        const click = vi.fn()
        shortcuts = createShortcuts(bindings, { 'toggle-click': click })
        shortcuts.attach()
        press('m', { ctrlKey: true })
        press('m', { metaKey: true })
        press('m', { altKey: true })
        expect(click).not.toHaveBeenCalled()
    })

    it('suppresses key repeat except on repeats bindings', () => {
        const click = vi.fn()
        const down = vi.fn()
        shortcuts = createShortcuts(bindings, { 'toggle-click': click, 'tempo-down': down })
        shortcuts.attach()
        press('m', { repeat: true })
        press('[', { repeat: true })
        expect(click).not.toHaveBeenCalled()
        expect(down).toHaveBeenCalledOnce()
    })

    it('stops dispatching after detach', () => {
        const play = vi.fn()
        shortcuts = createShortcuts(bindings, { 'play-stop': play })
        shortcuts.attach()
        shortcuts.detach()
        press(' ')
        expect(play).not.toHaveBeenCalled()
    })

    it('allows shortcuts when contenteditable="false" (author explicitly non-editable)', () => {
        const play = vi.fn()
        shortcuts = createShortcuts(bindings, { 'play-stop': play })
        shortcuts.attach()
        const notEditable = document.createElement('div')
        notEditable.setAttribute('contenteditable', 'false')
        document.body.append(notEditable)
        expect(notEditable.isContentEditable).toBe(false)
        press(' ', {}, notEditable)
        expect(play).toHaveBeenCalledOnce()
    })
})
