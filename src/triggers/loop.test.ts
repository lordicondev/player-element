import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { Loop } from './loop.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
});

describe('loop', () => {
    it('plays on ready and again on every complete', () => {
        const { context, player, ready } = makeContext();
        const trigger = new Loop(context);

        ready(trigger);
        trigger.onComplete();
        expect(player.calls).toEqual(['play:start', 'play:start']);
    });

    it('waits the delay between rounds', () => {
        const { context, player, ready } = makeContext({ options: { delay: '500' } });
        const trigger = new Loop(context);

        ready(trigger);
        expect(player.calls).toEqual([]);
        vi.advanceTimersByTime(500);
        expect(player.calls).toEqual(['play:start']);
    });

    it('stops with the trigger', () => {
        const { context, player, ready, controller } = makeContext({ options: { delay: '500' } });
        const trigger = new Loop(context);

        ready(trigger);
        controller.abort();
        vi.advanceTimersByTime(500);
        expect(player.calls).toEqual([]);
    });

    it('does nothing under reduced motion', () => {
        const { context, player, ready } = makeContext({ reducedMotion: true });
        ready(new Loop(context));
        expect(player.calls).toEqual([]);
    });
});
