import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineForTests } from '../testing/context.ts';
import { becomeReady, settle, stubFetch, useStubPlayer } from '../testing/element.ts';

let stub: ReturnType<typeof useStubPlayer>;
let fetch: ReturnType<typeof stubFetch>;

beforeEach(() => {
    stub = useStubPlayer();
    fetch = stubFetch();
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

/** Two cards on the page, and an icon in the first that follows its card. */
function cards(attributes: Record<string, string> = {}) {
    defineForTests();
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.className = second.className = 'card';
    document.body.append(first, second);

    const element = document.createElement('lord-icon');
    element.setAttribute('src', '/lock.json');
    element.setAttribute('target', '.card');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    first.append(element);
    return { first, second, element };
}

/** Lets the icon load, and makes it ready. */
async function ready(): Promise<void> {
    await settle();
    await becomeReady(stub.player);
}

describe('moving the element', () => {
    it('keeps the icon, its readiness and its trigger when it is back in the same task', async () => {
        const { first, element } = cards({ trigger: 'click' });
        await ready();
        const readyEvent = vi.fn();
        element.addEventListener('ready', readyEvent);
        const { player } = stub;
        const trigger = element.currentTrigger;
        const promise = element.readyPromise;

        first.prepend(document.createElement('span'));
        first.append(element); // out and back in
        await settle();

        expect(stub.created).toHaveLength(1);
        expect(player.calls).toEqual(['init']);
        expect(element.ready).toBe(true);
        expect(element.readyPromise).toBe(promise);
        expect(element.currentTrigger).toBe(trigger);
        expect(readyEvent).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('follows the new target when moved under another ancestor', async () => {
        const { first, second, element } = cards({ trigger: 'click' });
        await ready();
        const trigger = element.currentTrigger;

        second.append(element);
        await settle();
        expect(element.currentTrigger).not.toBe(trigger);
        expect(stub.created).toHaveLength(1);

        first.click();
        expect(stub.player.calls).toEqual(['init']);
        second.click();
        expect(stub.player.calls).toEqual(['init', 'play:start']);
    });

    it('goes on loading when moved while the icon loads', async () => {
        const { second, element } = cards();
        second.append(element);
        await ready();

        expect(fetch).toHaveBeenCalledOnce();
        expect(stub.created).toHaveLength(1);
        expect(element.ready).toBe(true);
    });

    it('waits for an interaction on the new target when moved before it came', async () => {
        const { first, second, element } = cards({ loading: 'interaction' });
        await settle();

        second.append(element);
        await settle();
        first.dispatchEvent(new Event('click'));
        await settle();
        expect(fetch).not.toHaveBeenCalled();

        second.dispatchEvent(new Event('click'));
        await settle();
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('loads the new icon when src changes while it is off the page', async () => {
        const { second, element } = cards();
        await ready();
        const old = stub.player;

        element.remove();
        element.src = '/other.json';
        second.append(element);
        await settle();

        expect(old.calls).toContain('destroy');
        expect(stub.created).toHaveLength(2);
        expect(fetch).toHaveBeenLastCalledWith('/other.json', expect.anything());
    });

    it('unloads when it stays off the page', async () => {
        const { element } = cards();
        await ready();

        element.remove();
        expect(element.ready).toBe(true);
        await settle();
        expect(element.ready).toBe(false);
        expect(stub.player.calls).toContain('destroy');
        await expect(element.readyPromise).resolves.toBe(false);
    });
});
