import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { stubIntersectionObserver } from '../testing/observers.ts';
import { In } from './in.ts';

let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    io = stubIntersectionObserver();
    vi.useFakeTimers();
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.replaceChildren();
});

describe('in', () => {
    it('plays once the icon is visible', async () => {
        const { context, player, element, ready } = makeContext();
        ready(new In(context));
        expect(player.calls).toEqual([]);

        io.show(element);
        await Promise.resolve();
        expect(player.calls).toEqual(['play:start']);
        expect(io.watching(element)).toBe(0);
    });

    it('waits the delay first', async () => {
        const { context, player, element, ready } = makeContext({ options: { delay: '200' } });
        ready(new In(context));
        io.show(element);
        await Promise.resolve();
        expect(player.calls).toEqual([]);
        vi.advanceTimersByTime(200);
        expect(player.calls).toEqual(['play:start']);
    });

    it('jumps to the end under reduced motion', async () => {
        const { context, player, element, ready } = makeContext({ reducedMotion: true });
        ready(new In(context));
        io.show(element);
        await Promise.resolve();
        expect(player.calls).toEqual(['seek:end']);
    });

    it('stops watching when torn down', async () => {
        const { context, player, element, ready, controller } = makeContext();
        ready(new In(context));
        controller.abort();
        await Promise.resolve();
        expect(io.watching(element)).toBe(0);
        io.show(element);
        await Promise.resolve();
        expect(player.calls).toEqual([]);
    });
});
