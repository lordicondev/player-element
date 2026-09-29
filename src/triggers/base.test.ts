import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { BaseTrigger } from './base.ts';
import { Loop } from './loop.ts';
import { Sequence } from './sequence/index.ts';
import type { TriggerContext } from './types.ts';

class Probe extends BaseTrigger {
    clicks = 0;
    changes = 0;
    fired = 0;

    constructor(context: TriggerContext) {
        super(context);
        this.listen(this.target, 'click', () => this.clicks++);
        this.watch(this.target, 'aria-pressed', () => this.changes++);
        this.timeout(() => this.fired++, 50);
    }

    read(name: string, fallback?: string) {
        return fallback === undefined ? this.option(name) : this.option(name, fallback);
    }

    count(name: string) {
        return this.number(name, 7);
    }

    schedule(callback: () => void, ms: number) {
        return this.timeout(callback, ms);
    }
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
});

describe('BaseTrigger', () => {
    it('reads options with fallbacks', () => {
        const { context } = makeContext({ options: { delay: '250', bad: 'x' } });
        const probe = new Probe(context);

        expect(probe.read('delay')).toBe('250');
        expect(probe.read('missing')).toBeUndefined();
        expect(probe.read('missing', 'y')).toBe('y');
        expect(probe.count('delay')).toBe(250);
        expect(probe.count('bad')).toBe(7);
        expect(probe.count('missing')).toBe(7);
    });

    it('listens, watches and times until torn down', async () => {
        const { context, target, controller, set } = makeContext();
        const probe = new Probe(context);

        target.click();
        await set('aria-pressed', 'true');
        vi.advanceTimersByTime(60);
        expect([probe.clicks, probe.changes, probe.fired]).toEqual([1, 1, 1]);

        const late = new Probe(context);
        controller.abort();

        target.click();
        await set('aria-pressed', 'false');
        vi.advanceTimersByTime(60);
        expect([probe.clicks, probe.changes]).toEqual([1, 1]);
        expect([late.clicks, late.changes, late.fired]).toEqual([0, 0, 0]);
    });
});

describe('timeouts and the element commands', () => {
    it('add one abort listener however many timeouts run, and clear them all at teardown', () => {
        const { context, controller } = makeContext();
        const added = vi.spyOn(context.signal, 'addEventListener');
        const trigger = new Probe(context);
        const after = added.mock.calls.length;

        let rounds = 0;
        const again = () => {
            rounds++;
            trigger.schedule(again, 10);
        };
        again();
        vi.advanceTimersByTime(1000);
        expect(rounds).toBeGreaterThan(90);
        expect(added.mock.calls.length).toBe(after);

        controller.abort();
        const done = rounds;
        vi.advanceTimersByTime(1000);
        expect(rounds).toBe(done);
        expect(trigger.fired).toBe(1);
    });

    it("hold on the element's pause() and run out after play()", () => {
        const { context, player, ready } = makeContext({ options: { delay: '500' } });
        const trigger = new Loop(context);
        ready(trigger);

        vi.advanceTimersByTime(200);
        expect(trigger.onCommand({ name: 'pause' })).toBeUndefined(); // the player pauses too
        vi.advanceTimersByTime(1000);
        expect(player.calls).toEqual([]);

        // play() takes over, so the player does not start over the look it waits on.
        expect(trigger.onCommand({ name: 'play', options: {} })).toBe(true);
        vi.advanceTimersByTime(299);
        expect(player.calls).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(player.calls).toEqual(['play:start']);
    });

    it('let any other command through, and run out as before', () => {
        const { context, player, ready } = makeContext({ options: { delay: '500' } });
        const trigger = new Loop(context);
        ready(trigger);

        trigger.onCommand({ name: 'pause' });
        expect(trigger.onCommand({ name: 'seek', frame: 10 })).toBeUndefined();
        vi.advanceTimersByTime(500);
        expect(player.calls).toEqual(['play:start']);
    });

    it('leave play() to the player when nothing waits', () => {
        const { context, ready } = makeContext();
        const trigger = new Loop(context);
        ready(trigger);

        trigger.onCommand({ name: 'pause' });
        expect(trigger.onCommand({ name: 'play', options: {} })).toBeUndefined();
    });

    it('hold a wait of a sequence', async () => {
        const { context, player, ready } = makeContext({
            states: [
                { name: 'in-reveal', time: 0, duration: 30, params: [], default: true },
            ] as never,
            options: { steps: 'wait 300, play in-reveal' },
        });
        const trigger = new Sequence(context);
        ready(trigger);

        trigger.onCommand({ name: 'pause' });
        await vi.advanceTimersByTimeAsync(1000);
        expect(player.calls).toEqual([]);
        trigger.onCommand({ name: 'play', options: {} });
        await vi.advanceTimersByTimeAsync(300);
        expect(player.calls).toEqual(['play:state']);
    });

    it('are held when made while paused', () => {
        const { context, player, ready } = makeContext({ options: { delay: '500' } });
        const trigger = new Loop(context);
        ready(trigger);
        vi.advanceTimersByTime(500);
        trigger.onCommand({ name: 'pause' }); // nothing waits: not held
        trigger.onComplete();
        trigger.onCommand({ name: 'pause' });
        vi.advanceTimersByTime(1000);
        expect(player.calls).toEqual(['play:start']);
    });
});
