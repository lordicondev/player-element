import { afterEach, describe, expect, it } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { Click } from './click.ts';

afterEach(() => document.body.replaceChildren());

describe('click', () => {
    it('plays from the start on every click of the target', () => {
        const { context, player, target, ready } = makeContext();
        ready(new Click(context));

        target.click();
        player.playing = true;
        target.click();
        expect(player.calls).toEqual(['play:start', 'play:start']);
    });

    it('ignores clicks before the player is ready', () => {
        const { context, player, target } = makeContext();
        new Click(context);

        target.click();
        expect(player.calls).toEqual([]);
    });

    it('stops listening when torn down', () => {
        const { context, player, target, ready, controller } = makeContext();
        ready(new Click(context));
        controller.abort();

        target.click();
        expect(player.calls).toEqual([]);
    });

    it('does nothing under reduced motion', () => {
        const { context, player, target, ready } = makeContext({ reducedMotion: true });
        ready(new Click(context));

        target.click();
        expect(player.calls).toEqual([]);
    });
});
