import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';

let stub: ReturnType<typeof useStubPlayer>;

beforeEach(() => {
    stub = useStubPlayer({ colors: { primary: '#121331', secondary: '#08a88a' } });
    stubFetch();
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

const container = (element: HTMLElement) => element.shadowRoot!.querySelector('div')!;

describe('colours and stroke', () => {
    it('gives the new player the colours and stroke, and null once an attribute goes', async () => {
        const element = mount({ src: '/lock.json', colors: 'primary:red', stroke: 'bold' });
        await settle();
        expect(stub.properties[0]).toEqual({
            state: undefined,
            colors: { primary: '#ff0000' },
            stroke: 3,
        });

        await becomeReady(stub.player);
        element.removeAttribute('colors');
        element.removeAttribute('stroke');
        expect(stub.player.colors).toBeNull();
        expect(stub.player.stroke).toBeNull();
    });

    it('writes the colours as CSS variables on ready and refresh', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);

        const style = container(element).style;
        expect(style.getPropertyValue('--lord-icon-primary-base')).toBe('#121331');

        stub.player.colors = { primary: '#ff0000', secondary: '' };
        stub.player.emit('refresh');
        expect(style.getPropertyValue('--lord-icon-primary-base')).toBe('#ff0000');
        expect(style.getPropertyValue('--lord-icon-secondary-base')).toBe('');
    });

    it("lets CSS override each of the icon's colours, unless current-color is set", async () => {
        const element = mount({ src: '/lock.json' });
        await settle();

        const css = element
            .shadowRoot!.adoptedStyleSheets.flatMap((sheet) => [...sheet.cssRules])
            .map((rule) => rule.cssText)
            .join('\n');
        expect(css).toContain(':host(:not([current-color])) svg path[fill].primary');
        expect(css).toContain('var(--lord-icon-secondary, var(--lord-icon-secondary-base, #000))');
    });
});
