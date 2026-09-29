/**
 * The element's own styles: the host box, the placeholder slot, and the colour hooks.
 *
 * `current-color` makes every path take `currentColor`. Without it, each named colour of
 * the icon can be overridden with `--lord-icon-<name>`; `--lord-icon-<name>-base` carries
 * the icon's own value and is written by the element.
 */
export const HOST_CSS = `
    :host {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 32px;
    }

    :host([current-color]) svg path[fill] {
        fill: currentColor;
    }

    :host([current-color]) svg path[stroke] {
        stroke: currentColor;
    }

    /* The renderer sets an inline translate3d(0,0,0) on the svg; only !important undoes it. */
    svg {
        position: absolute;
        display: block;
        pointer-events: none;
        transform: unset !important;
    }

    ::slotted(*) {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
`;

const sheets = new Map<string, CSSStyleSheet>();

/** One stylesheet per distinct text, shared by every icon that needs it. */
function sheet(css: string): CSSStyleSheet {
    let found = sheets.get(css);
    if (!found) {
        found = new CSSStyleSheet();
        found.replaceSync(css);
        sheets.set(css, found);
    }
    return found;
}

/**
 * Gives a shadow root the host styles and the palette rules for these colour names. Icons
 * with the same names share the same sheets; where the browser cannot share sheets, one
 * `<style>` carries them.
 */
export function applyStyles(root: ShadowRoot, names: string[] = []): void {
    const css = [HOST_CSS, paletteCss(names)].filter((text) => text.trim());

    if ('adoptedStyleSheets' in root && 'replaceSync' in CSSStyleSheet.prototype) {
        root.adoptedStyleSheets = css.map(sheet);
        return;
    }

    let style = root.querySelector<HTMLStyleElement>('style[data-lord-icon]');
    if (!style) {
        style = document.createElement('style');
        style.dataset.lordIcon = '';
        root.prepend(style);
    }
    style.textContent = css.join('\n');
}

const NAME = /^[a-z0-9_-]+$/i;

/** CSS that lets each named colour of the icon be overridden with a custom property. */
export function paletteCss(names: string[]): string {
    return names
        .filter((name) => NAME.test(name))
        .map(
            (name) => `
    :host(:not([current-color])) svg path[fill].${name} {
        fill: var(--lord-icon-${name}, var(--lord-icon-${name}-base, #000));
    }
    :host(:not([current-color])) svg path[stroke].${name} {
        stroke: var(--lord-icon-${name}, var(--lord-icon-${name}-base, #000));
    }`,
        )
        .join('\n');
}
