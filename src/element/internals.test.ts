import type { IconState } from '@lordicon/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { iconData } from '../testing/icon.ts';
import { useInternals } from '../testing/internals.ts';
import { stubIntersectionObserver } from '../testing/observers.ts';
import { BaseTrigger } from '../triggers/base.ts';
import { LordIconElement } from './element.ts';

/** A trigger that plays the icon its own way, and says so. */
class OwnPlayback extends BaseTrigger {
    say(on: boolean): void {
        this.setAnimating(on);
    }
}
LordIconElement.defineTrigger('own-playback', OwnPlayback);

const states = [
    { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
    { name: 'hover-jump', time: 40, duration: 30, params: [], default: false },
] as IconState[];

let stub: ReturnType<typeof useStubPlayer>;
let internals: ReturnType<typeof useInternals>;
let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    stub = useStubPlayer({ states });
    stubFetch();
    io = stubIntersectionObserver();
    internals = useInternals();
});

afterEach(() => {
    internals.restore();
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

function statesOf(element: Element): string[] {
    return [...internals.of(element).states].sort();
}

describe('states for CSS', () => {
    it('go from waiting to loading to ready, and clear when the icon leaves', async () => {
        const element = mount({ src: '/lock.json', loading: 'interaction' });
        await settle();
        expect(statesOf(element)).toEqual(['waiting']);

        element.click();
        await settle();
        expect(statesOf(element)).toEqual(['loading']);

        await becomeReady(stub.player);
        expect(statesOf(element)).toEqual(['ready']);

        element.remove();
        await settle();
        expect(statesOf(element)).toEqual([]);
    });

    it('skip waiting for an icon that loads at once', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        expect(statesOf(element)).toEqual(['loading']);
    });

    it('show an error, and clear it once a new icon loads', async () => {
        stubFetch(iconData(), 404);
        const element = mount({ src: '/missing.json' });
        element.addEventListener('error', () => {});
        await settle();
        await element.readyPromise.catch(() => {});
        expect(statesOf(element)).toEqual(['error']);

        stubFetch();
        element.src = '/lock.json';
        await settle();
        expect(statesOf(element)).toEqual(['loading']);
    });

    it('hold nothing without an icon to show', async () => {
        const element = mount();
        await settle();
        expect(statesOf(element)).toEqual([]);
    });

    it('mark the intro from ready until it has played', async () => {
        const element = mount({ src: '/lock.json', intro: '' });
        await settle();
        await becomeReady(stub.player);
        expect(statesOf(element)).toEqual(['intro', 'ready']);

        io.show(element);
        await settle();
        stub.player.emit('complete');
        await settle();
        expect(statesOf(element)).toEqual(['ready']);
    });

    it('mark playing as the player tells, and clear it when the icon leaves', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);

        stub.player.emit('play');
        expect(statesOf(element)).toEqual(['playing', 'ready']);
        stub.player.emit('pause');
        expect(statesOf(element)).toEqual(['ready']);

        stub.player.emit('play');
        element.remove();
        await settle();
        expect(statesOf(element)).toEqual([]);
    });

    it('mark playing when a trigger of its own playback says the icon animates', async () => {
        const element = mount({ src: '/lock.json', trigger: 'own-playback' });
        await settle();
        await becomeReady(stub.player);
        const first = element.currentTrigger as OwnPlayback;

        first.say(true);
        expect(statesOf(element)).toEqual(['playing', 'ready']);
        first.say(false);
        expect(statesOf(element)).toEqual(['ready']);

        // Either is enough: the player, or the trigger.
        first.say(true);
        stub.player.emit('play');
        first.say(false);
        expect(statesOf(element)).toEqual(['playing', 'ready']);
        stub.player.emit('pause');

        // A trigger replaced takes what it said with it, and has no say afterwards.
        first.say(true);
        element.setAttribute('trigger', 'own-playback()');
        expect(statesOf(element)).toEqual(['ready']);
        first.say(true);
        expect(statesOf(element)).toEqual(['ready']);
    });

    it('drop the intro when a command cuts it short', async () => {
        const element = mount({ src: '/lock.json', intro: '' });
        await settle();
        await becomeReady(stub.player);

        element.stop();
        expect(statesOf(element)).toEqual(['ready']);
    });
});

describe('semantics', () => {
    it('hide an icon without a name, and make an image of one with a name', () => {
        const element = mount();
        expect(internals.of(element)).toMatchObject({ role: null, ariaHidden: 'true' });

        element.setAttribute('aria-label', 'Locked');
        expect(internals.of(element)).toMatchObject({ role: 'img', ariaHidden: null });

        element.setAttribute('aria-label', ' ');
        expect(internals.of(element)).toMatchObject({ role: null, ariaHidden: 'true' });

        element.setAttribute('aria-labelledby', 'caption');
        expect(internals.of(element)).toMatchObject({ role: 'img', ariaHidden: null });

        element.removeAttribute('aria-labelledby');
        expect(internals.of(element)).toMatchObject({ role: null, ariaHidden: 'true' });
    });

    it('hide the drawing inside, since the element speaks for it', () => {
        const element = mount();
        const container = element.shadowRoot!.querySelector('div')!;
        expect(container.getAttribute('aria-hidden')).toBe('true');
    });
});
