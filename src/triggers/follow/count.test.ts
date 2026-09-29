import type { IconState } from '@lordicon/web';
import { afterEach, describe, expect, it } from 'vitest';
import { makeContext } from '../../testing/context.ts';
import { Follow } from './index.ts';

afterEach(() => document.body.replaceChildren());

const states = [
    { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
] as IconState[];

function mountCount(count = '0', extra: Record<string, unknown> = {}) {
    const made = makeContext({
        states,
        state: 'in-reveal',
        target: { 'data-count': count },
        options: { attr: 'data-count' },
        ...extra,
    });
    made.element.setAttribute('state', 'in-reveal');
    const trigger = new Follow(made.context);
    made.ready(trigger);
    made.player.calls.length = 0;
    return { ...made, trigger };
}

describe('follow: count', () => {
    it('plays nothing for the count it starts with', () => {
        const { player } = mountCount('3');
        expect(player.calls).toEqual([]);
    });

    it('plays the entrance state when the count leaves zero', async () => {
        const { player, set } = mountCount();
        await set('data-count', '2');
        expect(player.state).toBe('in-reveal');
        expect(player.calls).toEqual(['play:state']);
    });

    it('nudges with the default state when the count goes up again', async () => {
        const { player, set } = mountCount('2');
        await set('data-count', '3');
        expect(player.state).toBeNull();
        expect(player.calls).toEqual(['play:state']);
    });

    it('drops a nudge while playing and says nothing on the way down', async () => {
        const { player, set } = mountCount('2');
        player.playing = true;
        await set('data-count', '3');
        player.playing = false;
        await set('data-count', '0');
        expect(player.calls).toEqual([]);
    });

    it('jumps the entrance and skips the nudge under reduced motion', async () => {
        const { player, set } = mountCount('0', { reducedMotion: true });
        await set('data-count', '1');
        await set('data-count', '2');
        expect(player.calls).toEqual(['seek:end']);
    });

    it('picks counting from the first value when the attribute starts missing', async () => {
        const made = makeContext({
            states,
            state: 'in-reveal',
            options: { attr: 'data-count' },
        });
        made.element.setAttribute('state', 'in-reveal');
        const trigger = new Follow(made.context);
        made.ready(trigger);
        expect(made.player.calls).toEqual([]);

        await made.set('data-count', '1');
        expect(made.player.state).toBe('in-reveal');
        expect(made.player.calls).toEqual(['play:state']);

        await made.set('data-count', '2');
        expect(made.player.state).toBeNull();
        expect(made.player.calls).toEqual(['play:state', 'play:state']);
    });

    it('stays a boolean when the first value is not a number', async () => {
        const made = makeContext({
            states,
            state: 'in-reveal',
            options: { attr: 'data-shown' },
        });
        const trigger = new Follow(made.context);
        made.ready(trigger);

        await made.set('data-shown', 'true');
        await made.set('data-shown', '2');
        expect(made.player.calls).toEqual(['play:start']);
    });
});
