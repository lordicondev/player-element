import type { IconState } from '@lordicon/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { stubIntersectionObserver } from '../testing/observers.ts';
import { withReducedMotion } from '../testing/reduced-motion.ts';
import { defineForTests } from '../testing/context.ts';
import { parseIntro } from './intro.ts';

const states = [
    { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
    { name: 'hover-jump', time: 40, duration: 30, params: [], default: false },
] as IconState[];

let stub: ReturnType<typeof useStubPlayer>;
let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    stub = useStubPlayer({ states });
    stubFetch();
    io = stubIntersectionObserver();
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

describe('parseIntro', () => {
    const names = ['hover-jump', 'in-reveal'];

    it('picks the first in-* state for a bare attribute', () => {
        expect(parseIntro('', names)).toEqual({ state: 'in-reveal', after: null, delay: 0 });
        expect(parseIntro('', ['hover-jump'])).toBeNull();
        expect(parseIntro(null, names)).toBeNull();
    });

    it('reads a state and options', () => {
        expect(parseIntro('hover-jump', names)?.state).toBe('hover-jump');
        expect(parseIntro('after=.card', names)).toEqual({
            state: 'in-reveal',
            after: '.card',
            delay: 0,
        });
        expect(parseIntro('hover-jump, after=.card, delay=300', names)).toEqual({
            state: 'hover-jump',
            after: '.card',
            delay: 300,
        });
    });

    it('warns about a missing state and an unknown option', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(parseIntro('in-nope', names)).toBeNull();
        expect(parseIntro('in-reveal, wait=1', names)?.state).toBe('in-reveal');
        expect(warn).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });
});

describe('intro', () => {
    it('plays the intro when visible, restores the state, then starts the trigger', async () => {
        const element = mount({
            src: '/lock.json',
            state: 'hover-jump',
            intro: '',
            trigger: 'loop',
        });
        await settle();
        await becomeReady(stub.player);
        // Ready before the intro: an icon out of view still takes commands.
        expect(element.ready).toBe(true);
        expect(stub.player.calls).toEqual(['init']);

        io.show(element);
        await settle();
        expect(stub.player.state).toBe('in-reveal');
        expect(stub.player.calls).toEqual(['init', 'play:state']);

        stub.player.emit('complete');
        await settle();
        expect(stub.player.state).toBe('hover-jump');
        // The loop trigger started after the intro and played its first round.
        expect(stub.player.calls).toEqual(['init', 'play:state', 'play:start']);
    });

    it('announces the trigger once the intro is over', async () => {
        const element = mount({ src: '/lock.json', intro: '', trigger: 'hover' });
        const seen: string[] = [];
        element.addEventListener('ready', () => seen.push('ready'));
        element.addEventListener('trigger', () => seen.push(`trigger:${!!element.currentTrigger}`));
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();
        expect(seen).toEqual(['ready']);

        stub.player.emit('complete');
        await settle();
        expect(seen).toEqual(['ready', 'trigger:true']);
    });

    it('lets a state set during the intro win', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: 'in-reveal' });
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();

        element.setAttribute('state', 'in-reveal');
        stub.player.emit('complete');
        await settle();
        expect(stub.player.state).toBe('in-reveal');
    });

    it('is skipped under reduced motion', async () => {
        const restore = withReducedMotion(true);
        try {
            const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
            await settle();
            await becomeReady(stub.player);
            expect(element.ready).toBe(true);
            expect(stub.player.calls).toEqual(['init']);
            expect(io.watching(element)).toBe(0);
        } finally {
            restore();
        }
    });

    it('is cut short by a command, which starts the trigger first', async () => {
        const element = mount({
            src: '/lock.json',
            state: 'hover-jump',
            intro: '',
            trigger: 'loop',
        });
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();
        stub.player.calls.length = 0;

        element.pause();
        expect(stub.player.state).toBe('hover-jump');
        // The loop started (its first round), then the command ran.
        expect(stub.player.calls).toEqual(['play:start', 'pause']);

        stub.player.emit('complete');
        await settle();
        expect(stub.player.state).toBe('hover-jump');
    });

    it('is cut short by a command from a ready listener', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        element.addEventListener('ready', () => void element.play(), { once: true });
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();

        expect(stub.player.state).toBe('hover-jump');
        expect(io.watching(element)).toBe(0);
    });

    it('is skipped when commands were queued before ready', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        element.play();
        await settle();
        await becomeReady(stub.player);
        expect(stub.player.calls).toEqual(['init', 'play']);
        expect(io.watching(element)).toBe(0);
    });
});

