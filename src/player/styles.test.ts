import { describe, expect, it } from 'vitest';
import { applyStyles, HOST_CSS, paletteCss } from './styles.ts';

describe('styles', () => {
    it('gives current-color an attribute selector', () => {
        expect(HOST_CSS).toContain(':host([current-color]) svg path[fill]');
    });

    it('writes a fill and a stroke rule per colour', () => {
        const css = paletteCss(['primary', 'secondary']);
        expect(css).toContain('path[fill].primary');
        expect(css).toContain('var(--lord-icon-secondary, var(--lord-icon-secondary-base, #000))');
    });

    it('drops a colour name that is not safe in a selector', () => {
        expect(paletteCss(['a b', 'ok'])).not.toContain('a b');
        expect(paletteCss(['a b', 'ok'])).toContain('.ok');
    });

    const shadow = () => document.createElement('div').attachShadow({ mode: 'open' });

    it('gives a shadow root the host styles, then the palette, then the host alone', () => {
        const root = shadow();
        applyStyles(root);
        expect(root.adoptedStyleSheets).toHaveLength(1);

        applyStyles(root, ['primary', 'secondary']);
        expect(root.adoptedStyleSheets).toHaveLength(2);

        applyStyles(root);
        expect(root.adoptedStyleSheets).toHaveLength(1);
    });

    it('shares one sheet between icons with the same colour names', () => {
        const a = shadow();
        const b = shadow();
        applyStyles(a, ['primary', 'secondary']);
        applyStyles(b, ['primary', 'secondary']);
        expect(a.adoptedStyleSheets[0]).toBe(b.adoptedStyleSheets[0]);
        expect(a.adoptedStyleSheets[1]).toBe(b.adoptedStyleSheets[1]);

        applyStyles(b, ['primary']);
        expect(a.adoptedStyleSheets[1]).not.toBe(b.adoptedStyleSheets[1]);
    });
});
