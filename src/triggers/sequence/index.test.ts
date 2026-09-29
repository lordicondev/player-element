import type { IconState } from '@lordicon/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../../testing/context.ts';
import { Sequence } from './index.ts';

const states = [
    { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
    { name: 'hover-jump', time: 40, duration: 30, params: [], default: true },
    { name: 'morph-x', time: 100, duration: 60, params: ['0.5'], default: false },
    { name: 'morph-y', time: 200, duration: 60, params: [], default: false },
] as IconState[];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
});

function run(steps: string, extra: Record<string, unknown> = {}) {
    const made = makeContext({ states, state: 'hover-jump', options: { steps }, ...extra });
    const trigger = new Sequence(made.context);
    made.ready(trigger);

    /** Finishes the play in progress and lets the script go on. */
    const finish = async () => {
        made.player.emit('complete');
        await vi.advanceTimersByTimeAsync(0);
    };

    return { ...made, trigger, finish };
}

describe('sequence', () => {
    it('plays states in turn and starts over at the end', async () => {
        const { player, finish } = run('play in-reveal, play hover-jump reverse');
        expect(player.calls).toEqual(['play:state']);
        expect(player.state).toBe('in-reveal');

        await finish();
        expect(player.calls).toEqual(['play:state', 'play:state']);
        expect(player.state).toBe('hover-jump');
        expect(player.direction).toBe(-1);

        await finish();
        expect(player.calls).toHaveLength(3);
        expect(player.state).toBe('in-reveal');
    });

    it("plays the element's own state when the step names none", () => {
        const made = makeContext({ states, options: { steps: 'play' } });
        made.element.setAttribute('state', 'in-reveal');
        made.ready(new Sequence(made.context));
        expect(made.player.state).toBe('in-reveal');
    });

    it('plays the halves of a morph, by its ratio or forwards and backwards', async () => {
        const { player, finish } = run('play morph-x there, play morph-x back');
        expect(player.lastSegment).toEqual([100, 130]);
        await finish();
        expect(player.lastSegment).toEqual([130, 161]);

        const plain = run('play morph-y there, play morph-y back');
        expect(plain.player.lastSegment).toEqual([200, 261]);
        expect(plain.player.direction).toBe(1);
        await plain.finish();
        expect(plain.player.lastSegment).toEqual([200, 261]);
        expect(plain.player.direction).toBe(-1);
    });

    it('plays a range of frames counted from the state, both ends included', async () => {
        const { player, finish } = run('play hover-jump 5-10, play hover-jump 20-end');
        expect(player.lastSegment).toEqual([45, 51]);
        await finish();
        expect(player.lastSegment).toEqual([60, 71]);
    });

    it('shows frames and holds them', () => {
        const { player } = run('show morph-x there, stop');
        expect(player.calls).toEqual(['segment', 'seek']);

        const last = run('show in-reveal end');
        expect(last.player.calls).toEqual(['segment', 'seek:end']);
        expect(last.player.state).toBe('in-reveal');
    });

    it('runs a script that does not move once, as a still pose', () => {
        const { player } = run('show in-reveal 10, show hover-jump end');
        expect(player.calls).toEqual(['segment', 'seek', 'segment', 'seek:end']);
        vi.advanceTimersByTime(1000);
        expect(player.calls).toHaveLength(4);
    });

    it('waits, and stops for good at stop', async () => {
        const { player, finish } = run('wait 100, play in-reveal, stop');
        expect(player.calls).toEqual([]);
        await vi.advanceTimersByTimeAsync(100);
        expect(player.calls).toEqual(['play:state']);

        await finish();
        await vi.advanceTimersByTimeAsync(1000);
        await finish();
        expect(player.calls).toEqual(['play:state']);
    });

    it('ends when something else cuts a play short, and starts over on a new state', async () => {
        const { player, trigger, element, finish } = run('play in-reveal, play hover-jump');
        void player.play({ from: 'start' }); // a method call takes over
        await finish();
        expect(player.calls).toEqual(['play:state', 'play:start']);

        element.setAttribute('state', 'hover-jump');
        trigger.onState();
        expect(player.calls).toEqual(['play:state', 'play:start', 'play:state']);
        expect(player.state).toBe('in-reveal');
    });

    it('stops with the trigger', async () => {
        const { player, controller, finish } = run('wait 200, play');
        controller.abort();
        await vi.advanceTimersByTimeAsync(200);
        await finish();
        expect(player.calls).toEqual([]);
    });

    it('lands on the end of each play under reduced motion, once', async () => {
        const { player } = run('play in-reveal, wait 500, play morph-x there', {
            reducedMotion: true,
        });
        expect(player.calls).toEqual(['segment', 'seek:end', 'segment', 'seek']);
        expect(player.state).toBe('morph-x');
        await vi.advanceTimersByTimeAsync(1000);
        expect(player.calls).toHaveLength(4);
    });

    it('warns about an empty script', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { player } = run('');
        expect(player.calls).toEqual([]);
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });
});