describe('intro after', () => {
    function mountIn(card: HTMLElement, intro: string) {
        defineForTests();
        const element = document.createElement('lord-icon');
        element.setAttribute('src', '/lock.json');
        element.setAttribute('state', 'hover-jump');
        element.setAttribute('intro', intro);
        card.append(element);
        document.body.append(card);
        return element;
    }

    function animation(endTime: number, finished: Promise<unknown>) {
        return { finished, effect: { getComputedTiming: () => ({ endTime }) } } as Animation;
    }

    it("waits for the ancestor's finite animations, not the endless ones", async () => {
        const card = document.createElement('div');
        card.className = 'card';
        let finish!: () => void;
        const sliding = new Promise<void>((resolve) => (finish = resolve));
        card.getAnimations = () => [
            animation(300, sliding),
            animation(Infinity, new Promise(() => {})),
        ];

        const element = mountIn(card, 'after=.card');
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(stub.player.calls).toEqual(['init']);

        finish();
        await settle();
        expect(stub.player.state).toBe('in-reveal');
        expect(stub.player.calls).toEqual(['init', 'play:state']);
    });

    it('warns and goes ahead when no ancestor matches', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const element = mountIn(document.createElement('div'), 'after=.nope');
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();
        expect(warn).toHaveBeenCalledOnce();
        expect(stub.player.calls).toEqual(['init', 'play:state']);
        warn.mockRestore();
    });

    it('waits the delay', async () => {
        const element = mountIn(document.createElement('div'), 'delay=40');
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();
        expect(stub.player.calls).toEqual(['init']);

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(stub.player.calls).toEqual(['init', 'play:state']);
    });

    it('stops waiting when the element is removed before the icon is seen', async () => {
        const element = mount({ src: '/lock.json', intro: '', trigger: 'loop' });
        const error = vi.fn();
        element.addEventListener('error', error);
        await settle();
        await becomeReady(stub.player);
        const player = stub.player;

        element.remove();
        await settle();
        io.show(element);
        await settle();
        expect(player.calls).toEqual(['init', 'destroy']);
        expect(error).not.toHaveBeenCalled();
    });

    it('drops a playing intro when the icon changes, and plays the new one', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        const error = vi.fn();
        element.addEventListener('error', error);
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();
        const old = stub.player;

        element.src = '/other.json';
        await settle();
        expect(old.calls).toEqual(['init', 'play:state', 'destroy']);

        await becomeReady(stub.player);
        io.show(element);
        await settle();
        expect(stub.player.calls).toEqual(['init', 'play:state']);
        expect(error).not.toHaveBeenCalled();
    });

    it('starts a trigger set during the intro once the intro ends', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        await settle();
        await becomeReady(stub.player);
        io.show(element);
        await settle();

        element.setAttribute('trigger', 'loop');
        expect(stub.player.calls).toEqual(['init', 'play:state']);

        stub.player.emit('complete');
        await settle();
        expect(stub.player.calls).toEqual(['init', 'play:state', 'play:start']);
    });

    it("draws the intro's first frame from the start, never the resting look", async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        await settle();
        expect(stub.player.stateAtInit).toBe('in-reveal');

        await becomeReady(stub.player);
        expect(stub.player.state).toBe('in-reveal');

        io.show(element);
        await settle();
        stub.player.emit('complete');
        await settle();
        expect(stub.player.state).toBe('hover-jump');
    });

    it('goes back to its own state when a command comes before ready', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        await settle();
        void element.play();
        await becomeReady(stub.player);

        expect(stub.player.state).toBe('hover-jump');
        expect(stub.player.calls).toEqual(['init', 'play']);
    });

    it('keeps a state change for after the intro', async () => {
        const element = mount({ src: '/lock.json', state: 'hover-jump', intro: '' });
        await settle();
        await becomeReady(stub.player);

        element.setAttribute('state', 'in-reveal');
        element.setAttribute('state', 'hover-jump');
        expect(stub.player.state).toBe('in-reveal');
    });
});
