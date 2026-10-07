import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineForTests } from '../testing/context.ts';
import {
    becomeReady,
    defineOnPage,
    mount,
    settle,
    stubFetch,
    useStubPlayer,
} from '../testing/element.ts';
import { iconData } from '../testing/icon.ts';
import { morphState } from '../testing/player-stub.ts';
import { LordIconElement } from './element.ts';

let stub: ReturnType<typeof useStubPlayer>;

beforeEach(() => {
    stub = useStubPlayer({ states: morphState() });
    stubFetch();
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

describe('LordIconElement', () => {
    it('reports the build version', () => {
        expect(LordIconElement.version).toBe('test');
    });

    it('loads the icon, initialises the player and becomes ready', async () => {
        const element = mount({ src: '/lock.json', speed: '2' });
        const ready = vi.fn();
        element.addEventListener('ready', ready);

        await settle();
        expect(stub.created).toHaveLength(1);
        expect(stub.player.calls).toEqual(['init']);
        expect(stub.player.speed).toBe(2);
        expect(element.ready).toBe(false);
        expect(element.shadowRoot!.querySelector('slot')).not.toBeNull();

        await becomeReady(stub.player);
        expect(element.ready).toBe(true);
        expect(ready).toHaveBeenCalledOnce();
        expect(element.shadowRoot!.querySelector('slot')).toBeNull();
        expect(element.states.map((state) => state.name)).toEqual(['morph-close']);
        await expect(element.readyPromise).resolves.toBe(true);
    });

    it('keeps readyPromise through a new src, and settles it false when removed', async () => {
        const element = mount({ src: '/lock.json' });
        const first = element.readyPromise;
        element.src = '/other.json';
        await settle();
        await becomeReady(stub.player);
        await expect(first).resolves.toBe(true);

        const detached = mount({ src: '/lock.json' });
        const pending = detached.readyPromise;
        detached.remove();
        await expect(pending).resolves.toBe(false);
    });

    it('takes the icon from the icon property instead of src', async () => {
        const fetch = stubFetch();
        const element = mount();
        element.icon = iconData();

        await settle();
        expect(fetch).not.toHaveBeenCalled();
        expect(stub.created).toHaveLength(1);
        expect(element.icon).toEqual(iconData());
    });

    it('raises error and rejects readyPromise when the icon cannot load', async () => {
        stubFetch(iconData(), 404);
        const element = mount({ src: '/missing.json' });
        const error = vi.fn();
        element.addEventListener('error', error);
        const rejected = element.readyPromise.catch((reason: Error) => reason.message);

        await settle();
        expect(error).toHaveBeenCalledOnce();
        expect(error.mock.calls[0][0].detail).toBeInstanceOf(Error);
        await expect(rejected).resolves.toMatch(/404/);
        expect(stub.created).toHaveLength(0);
    });

    it('aborts a load when src changes and ends up with one player', async () => {
        let release!: () => void;
        const first = stubFetch();
        first.mockImplementationOnce(
            (_url: string, init?: RequestInit) =>
                new Promise((resolve, reject) => {
                    release = () =>
                        resolve({ ok: true, status: 200, json: async () => iconData() });
                    init?.signal?.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError')),
                    );
                }),
        );

        const element = mount({ src: '/slow.json' });
        const error = vi.fn();
        element.addEventListener('error', error);
        await settle();
        expect(first.mock.calls[0][1]?.signal?.aborted).toBe(false);

        element.src = '/fast.json';
        await settle();
        expect(first.mock.calls[0][1]?.signal?.aborted).toBe(true);
        release();
        await settle();

        expect(stub.created).toHaveLength(1);
        expect(error).not.toHaveBeenCalled();
    });

    it('keeps the same styles after a reload and unsubscribes the old player', async () => {
        const element = mount({ src: '/a.json' });
        await settle();
        await becomeReady(stub.player);
        const old = stub.player;
        const sheets = [...element.shadowRoot!.adoptedStyleSheets];
        expect(old.listeners('complete')).toBe(1);

        element.src = '/b.json';
        await settle();
        expect(old.calls).toContain('destroy');
        expect(old.listeners('complete')).toBe(0);
        expect(element.shadowRoot!.adoptedStyleSheets).toEqual(sheets);
    });

    it('destroys the player and shows the placeholder when disconnected', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);

        element.remove();
        expect(stub.player.calls).not.toContain('destroy'); // a microtask later: it may be a move
        await settle();
        expect(stub.player.calls).toContain('destroy');
        expect(element.ready).toBe(false);
        expect(element.player).toBeNull();
        expect(element.shadowRoot!.querySelector('slot')).not.toBeNull();
    });

    it('forwards attribute changes to the player', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);
        const state = vi.fn();
        element.addEventListener('state', state);

        element.setAttribute('state', 'morph-close');
        element.setAttribute('colors', 'primary:red');
        element.setAttribute('stroke', 'bold');
        element.setAttribute('speed', '0.5');

        expect(stub.player.state).toBe('morph-close');
        expect(state.mock.calls[0][0].detail).toBe('morph-close');
        expect(stub.player.colors).toEqual({ primary: '#ff0000' });
        expect(stub.player.stroke).toBe(3);
        expect(stub.player.speed).toBe(0.5);
    });

    it('re-emits complete', async () => {
        const element = mount({ src: '/lock.json' });
        const complete = vi.fn();
        element.addEventListener('complete', complete);
        await settle();
        await becomeReady(stub.player);

        stub.player.emit('complete');
        expect(complete).toHaveBeenCalledOnce();
        expect(complete.mock.calls[0][0].detail).toEqual({
            segment: null,
            direction: 1,
            state: null,
        });
    });

    it('warns instead of throwing on an unknown trigger', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const element = mount({ src: '/lock.json', trigger: 'nope' });
        await settle();
        await becomeReady(stub.player);

        expect(element.ready).toBe(true);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
        warn.mockRestore();
    });

    it('reflects properties to attributes', () => {
        const element = mount();
        element.trigger = 'loop';
        element.currentColor = true;
        element.speed = 1.5;

        expect(element.getAttribute('trigger')).toBe('loop');
        expect(element.hasAttribute('current-color')).toBe(true);
        expect(element.speed).toBe(1.5);

        element.trigger = null;
        expect(element.hasAttribute('trigger')).toBe(false);
    });

    it('removes the attribute for undefined as for null', () => {
        const element = mount({
            src: '/lock.json',
            state: 'hover-jump',
            trigger: 'loop',
            target: 'div',
            colors: 'primary:red',
            stroke: 'bold',
            speed: '2',
            'current-color': '',
        });

        element.src = undefined;
        element.state = undefined;
        element.trigger = undefined;
        element.target = undefined;
        element.colors = undefined;
        element.stroke = undefined;
        element.speed = undefined;
        element.currentColor = undefined;

        for (const name of ['src', 'state', 'trigger', 'target', 'colors', 'stroke', 'speed']) {
            expect(element.hasAttribute(name), name).toBe(false);
        }
        expect(element.hasAttribute('current-color')).toBe(false);
    });

    it('does not toggle current-color on a falsy value', () => {
        const element = mount();
        element.currentColor = undefined;
        expect(element.hasAttribute('current-color')).toBe(false);
        element.currentColor = true;
        element.currentColor = true;
        expect(element.hasAttribute('current-color')).toBe(true);
    });

    it('hands out a new readyPromise after one has settled', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);
        const first = element.readyPromise;

        element.src = '/other.json';
        expect(element.readyPromise).not.toBe(first);
        const second = element.readyPromise;
        await settle();
        await becomeReady(stub.player);
        await expect(second).resolves.toBe(true);

        element.remove();
        await settle();
        document.body.append(element);
        const third = element.readyPromise;
        expect(third).not.toBe(second);
        await settle();
        await becomeReady(stub.player);
        await expect(third).resolves.toBe(true);
    });

    it('recovers from a failed load when src is fixed', async () => {
        stubFetch(iconData(), 404);
        const element = mount({ src: '/missing.json' });
        const failed = element.readyPromise;
        await settle();
        await expect(failed).rejects.toThrow(/404/);

        stubFetch();
        element.src = '/lock.json';
        const fixed = element.readyPromise;
        await settle();
        await becomeReady(stub.player);
        await expect(fixed).resolves.toBe(true);
    });
});

