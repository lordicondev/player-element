import type { IconState } from '@lordicon/web';
import { afterEach, describe, expect, it } from 'vitest';
import { makeContext } from '../../testing/context.ts';
import { morphState } from '../../testing/player-stub.ts';
import { Follow } from './index.ts';

afterEach(() => document.body.replaceChildren());

function mountMorph(pressed = false, extra: Record<string, unknown> = {}) {
    const made = makeContext({
        states: morphState(),
        state: 'morph-close',
        target: { 'aria-pressed': String(pressed) },
        ...extra,
    });
    const trigger = new Follow(made.context);
    return { ...made, trigger };
}

describe('follow: boolean with a morph state', () => {
    it('shows the starting look without animating', () => {
        const { player, trigger, ready } = mountMorph(true);
        ready(trigger);
        expect(player.calls).toEqual(['segment', 'seek:end']);
        expect(player.lastSegment).toEqual([0, 30]);
    });

    it('survives a change made before the player is ready', async () => {
        const { player, trigger, ready, set } = mountMorph();
        await set('aria-pressed', 'true');
        expect(player.calls).toEqual([]);
        ready(trigger);
        expect(player.lastSegment).toEqual([0, 30]);
    });

    it('animates from the value before the interaction that loaded the icon', () => {
        const { player, trigger, ready } = mountMorph(true, {
            interaction: { 'aria-pressed': 'false' },
        });
        ready(trigger);
        expect(player.calls).toEqual(['segment', 'seek:end', 'play:segment']);
        expect(player.lastSegment).toEqual([0, 30]);
    });

    it('shows the look at once when nothing changed while the icon loaded', () => {
        const { player, trigger, ready } = mountMorph(true, {
            interaction: { 'aria-pressed': 'true' },
        });
        ready(trigger);
        expect(player.calls).toEqual(['segment', 'seek:end']);
    });

    it('animates a change after ready and ignores a repeat', async () => {
        const { player, trigger, ready, set } = mountMorph();
        ready(trigger);
        player.calls.length = 0;

        await set('aria-pressed', 'true');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual([0, 30]);

        await set('aria-pressed', 'true');
        expect(player.calls).toEqual(['play:segment']);
    });

    it('reverses in place when interrupted, and turns around again', async () => {
        const { player, trigger, ready, set } = mountMorph();
        ready(trigger);
        await set('aria-pressed', 'true');
        player.playing = true;
        player.calls.length = 0;

        await set('aria-pressed', 'false');
        expect(player.calls).toEqual(['play']);
        expect(player.direction).toBe(-1);

        await set('aria-pressed', 'true');
        expect(player.direction).toBe(1);
    });

    it('takes an explicit ratio', async () => {
        const { player, trigger, ready, set } = mountMorph(false, { options: { ratio: '0.25' } });
        ready(trigger);
        await set('aria-pressed', 'true');
        expect(player.lastSegment).toEqual([0, 15]);
    });

    it('reads another attribute', async () => {
        const made = makeContext({
            states: morphState(),
            state: 'morph-close',
            target: { 'aria-expanded': 'false' },
            options: { attr: 'aria-expanded' },
        });
        const trigger = new Follow(made.context);
        made.ready(trigger);
        made.player.calls.length = 0;

        await made.set('aria-expanded', 'true');
        expect(made.player.calls).toEqual(['play:segment']);
    });

    it('jumps under reduced motion', async () => {
        const { player, trigger, ready, set } = mountMorph(false, { reducedMotion: true });
        ready(trigger);
        player.calls.length = 0;
        await set('aria-pressed', 'true');
        expect(player.calls).toEqual(['segment', 'seek:end']);
    });

    it('restores the player and stops watching when torn down', async () => {
        const { player, trigger, ready, set, controller } = mountMorph();
        ready(trigger);
        controller.abort();
        // Back on the state's own segment.
        expect(player.calls.at(-1)).toBe('segment');
        expect(player.lastSegment).toBeNull();
        player.calls.length = 0;
        await set('aria-pressed', 'true');
        expect(player.calls).toEqual([]);
    });
});

describe('follow: boolean without a morph state', () => {
    const states = [
        { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
    ] as IconState[];

    it('plays once when the value turns true, not on the way back', async () => {
        const made = makeContext({
            states,
            state: 'in-reveal',
            target: { 'data-shown': 'false' },
            options: { attr: 'data-shown' },
        });
        const trigger = new Follow(made.context);
        made.ready(trigger);
        expect(made.player.calls).toEqual([]);

        await made.set('data-shown', 'true');
        await made.set('data-shown', 'false');
        await made.set('data-shown', 'true');
        expect(made.player.calls).toEqual(['play:start', 'play:start']);
    });

    it('drops a change that lands mid-play and jumps under reduced motion', async () => {
        const made = makeContext({
            states,
            state: 'in-reveal',
            target: { 'data-shown': 'false' },
            options: { attr: 'data-shown' },
        });
        const trigger = new Follow(made.context);
        made.ready(trigger);
        await made.set('data-shown', 'true');
        made.player.playing = true;
        await made.set('data-shown', 'false');
        await made.set('data-shown', 'true');
        expect(made.player.calls).toEqual(['play:start']);

        const reduced = makeContext({
            states,
            state: 'in-reveal',
            target: { 'data-shown': 'false' },
            options: { attr: 'data-shown' },
            reducedMotion: true,
        });
        const other = new Follow(reduced.context);
        reduced.ready(other);
        await reduced.set('data-shown', 'true');
        expect(reduced.player.calls).toEqual(['seek:end']);
    });
});
