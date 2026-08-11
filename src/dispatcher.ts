import { matchesEvent } from './chord.js';
import type { ResolvedBinding } from './resolve.js';

export type Handlers = Readonly<Record<string, () => void>>;

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable || target.getAttribute('contenteditable') !== null;
}

export function createShortcuts(bindings: readonly ResolvedBinding[], handlers: Handlers): { attach(target?: EventTarget): void; detach(): void } {
    let attached: EventTarget | null = null;

    const onKeydown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent)) {
            return;
        }
        if (isEditable(event.target)) {
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        const binding = bindings.find((b) => matchesEvent(b.chord, event));
        if (binding === undefined) {
            return;
        }
        if (event.repeat && binding.repeats !== true) {
            return;
        }
        const handler = handlers[binding.action];
        if (handler === undefined) {
            return;
        }
        event.preventDefault();
        handler();
    };

    return {
        attach(target: EventTarget = document): void {
            if (attached !== null) {
                return;
            }
            attached = target;
            attached.addEventListener('keydown', onKeydown);
        },
        detach(): void {
            if (attached === null) {
                return;
            }
            attached.removeEventListener('keydown', onKeydown);
            attached = null;
        },
    };
}
