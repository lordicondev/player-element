import { describe, expect, it } from 'vitest';
import { BaseTrigger, defineElement, Hover, LordIconElement, Loop } from './index.ts';

class Custom extends BaseTrigger {}

describe('defineElement', () => {
    it('registers the built-in triggers and the element', () => {
        defineElement();
        expect(customElements.get('lord-icon')).toBe(LordIconElement);
        expect(LordIconElement.resolveTrigger('loop')).toBeDefined();
        expect(LordIconElement.resolveTrigger('LOOP')).toBeDefined();
    });

    it('accepts extra triggers, a motion mode and another tag, and is idempotent', () => {
        defineElement({ tag: 'my-icon', triggers: { custom: Custom }, motion: 'always' });
        defineElement({ tag: 'my-icon' });

        expect(document.createElement('my-icon')).toBeInstanceOf(LordIconElement);
        expect(LordIconElement.resolveTrigger('custom')).toBe(Custom);
        // The second call, without a motion mode, keeps the first one's.
        expect(LordIconElement.motion).toBe('always');

        defineElement({ motion: 'auto' });
        expect(LordIconElement.motion).toBe('auto');
    });

    it('keeps a built-in trigger the page replaced through later calls', () => {
        class MyHover extends BaseTrigger {}
        defineElement({ triggers: { hover: MyHover } });
        defineElement();
        defineElement({ tag: 'other-icon' });

        expect(LordIconElement.resolveTrigger('hover')).toBe(MyHover);
        // The names nobody took keep their built-in triggers.
        expect(LordIconElement.resolveTrigger('loop')).toBe(Loop);

        // Passing the built-in one puts it back.
        defineElement({ triggers: { hover: Hover } });
        expect(LordIconElement.resolveTrigger('hover')).toBe(Hover);
    });
});
