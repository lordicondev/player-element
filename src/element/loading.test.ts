import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineForTests } from '../testing/context.ts';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { iconData } from '../testing/icon.ts';
import { stubIntersectionObserver } from '../testing/observers.ts';
import { morphState } from '../testing/player-stub.ts';
import { BaseTrigger } from '../triggers/base.ts';
import type { TriggerContext } from '../triggers/types.ts';
import { parseLoading } from './attributes.ts';
import { LordIconElement } from './element.ts';

/** What the `heard` trigger was handed or heard on its target. */
const heard: string[] = [];

class Heard extends BaseTrigger {
    constructor(context: TriggerContext) {
        super(context);
        for (const type of ['pointerenter', 'click', 'focus'] as const) {
            this.listen(this.target, type, () => heard.push(type));
        }
    }
}
LordIconElement.defineTrigger('heard', Heard);

/** A `<lord-icon>` with `loading="interaction"` inside a target made of `html`. */
function inTarget(html: string, attributes: Record<string, string>) {
    defineForTests();
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const target = holder.firstElementChild as HTMLElement;
    target.classList.add('target');
    document.body.append(target);

    const element = document.createElement('lord-icon');
    element.setAttribute('src', '/lock.json');
    element.setAttribute('loading', 'interaction');
    element.setAttribute('target', '.target');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    target.append(element);
    return { target, element };
}

let stub: ReturnType<typeof useStubPlayer>;
let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    stub = useStubPlayer();
    stubFetch();
    io = stubIntersectionObserver();
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.replaceChildren();
});

describe('parseLoading', () => {
    it('reads the three strategies and the delay', () => {
        expect(parseLoading(null)).toEqual({ kind: 'eager' });
        expect(parseLoading('lazy')).toEqual({ kind: 'lazy' });
        expect(parseLoading('Interaction')).toEqual({ kind: 'interaction' });
        expect(parseLoading('delay:500')).toEqual({ kind: 'delay', ms: 500 });
        expect(parseLoading('delay')).toEqual({ kind: 'delay', ms: 0 });
        expect(parseLoading('nonsense')).toEqual({ kind: 'eager' });
    });
});

