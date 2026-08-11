import { formatChord } from './chord.js';
import type { ResolvedBinding } from './resolve.js';

const STYLE_ID = 'mak-overlay-style';
const CSS = `
.mak-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.mak-overlay .mak-panel { background: #222; color: #eee; padding: 1.5rem 2rem; border-radius: 8px; max-height: 85vh; overflow-y: auto; font: 14px system-ui, sans-serif; }
.mak-overlay h3 { margin: 0.75rem 0 0.25rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; }
.mak-overlay table { border-collapse: collapse; }
.mak-overlay td { padding: 0.15rem 0.75rem 0.15rem 0; }
.mak-overlay kbd { background: #444; border-radius: 4px; padding: 0.1rem 0.45rem; font-family: inherit; }
.mak-overlay tr.mak-extra td:last-child::after { content: " ·"; opacity: 0.6; }
.mak-overlay tr.mak-override kbd { outline: 1px solid #888; }
`;

function ensureStyle(doc: Document): void {
    if (doc.getElementById(STYLE_ID) !== null) {
        return;
    }
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    doc.head.append(style);
}

function render(doc: Document, bindings: readonly ResolvedBinding[]): HTMLElement {
    const root = doc.createElement('div');
    root.className = 'mak-overlay';
    root.hidden = true;
    const panel = doc.createElement('div');
    panel.className = 'mak-panel';
    root.append(panel);

    const categories = [...new Set(bindings.map((b) => b.category))];
    for (const category of categories) {
        const section = doc.createElement('section');
        const heading = doc.createElement('h3');
        heading.textContent = category;
        const table = doc.createElement('table');
        for (const binding of bindings.filter((b) => b.category === category)) {
            const row = doc.createElement('tr');
            if (binding.source !== 'standard') {
                row.className = `mak-${binding.source}`;
            }
            const keyCell = doc.createElement('td');
            const kbd = doc.createElement('kbd');
            kbd.textContent = formatChord(binding.chord);
            keyCell.append(kbd);
            const labelCell = doc.createElement('td');
            labelCell.textContent = binding.label;
            row.append(keyCell, labelCell);
            table.append(row);
        }
        section.append(heading, table);
        panel.append(section);
    }
    return root;
}

export function createHelpOverlay(
    bindings: readonly ResolvedBinding[],
    doc: Document = document,
): { element: HTMLElement; open(): void; close(): void; toggle(): void; isOpen(): boolean } {
    ensureStyle(doc);
    const element = render(doc, bindings);
    doc.body.append(element);

    const onKeydown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent) || (event.key !== 'Escape' && event.key !== '?')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        close();
    };

    function open(): void {
        if (!element.hidden) {
            return;
        }
        element.hidden = false;
        doc.addEventListener('keydown', onKeydown, true);
    }

    function close(): void {
        if (element.hidden) {
            return;
        }
        element.hidden = true;
        doc.removeEventListener('keydown', onKeydown, true);
    }

    return {
        element,
        open,
        close,
        toggle(): void {
            if (element.hidden) {
                open();
            } else {
                close();
            }
        },
        isOpen: (): boolean => !element.hidden,
    };
}
