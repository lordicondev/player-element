import { afterEach, describe, expect, it } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { morphState } from '../testing/player-stub.ts';
import { Boomerang } from './boomerang.ts';

afterEach(() => document.body.replaceChildren());

const enter = (target: HTMLElement) => target.dispatchEvent(new Event('pointerenter'));

describe('boomerang', () => {
    it('plays the two halves of a morph state one after the other', () => {
        const { context, player, target, ready } = makeContext({
            states: morphState(),
            state: 'morph-close',
        });
        const trigger = new Boomerang(context);
        ready(trigger);

        enter(target);
        expect(player.lastSegment).toEqual([0, 30]);
        expect(player.calls).toEqual(['play:segment']);

        player.calls.length = 0;
        trigger.onComplete();
        expect(player.lastSegment).toEqual([30, 61]);
        expect(player.direction).toBe(1);
        expect(player.calls).toEqual(['play:segment']);

        trigger.onComplete();
        expect(player.direction).toBe(1);
    });

    it('plays forwards then in reverse without a morph state', () => {
        const { context, player, target, ready } = makeContext();
        const trigger = new Boomerang(context);
        ready(trigger);

        enter(target);
        expect(player.calls).toEqual(['play:start']);
        trigger.onComplete();
        expect(player.direction).toBe(-1);
        expect(player.calls).toEqual(['play:start', 'play:reverse']);
        trigger.onComplete();
        expect(player.direction).toBe(1);
    });

    it('takes an explicit ratio', () => {
        const { context, player, target, ready } = makeContext({
            states: morphState(),
            state: 'morph-close',
            options: { ratio: '0.25' },
        });
        ready(new Boomerang(context));
        enter(target);
        expect(player.lastSegment).toEqual([0, 15]);
    });

    it('ignores a pointer mid-flight and under reduced motion', () => {
        const { context, player, target, ready } = makeContext();
        ready(new Boomerang(context));
        enter(target);
        player.playing = true;
        enter(target);
        expect(player.calls).toEqual(['play:start']);

        const reduced = makeContext({ reducedMotion: true });
        reduced.ready(new Boomerang(reduced.context));
        enter(reduced.target);
        expect(reduced.player.calls).toEqual([]);
    });

    it('restores the player when torn down', () => {
        const { context, player, target, ready, controller } = makeContext({
            states: morphState(),
            state: 'morph-close',
        });
        ready(new Boomerang(context));
        enter(target);
        controller.abort();
        expect(player.calls.at(-1)).toBe('segment');
        expect(player.lastSegment).toBeNull();
        expect(player.direction).toBe(1);
    });
});
