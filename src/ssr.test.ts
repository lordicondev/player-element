// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('on a server', () => {
    it('imports without a DOM, and defineElement() does nothing', async () => {
        expect(globalThis.HTMLElement).toBeUndefined();

        const { defineElement, LordIconElement } = await import('./index.ts');
        expect(() => defineElement()).not.toThrow();

        // A subclass with loading of its own can still be declared there.
        class SecretIcon extends LordIconElement {}
        expect(() => defineElement({ element: SecretIcon })).not.toThrow();
    });
});