describe('an unknown state', () => {
    it('warns when the icon loads, when the attribute changes and when play() asks for it', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const element = mount({ src: '/lock.json', state: 'hover-nope' });
        await settle();
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain('"hover-nope"');

        await becomeReady(stub.player);
        element.state = 'morph-clos';
        expect(warn).toHaveBeenCalledTimes(2);

        void element.play({ state: 'in-nope' });
        expect(warn).toHaveBeenCalledTimes(3);
        warn.mockRestore();
    });

    it('stays quiet for a state the icon has, for none and for all of them', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const element = mount({ src: '/lock.json', state: 'morph-close' });
        await settle();
        await becomeReady(stub.player);

        element.state = '*';
        element.state = null;
        void element.play({ state: 'morph-close' });
        void element.play();
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('intro, loading and motion', () => {
    it('warn when they change after the icon started loading, and apply from the next load', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const element = mount({ src: '/lock.json', loading: 'lazy' });
        expect(warn).not.toHaveBeenCalled();

        element.setAttribute('intro', '');
        element.setAttribute('loading', 'interaction');
        element.setAttribute('motion', 'always');
        expect(warn).toHaveBeenCalledTimes(3);
        expect(warn.mock.calls[1][0]).toContain('"loading"');

        // The next load reads the new value: this one waits for an interaction.
        element.src = '/other.json';
        await settle();
        expect(stub.created).toHaveLength(0);
        element.click();
        await settle();
        expect(stub.created).toHaveLength(1);
        warn.mockRestore();
    });

    it('stay quiet when set before the element is on the page', () => {
        defineForTests();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const element = document.createElement('lord-icon');
        element.setAttribute('intro', '');
        element.setAttribute('loading', 'lazy');
        element.setAttribute('motion', 'always');
        element.src = '/lock.json';
        document.body.append(element);

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('stay quiet after src on an icon upgraded on the page, which loads once', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // Rendered on a server, src first as JSX writes it; the script defines the element later.
        document.body.innerHTML =
            '<html-icon src="/lock.json" intro loading="interaction" motion="always"></html-icon>';
        defineOnPage('html-icon');
        const element = document.body.firstElementChild as LordIconElement;
        await settle();

        expect(warn).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();

        element.click();
        await settle();
        expect(fetch).toHaveBeenCalledOnce();
        expect(stub.created).toHaveLength(1);
        warn.mockRestore();
    });
});
