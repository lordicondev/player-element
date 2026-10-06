import { describe, expect, it } from 'vitest';
import { BaseTrigger, defineElement, Hover, LordIconElement } from './index.ts';

// A file of its own: the trigger registry is shared, and nothing here may define first.
describe('a trigger registered before defineElement()', () => {
    it('stays in place of the built-in one', () => {
        class MyHover extends BaseTrigger {}
        LordIconElement.defineTrigger('hover', MyHover);
        defineElement();

        expect(LordIconElement.resolveTrigger('hover')).toBe(MyHover);
        expect(LordIconElement.resolveTrigger('hover')).not.toBe(Hover);
    });
});