describe('loading strategies', () => {
    it('lazy: loads once the element is visible', async () => {
        const element = mount({ src: '/lock.json', loading: 'lazy' });
        await settle();
        expect(stub.created).toHaveLength(0);

        io.show(element);
        await settle();
        expect(stub.created).toHaveLength(1);
        expect(io.watching(element)).toBe(0);
    });

    it('interaction: loads on the first pointer event and hands it to the trigger', async () => {
        const button = document.createElement('button');
        button.className = 'btn';
        document.body.append(button);
        const element = document.createElement('lord-icon');
        element.setAttribute('src', '/lock.json');
        element.setAttribute('loading', 'interaction');
        element.setAttribute('target', '.btn');
        element.setAttribute('trigger', 'hover');
        button.append(element);
        const seen: string[] = [];
        button.addEventListener('pointerenter', () => seen.push('pointerenter'));

        await settle();
        expect(stub.created).toHaveLength(0);

        button.dispatchEvent(new Event('pointerenter'));
        await settle();
        expect(stub.created).toHaveLength(1);
        expect(seen).toEqual(['pointerenter']);

        await becomeReady(stub.player);
        // The hover plays for the pointer that loaded the icon; the page heard it once.
        expect(stub.player.calls).toContain('play:start');
        expect(seen).toEqual(['pointerenter']);
    });

    it('delay: loads after the given time', async () => {
        vi.useFakeTimers();
        mount({ src: '/lock.json', loading: 'delay:300' });
        await vi.advanceTimersByTimeAsync(299);
        expect(stub.created).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(1);
        expect(stub.created).toHaveLength(1);
    });

    it('stops waiting when the element is disconnected', async () => {
        const element = mount({ src: '/lock.json', loading: 'lazy' });
        const error = vi.fn();
        element.addEventListener('error', error);
        await settle();

        element.remove();
        io.show(element);
        await settle();
        expect(stub.created).toHaveLength(0);
        expect(error).not.toHaveBeenCalled();
    });

    it('interaction: a click that loads a click icon plays it, and the page hears it once', async () => {
        const button = document.createElement('button');
        button.className = 'btn';
        document.body.append(button);
        const element = document.createElement('lord-icon');
        element.setAttribute('src', '/lock.json');
        element.setAttribute('loading', 'interaction');
        element.setAttribute('target', '.btn');
        element.setAttribute('trigger', 'click');
        button.append(element);
        let page = 0;
        let target = 0;
        document.addEventListener('click', () => page++);
        button.addEventListener('click', () => target++);
        await settle();

        button.click();
        await settle();
        await becomeReady(stub.player);

        expect(stub.player.calls.filter((call) => call.startsWith('play'))).toHaveLength(1);
        expect(target).toBe(1);
        expect(page).toBe(1);
    });

    it('interaction: a pointer that left before the icon was ready is not handed over', async () => {
        const element = mount({ src: '/lock.json', loading: 'interaction', trigger: 'hover' });
        await settle();

        element.dispatchEvent(new Event('pointerenter'));
        await settle();
        element.dispatchEvent(new Event('pointerleave'));
        await becomeReady(stub.player);

        expect(stub.player.calls.some((call) => call.startsWith('play'))).toBe(false);
    });

    it('interaction: keyboard focus loads the icon, also on a field inside the target', async () => {
        heard.length = 0;
        const { target } = inTarget('<label><input /></label>', { trigger: 'heard' });
        await settle();
        expect(stub.created).toHaveLength(0);

        target.querySelector('input')!.focus();
        await settle();
        expect(stub.created).toHaveLength(1);

        await becomeReady(stub.player);
        expect(heard).toEqual(['focus']);
    });

    it('interaction: what came while the icon loaded goes to the trigger, the latest of each, in order', async () => {
        heard.length = 0;
        const { target } = inTarget('<button></button>', { trigger: 'heard' });
        await settle();

        target.dispatchEvent(new Event('pointerenter'));
        await settle();
        target.click();
        target.click();
        await becomeReady(stub.player);
        expect(heard).toEqual(['pointerenter', 'click']);

        // Then the trigger hears the target itself, once.
        target.click();
        expect(heard).toEqual(['pointerenter', 'click', 'click']);
    });

    it('interaction: a click that comes while the icon loads plays a click icon', async () => {
        const { target } = inTarget('<button></button>', { trigger: 'click' });
        await settle();

        target.dispatchEvent(new Event('pointerenter'));
        await settle();
        target.click();
        await becomeReady(stub.player);

        expect(stub.player.calls.filter((call) => call.startsWith('play'))).toHaveLength(1);
    });

    it('interaction: follow animates a change the page made while the icon loaded', async () => {
        stub.restore();
        stub = useStubPlayer({ states: morphState() });
        const { target } = inTarget('<button aria-pressed="false"></button>', {
            trigger: 'follow',
            state: 'morph-close',
        });
        target.addEventListener('click', () => target.setAttribute('aria-pressed', 'true'));
        await settle();

        target.click();
        await settle();
        await becomeReady(stub.player);

        // From the look before the click, then the morph: not a jump to the end.
        expect(stub.player.calls).toContain('play:segment');
        expect(stub.player.lastSegment).toEqual([0, 30]);
    });

    it('interaction: a trigger that does not listen for the event is left alone', async () => {
        const element = mount({ src: '/lock.json', loading: 'interaction', trigger: 'loop' });
        await settle();

        element.dispatchEvent(new Event('pointerenter'));
        await settle();
        await becomeReady(stub.player);

        expect(stub.created).toHaveLength(1);
    });
});

