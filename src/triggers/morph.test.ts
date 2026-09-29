import { afterEach, describe, expect, it } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { morphState } from '../testing/player-stub.ts';
import { Morph } from './morph.ts';

afterEach(() => document.body.replaceChildren());

const enter = (target: HTMLElement) => target.dispatchEvent(new Event('pointerenter'));
const leave = (target: HTMLElement) => target.dispatchEvent(new Event('pointerleave'));

function mountMorph(options: Record<string, string> = {}) {
    const made = makeContext({ states: morphState(), state: 'morph-close', options });
    const trigger = new Morph(made.context);
    made.ready(trigger);
    made.player.calls.length = 0;
    return { ...made, trigger };
}

describe('morph', () => {
    it('starts on the first look without animating', () => {
        const made = makeContext({ states: morphState(), state: 'morph-close' });
        made.ready(new Morph(made.context));
        expect(made.player.calls).toEqual(['segment', 'seek:end']);
        expect(made.player.lastSegment).toEqual([30, 61]);
    });

    it('morphs there on enter and back on leave', () => {
        const { player, target, trigger } = mountMorph();

        enter(target);
        expect(player.lastSegment).toEqual([0, 30]);
        expect(player.calls).toEqual(['play:segment']);
        trigger.onComplete();

        player.calls.length = 0;
        leave(target);
        expect(player.lastSegment).toEqual([30, 61]);
        expect(player.calls).toEqual(['play:segment']);
    });

    it('reverses in place when the pointer leaves mid-morph', () => {
        const { player, target } = mountMorph();

        enter(target);
        player.playing = true;
        player.calls.length = 0;
        leave(target);
        expect(player.direction).toBe(-1);
        expect(player.calls).toEqual(['play']);
    });

    it('takes an explicit ratio', () => {
        const { player, target } = mountMorph({ ratio: '0.75' });
        enter(target);
        expect(player.lastSegment).toEqual([0, 45]);
    });

    it('plays the whole animation forwards and backwards without a ratio', () => {
        const made = makeContext({
            states: [
                { name: 'hover-open', time: 0, duration: 20, params: [], default: false },
            ] as never,
            state: 'hover-open',
        });
        const trigger = new Morph(made.context);
        made.ready(trigger);
        made.player.calls.length = 0;

        enter(made.target);
        expect(made.player.direction).toBe(1);
        expect(made.player.calls).toEqual(['play']);
        trigger.onComplete();
        leave(made.target);
        expect(made.player.direction).toBe(-1);
    });

    it('jumps between the looks under reduced motion', () => {
        const made = makeContext({
            states: morphState(),
            state: 'morph-close',
            reducedMotion: true,
        });
        made.ready(new Morph(made.context));
        made.player.calls.length = 0;

        enter(made.target);
        expect(made.player.calls).toEqual(['segment', 'seek:end']);
        expect(made.player.lastSegment).toEqual([0, 30]);
    });

    it('restores the player when torn down', () => {
        const { player, target, controller } = mountMorph();
        enter(target);
        controller.abort();
        // Back on the state's own segment.
        expect(player.calls.at(-1)).toBe('segment');
        expect(player.lastSegment).toBeNull();
        expect(player.direction).toBe(1);
    });

    it('starts on the second look when the pointer arrived before ready', () => {
        const made = makeContext({ states: morphState(), state: 'morph-close' });
        const trigger = new Morph(made.context);
        enter(made.target);
        made.ready(trigger);

        expect(made.player.calls).toEqual(['segment', 'seek:end']);
        expect(made.player.lastSegment).toEqual([0, 30]);
    });
});
