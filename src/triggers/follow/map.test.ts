import type { IconState } from '@lordicon/web';
import { afterEach, describe, expect, it } from 'vitest';
import { makeContext } from '../../testing/context.ts';
import { Follow } from './index.ts';

afterEach(() => document.body.replaceChildren());

/** Like the download icon: a loop, and a morph that splits at its midpoint. */
const states = [
    { name: 'loop-cycle', time: 210, duration: 60, params: [], default: false },
    { name: 'morph-check', time: 350, duration: 60, params: ['0.5'], default: false },
    { name: 'hover-wave', time: 420, duration: 30, params: [], default: false },
] as IconState[];
const LOOP: [number, number] = [210, 271];
const INTO: [number, number] = [350, 380];
const BACK: [number, number] = [380, 411];

function mountMap(stage = 'idle', extra: Record<string, unknown> = {}) {
    const made = makeContext({
        states,
        state: 'morph-check',
        target: { 'data-stage': stage },
        options: {
            attr: 'data-stage',
            busy: 'loop-cycle',
            done: 'morph-check',
            ok: 'hover-wave',
            idle: '',
        },
        ...extra,
    });
    made.element.setAttribute('state', 'morph-check');
    const trigger = new Follow(made.context);
    made.ready(trigger);
    return { ...made, trigger };
}

describe('follow: value map', () => {
    it('rests on the first frame without playing', () => {
        const { player } = mountMap();
        expect(player.calls).toEqual(['segment']);
        expect(player.lastSegment).toBeNull(); // the state's own segment
        expect(player.state).toBe('morph-check');
    });

    it('loops while busy and goes round again', async () => {
        const { player, trigger, set } = mountMap();
        player.calls.length = 0;
        await set('data-stage', 'busy');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(LOOP);

        player.calls.length = 0;
        trigger.onComplete();
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(LOOP);
    });

    it('holds a finish that lands mid-loop until the round is over', async () => {
        const { player, trigger, set } = mountMap();
        await set('data-stage', 'busy');
        player.playing = true;
        player.calls.length = 0;

        await set('data-stage', 'done');
        expect(player.calls).toEqual([]);

        trigger.onComplete();
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(INTO);
    });

    it('confirms at once when there was no loop to wait for', async () => {
        const { player, set } = mountMap();
        player.calls.length = 0;
        await set('data-stage', 'done');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(INTO);
    });

    it('morphs back when the value returns to rest', async () => {
        const { player, set } = mountMap();
        await set('data-stage', 'done');
        player.calls.length = 0;
        await set('data-stage', 'idle');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(BACK);
    });

    it('plays a morph without a ratio forwards, and backwards on the way back', async () => {
        const made = makeContext({
            states: [
                { name: 'morph-check', time: 350, duration: 60, params: [], default: false },
            ] as IconState[],
            state: 'morph-check',
            target: { 'data-stage': 'idle' },
            options: { attr: 'data-stage', done: 'morph-check' },
        });
        made.element.setAttribute('state', 'morph-check');
        const trigger = new Follow(made.context);
        made.ready(trigger);

        await made.set('data-stage', 'done');
        expect(made.player.lastSegment).toEqual([350, 411]);
        expect(made.player.direction).toBe(1);

        made.player.calls.length = 0;
        await made.set('data-stage', 'idle');
        expect(made.player.calls).toEqual(['play:segment']);
        expect(made.player.lastSegment).toEqual([350, 411]);
        expect(made.player.direction).toBe(-1);
    });

    it('does not play a morph back it never played forwards', async () => {
        const { player, trigger, set } = mountMap();
        await set('data-stage', 'busy');
        player.calls.length = 0;
        await set('data-stage', 'idle');
        trigger.onComplete();
        expect(player.calls).toEqual(['segment']);
        expect(player.lastSegment).toBeNull(); // the state's own segment
    });

    it('jumps under reduced motion', async () => {
        const { player, set } = mountMap('idle', { reducedMotion: true });
        player.calls.length = 0;
        await set('data-stage', 'busy');
        expect(player.calls).toEqual(['segment']);

        player.calls.length = 0;
        await set('data-stage', 'done');
        expect(player.calls).toEqual(['segment', 'seek:end']);
        expect(player.lastSegment).toEqual(INTO);
    });

    it('waits for the player and stops with the trigger', async () => {
        const made = makeContext({
            states,
            state: 'morph-check',
            target: { 'data-stage': 'idle' },
            options: { attr: 'data-stage', busy: 'loop-cycle' },
        });
        made.element.setAttribute('state', 'morph-check');
        const trigger = new Follow(made.context);
        await made.set('data-stage', 'busy');
        expect(made.player.calls).toEqual([]);

        made.ready(trigger);
        expect(made.player.lastSegment).toBeNull();
        made.controller.abort();
        made.player.calls.length = 0;
        await made.set('data-stage', 'done');
        expect(made.player.calls).toEqual([]);
    });

    it('plays a plain state once', async () => {
        const { player, trigger, set } = mountMap();
        player.calls.length = 0;
        await set('data-stage', 'ok');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual([420, 451]);

        trigger.onComplete();
        expect(player.calls).toEqual(['play:segment']);
    });

    it('shows the value it finds at ready without playing', () => {
        const done = mountMap('done');
        expect(done.player.calls).toEqual(['segment', 'seek:end']);
        expect(done.player.lastSegment).toEqual(INTO);

        const busy = mountMap('busy');
        expect(busy.player.calls).toEqual(['segment']);
        expect(busy.player.lastSegment).toBeNull();
    });

    it('rests on a value mapped to nothing', async () => {
        const { player, set } = mountMap('busy');
        player.calls.length = 0;
        await set('data-stage', 'idle');
        expect(player.calls).toEqual(['segment']);
        expect(player.lastSegment).toBeNull();
    });
});