describe('load()', () => {
    it.each([
        ['lazy', 'lazy'],
        ['interaction', 'interaction'],
        ['delay', 'delay:10000'],
    ])('loads at once, whatever %s waits for', async (_, loading) => {
        const element = mount({ src: '/lock.json', loading });
        await settle();
        expect(stub.created).toHaveLength(0);

        const ready = element.load();
        await settle();
        expect(stub.created).toHaveLength(1);

        await becomeReady(stub.player);
        await expect(ready).resolves.toBe(true);
        expect(element.ready).toBe(true);
    });

    it('stops watching for the interaction it no longer waits for', async () => {
        const element = mount({ src: '/lock.json', loading: 'interaction', trigger: 'hover' });
        await settle();

        element.load();
        await settle();
        await becomeReady(stub.player);
        const calls = stub.player.calls.length;

        // The next pointer is a hover like any other, not a replay of a load.
        element.dispatchEvent(new Event('pointerenter'));
        await settle();
        expect(stub.created).toHaveLength(1);
        expect(stub.player.calls.length).toBe(calls + 1);
    });

    it('does not load a ready icon again, and loads only once when called twice', async () => {
        const element = mount({ src: '/lock.json', loading: 'lazy' });
        await settle();

        void element.load();
        void element.load();
        await settle();
        await becomeReady(stub.player);
        await expect(element.load()).resolves.toBe(true);
        await settle();

        expect(stub.created).toHaveLength(1);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('loads at once when the element is added later', async () => {
        defineForTests();
        const element = document.createElement('lord-icon');
        element.setAttribute('src', '/lock.json');
        element.setAttribute('loading', 'lazy');

        const ready = element.load();
        document.body.append(element);
        await settle();
        expect(stub.created).toHaveLength(1);

        await becomeReady(stub.player);
        await expect(ready).resolves.toBe(true);
    });

    it('lets a new src wait for the loading strategy again', async () => {
        const element = mount({ src: '/lock.json', loading: 'lazy' });
        element.load();
        await settle();
        await becomeReady(stub.player);

        element.src = '/other.json';
        await settle();
        expect(stub.created).toHaveLength(1);

        io.show(element);
        await settle();
        expect(stub.created).toHaveLength(2);
    });

    it('readyPromise is false off the page, and waits for an icon a ready listener swaps in', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);
        expect(await element.readyPromise).toBe(true);

        element.remove();
        await settle();
        expect(await element.readyPromise).toBe(false);

        element.addEventListener('ready', () => (element.src = '/other.json'), { once: true });
        document.body.append(element);
        await settle();
        await becomeReady(stub.player);
        let settledWith: boolean | null = null;
        void element.readyPromise.then((value) => (settledWith = value));
        await settle();
        expect(settledWith).toBeNull();

        await becomeReady(stub.player);
        await settle();
        expect(settledWith).toBe(true);
        expect(element.ready).toBe(true);
    });

    it('rejects when the icon cannot load', async () => {
        stubFetch(null, 404);
        const element = mount({ src: '/missing.json', loading: 'lazy' });

        await expect(element.load()).rejects.toThrow('404');
    });
});

describe('loading of its own', () => {
    it('lets a subclass load an icon, and leave the rest to the element', async () => {
        const { LordIconElement } = await import('./element.ts');
        const { defineElement } = await import('../index.ts');
        const seen: string[] = [];
        class SecretIcon extends LordIconElement {
            protected async loadIcon(src: string, signal: AbortSignal) {
                seen.push(src);
                expect(signal).toBeInstanceOf(AbortSignal);
                if (src.endsWith('.enc')) return iconData();
                return super.loadIcon(src, signal);
            }
        }
        defineElement({ tag: 'secret-icon', element: SecretIcon });
        expect(customElements.get('secret-icon')).toBe(SecretIcon);

        const fetch = stubFetch();
        const secret = document.createElement('secret-icon') as InstanceType<typeof SecretIcon>;
        secret.setAttribute('src', '/lock.enc');
        document.body.append(secret);
        await settle();
        expect(fetch).not.toHaveBeenCalled();

        secret.setAttribute('src', '/lock.json');
        await settle();
        expect(fetch).toHaveBeenCalledOnce();
        expect(seen).toEqual(['/lock.enc', '/lock.json']);
        await becomeReady(stub.player);
        expect(secret.ready).toBe(true);
    });

    it('shows a failed load of its own as the error event', async () => {
        const { LordIconElement } = await import('./element.ts');
        const { defineElement } = await import('../index.ts');
        class Broken extends LordIconElement {
            protected async loadIcon(): Promise<never> {
                throw new Error('no key');
            }
        }
        defineElement({ tag: 'broken-icon', element: Broken });
        const broken = document.createElement('broken-icon') as InstanceType<typeof Broken>;
        const errors: Error[] = [];
        broken.addEventListener('error', (event) => errors.push(event.detail));
        broken.setAttribute('src', '/lock.enc');
        document.body.append(broken);
        await expect(broken.readyPromise).rejects.toThrow('no key');
        expect(errors.map((error) => error.message)).toEqual(['no key']);
    });
});
