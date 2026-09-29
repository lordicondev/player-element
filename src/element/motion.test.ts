import { afterEach, describe, expect, it, vi } from 'vitest';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { LordIconElement } from './element.ts';
import { withReducedMotion } from '../testing/reduced-motion.ts';
import { parseMotion } from './attributes.ts';
import { reducedMotion } from './motion.ts';

afterEach(() => {
    LordIconElement.motion = 'auto';
    vi.restoreAllMocks();
});

describe('reduced motion', () => {
    it('follows the media query in auto mode', () => {
        const restore = withReducedMotion(true);
        expect(reducedMotion(null, 'auto')).toBe(true);
        restore();

        const restoreOff = withReducedMotion(false);
        expect(reducedMotion(null, 'auto')).toBe(false);
        restoreOff();
    });

    it('is off when either the element or the global mode says always', () => {
        const restore = withReducedMotion(true);
        expect(reducedMotion('always', 'auto')).toBe(false);
        expect(reducedMotion(null, 'always')).toBe(false);
        expect(reducedMotion('auto', 'always')).toBe(true);
        restore();
    });

    it('parses the motion attribute', () => {
        expect(parseMotion(null)).toBeNull();
        expect(parseMotion('always')).toBe('always');
        expect(parseMotion('anything')).toBe('auto');
    });
});

describe('reduced motion on the element', () => {
    async function looping(attributes: Record<string, string> = {}) {
        const stub = useStubPlayer();
        stubFetch();
        mount({ src: '/lock.json', trigger: 'loop', ...attributes });
        await settle();
        await becomeReady(stub.player);
        return stub;
    }

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.replaceChildren();
    });

    it('keeps the icon still, unless motion="always"', async () => {
        const restore = withReducedMotion(true);
        try {
            const still = await looping();
            expect(still.player.calls).toEqual(['init']);
            still.restore();

            const moving = await looping({ motion: 'always' });
            expect(moving.player.calls).toEqual(['init', 'play:start']);
            moving.restore();
        } finally {
            restore();
        }
    });

    it('restarts the trigger when the preference changes', async () => {
        const preference = withReducedMotion(true);
        try {
            const stub = await looping();
            expect(stub.player.calls).toEqual(['init']);

            preference.change(false);
            expect(stub.player.calls).toEqual(['init', 'play:start']);
            stub.restore();
        } finally {
            preference();
        }
    });
});
