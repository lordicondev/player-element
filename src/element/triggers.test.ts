import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { defineForTests } from '../testing/context.ts';
import { morphState } from '../testing/player-stub.ts';
import { BaseTrigger } from '../triggers/base.ts';
import type { Command, TriggerContext } from '../triggers/types.ts';
import { LordIconElement } from './element.ts';

/** Records what the element does with its trigger. */
const log: string[] = [];

class Probe extends BaseTrigger {
    constructor(context: TriggerContext) {
        super(context);
        log.push('create');
        this.listen(this.target, 'click', () => log.push('click'));
        this.signal.addEventListener('abort', () => log.push('abort'));
    }

    onReady(): void {
        log.push('ready');
    }

    onState(): void {
        log.push('state');
    }

    onFrame(): void {
        log.push('frame');
    }

    onComplete(): void {
        log.push('complete');
    }
}

let stub: ReturnType<typeof useStubPlayer>;

beforeEach(() => {
    defineForTests();
    LordIconElement.defineTrigger('probe', Probe);
    stub = useStubPlayer({ states: morphState() });
    stubFetch();
    log.length = 0;
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

async function ready(attributes: Record<string, string> = {}) {
    const element = mount({ src: '/lock.json', ...attributes });
    await settle();
    await becomeReady(stub.player);
    return element;
}

describe('the element and its trigger', () => {
    it('starts a trigger set while the icon loads, once it is ready', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        element.setAttribute('trigger', 'probe');
        expect(log).toEqual([]);

        await becomeReady(stub.player);
        expect(log).toEqual(['create', 'ready']);
    });

    it('restarts the trigger when the attribute changes, and stops it when removed', async () => {
        const element = await ready({ trigger: 'probe' });
        log.length = 0;

        element.setAttribute('trigger', 'probe(1)');
        expect(log).toEqual(['abort', 'create', 'ready']);

        log.length = 0;
        element.removeAttribute('trigger');
        element.click();
        expect(log).toEqual(['abort']);
    });

    it('listens on a new target once target changes', async () => {
        const outer = document.createElement('div');
        const inner = document.createElement('div');
        outer.className = 'outer';
        inner.className = 'inner';
        outer.append(inner);
        document.body.append(outer);

        const element = document.createElement('lord-icon');
        element.setAttribute('src', '/lock.json');
        element.setAttribute('trigger', 'probe');
        element.setAttribute('target', '.outer');
        inner.append(element);
        await settle();
        await becomeReady(stub.player);

        outer.click();
        element.setAttribute('target', '.inner');
        log.length = 0;
        outer.click();
        expect(log).toEqual([]);
        inner.click();
        expect(log).toEqual(['click']);
    });

    it('tears the trigger down on a new icon and on removal', async () => {
        const element = await ready({ trigger: 'probe' });
        log.length = 0;

        element.src = '/other.json';
        expect(log).toEqual(['abort']);
        await settle();
        await becomeReady(stub.player);
        expect(log).toEqual(['abort', 'create', 'ready']);

        log.length = 0;
        element.remove();
        await settle();
        element.click();
        expect(log).toEqual(['abort']);
    });

    it('passes state changes, frames and completes to the trigger', async () => {
        const element = await ready({ trigger: 'probe' });
        log.length = 0;

        element.setAttribute('state', 'morph-close');
        stub.player.emit('frame');
        stub.player.emit('complete');
        expect(log).toEqual(['state', 'frame', 'complete']);
    });
});

/** Takes over whatever `take` returns for; logs every command it sees. */
class Taker extends BaseTrigger {
    static take: (command: Command) => boolean | Promise<boolean> | void = () => {};

    onCommand(command: Command): boolean | Promise<boolean> | void {
        log.push(`command:${command.name}`);
        return Taker.take(command);
    }
}

describe('currentTrigger', () => {
    it('is the running trigger, from ready until it is replaced or removed', async () => {
        const element = mount({ src: '/lock.json', trigger: 'probe' });
        await settle();
        expect(element.currentTrigger).toBeNull();

        await becomeReady(stub.player);
        const first = element.currentTrigger;
        expect(first).toBeInstanceOf(Probe);

        element.setAttribute('trigger', 'probe');
        expect(element.currentTrigger).toBe(first);
        element.setAttribute('trigger', 'probe()');
        expect(element.currentTrigger).toBeInstanceOf(Probe);
        expect(element.currentTrigger).not.toBe(first);

        element.removeAttribute('trigger');
        expect(element.currentTrigger).toBeNull();
    });

    it('is null once the icon leaves the page', async () => {
        const element = await ready({ trigger: 'probe' });
        element.remove();
        await settle();
        expect(element.currentTrigger).toBeNull();
    });
});

describe('the trigger event', () => {
    it('comes once the trigger runs, with it as detail, and again on a new trigger', async () => {
        const seen: unknown[] = [];
        const element = mount({ src: '/lock.json', trigger: 'probe' });
        element.addEventListener('trigger', (event) => {
            seen.push(event.detail);
            // The element holds the trigger already.
            expect(element.currentTrigger).toBe(event.detail);
        });
        element.addEventListener('ready', () => seen.push('ready'));
        await settle();
        await becomeReady(stub.player);

        expect(seen).toHaveLength(2);
        expect(seen[0]).toBe('ready');
        expect(seen[1]).toBeInstanceOf(Probe);

        element.setAttribute('trigger', 'probe()');
        expect(seen).toHaveLength(3);
        expect(seen[2]).not.toBe(seen[1]);

        element.removeAttribute('trigger');
        expect(seen[3]).toBeNull();
    });

    it('comes with null when the trigger goes with the icon: a new src, or off the page', async () => {
        const seen: unknown[] = [];
        const element = mount({ src: '/lock.json', trigger: 'probe' });
        element.addEventListener('trigger', (event) => seen.push(event.detail));
        await settle();
        await becomeReady(stub.player);
        expect(seen).toHaveLength(1);

        element.src = '/other.json';
        expect(seen).toEqual([expect.any(Probe), null]);
        expect(element.currentTrigger).toBeNull();

        await settle();
        await becomeReady(stub.player);
        element.remove();
        expect(seen).toHaveLength(3); // a microtask later: it may be a move
        await settle();
        expect(seen).toEqual([expect.any(Probe), null, expect.any(Probe), null]);
    });
});

describe('the interaction that loads the icon', () => {
    it('goes to what the trigger listens for on its target, and only once', async () => {
        const element = mount({ src: '/lock.json', trigger: 'probe', loading: 'interaction' });
        let page = 0;
        element.addEventListener('click', () => page++);
        await settle();

        element.click();
        await settle();
        await becomeReady(stub.player);

        expect(log.filter((entry) => entry === 'click')).toHaveLength(1);
        expect(page).toBe(1);
    });
});

describe('onCommand', () => {
    beforeEach(() => {
        LordIconElement.defineTrigger('taker', Taker);
        Taker.take = () => {};
    });

    it('sees each method before the player runs it', async () => {
        const element = await ready({ trigger: 'taker' });
        stub.player.calls.length = 0;

        void element.play({ from: 'start' });
        element.pause();
        element.seek('end');
        element.stop();
        expect(log).toEqual(['command:play', 'command:pause', 'command:seek', 'command:stop']);
        expect(stub.player.calls).toEqual(['play:start', 'pause', 'seek:end', 'stop']);
    });

    it('leaves the player alone when the trigger takes the command', async () => {
        const element = await ready({ trigger: 'taker' });
        stub.player.calls.length = 0;
        Taker.take = () => true;

        element.pause();
        element.seek(12);
        element.stop();
        await expect(element.play()).resolves.toBe(true);
        expect(stub.player.calls).toEqual([]);
    });

    it('resolves play() with the promise the trigger gives', async () => {
        const element = await ready({ trigger: 'taker' });
        Taker.take = (command) => (command.name === 'play' ? Promise.resolve(false) : undefined);
        await expect(element.play()).resolves.toBe(false);
    });

    it('passes the command itself', async () => {
        const element = await ready({ trigger: 'taker' });
        const seen: Command[] = [];
        Taker.take = (command) => void seen.push(command);

        void element.play({ state: 'morph-close' });
        element.seek(5);
        expect(seen).toEqual([
            { name: 'play', options: { state: 'morph-close' } },
            { name: 'seek', frame: 5 },
        ]);
    });

    it('is not asked about commands queued before ready', async () => {
        const element = mount({ src: '/lock.json', trigger: 'taker' });
        element.pause();
        await settle();
        await becomeReady(stub.player);
        expect(log).toEqual([]);
        expect(stub.player.calls).toContain('pause');
    });
});
