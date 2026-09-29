import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { LoopOnHover } from './loop-on-hover.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
});

const enter = (target: HTMLElement) => target.dispatchEvent(new Event('pointerenter'));
const leave = (target: HTMLElement) => target.dispatchEvent(new Event('pointerleave'));

describe('loop-on-hover', () => {
    it('loops while the pointer is over the target and finishes the round after it leaves', () => {
        const { context, player, target, ready } = makeContext();
        const trigger = new LoopOnHover(context);
        ready(trigger);

        enter(target);
        player.playing = true;
        trigger.onComplete();
        expect(player.calls).toEqual(['play:start', 'play:start']);

        leave(target);
        trigger.onComplete();
        expect(player.calls).toEqual(['play:start', 'play:start']);
    });

    it('cancels a pending delay when the pointer leaves', () => {
        const { context, player, target, ready } = makeContext({ options: { delay: '300' } });
        ready(new LoopOnHover(context));

        enter(target);
        leave(target);
        vi.advanceTimersByTime(300);
        expect(player.calls).toEqual([]);

        enter(target);
        vi.advanceTimersByTime(300);
        expect(player.calls).toEqual(['play:start']);
    });

    it('does nothing under reduced motion', () => {
        const { context, player, target, ready } = makeContext({ reducedMotion: true });
        ready(new LoopOnHover(context));
        enter(target);
        expect(player.calls).toEqual([]);
    });
});
