import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineElement } from '../index.ts';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { iconData } from '../testing/icon.ts';
import type { LordIconElement } from './element.ts';

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

/** A button somewhere else on the page, not around the icon. */
function button(): HTMLButtonElement {
    const found = document.createElement('button');
    document.body.append(found);
    return found;
}

async function ready(attributes: Record<string, string>): Promise<LordIconElement> {
    const element = mount({ src: '/lock.json', ...attributes });
    await settle();
    await becomeReady(stub.player);
    return element;
}

describe('target as an element', () => {
    it('follows any element, not only an ancestor', async () => {
        const element = await ready({ trigger: 'click' });
        const other = button();

        element.target = other;
        expect(element.target).toBe(other);
        expect(element.hasAttribute('target')).toBe(false);

        element.click();
        expect(stub.player.calls).toEqual(['init']);
        other.click();
        expect(stub.player.calls).toEqual(['init', 'play:start']);
    });

    it('starts the trigger on it when given before the icon is ready', async () => {
        const other = button();
        const element = mount({ src: '/lock.json', trigger: 'click' });
        element.target = other;
        await settle();
        await becomeReady(stub.player);

        other.click();
        expect(stub.player.calls).toEqual(['init', 'play:start']);
    });

    it('drives follow from the attribute of the element', async () => {
        const other = button();
        other.setAttribute('aria-pressed', 'false');
        const element = mount({ src: '/lock.json', trigger: 'follow' });
        element.target = other;
        await settle();
        await becomeReady(stub.player);
        const before = stub.player.calls.length;

        other.setAttribute('aria-pressed', 'true');
        await settle();
        expect(stub.player.calls.length).toBeGreaterThan(before);
    });

    it('gives way to a target attribute set later, and to null', async () => {
        const element = await ready({ trigger: 'click' });
        const other = button();
        element.target = other;

        element.setAttribute('target', 'body');
        expect(element.target).toBe('body');
        other.click(); // reaches body too
        expect(stub.player.calls).toEqual(['init', 'play:start']);

        element.target = other;
        element.target = null;
        expect(element.target).toBeNull();
        stub.player.calls.length = 0;
        other.click();
        expect(stub.player.calls).toEqual([]);
        element.click();
        expect(stub.player.calls).toEqual(['play:start']);
    });

    it('keeps the trigger when set to the element it already follows', async () => {
        const element = await ready({ trigger: 'click', target: 'body' });
        const trigger = element.currentTrigger;

        element.target = document.body;
        expect(element.currentTrigger).toBe(trigger);
    });
});

describe('properties set before the element is defined', () => {
    it('reach the element once it is', async () => {
        const other = button();
        const data = iconData();
        const early = document.createElement('early-icon') as LordIconElement;
        early.icon = data;
        early.state = 'hover-jump';
        early.trigger = 'click';
        early.target = other;
        document.body.append(early);

        defineElement({ tag: 'early-icon' });
        await settle();
        await becomeReady(stub.player);

        expect(early.icon).toBe(data);
        expect(early.getAttribute('state')).toBe('hover-jump');
        expect(early.target).toBe(other);
        expect(fetch).not.toHaveBeenCalled();
        expect(stub.created).toHaveLength(1);

        other.click();
        expect(stub.player.calls).toEqual(['init', 'play:start']);
    });
});
