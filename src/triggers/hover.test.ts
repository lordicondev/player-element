import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/context.ts';
import { Hover } from './hover.ts';

afterEach(() => document.body.replaceChildren());

const enter = (target: HTMLElement) => target.dispatchEvent(new Event('pointerenter'));

describe('hover', () => {
    it('plays once when the pointer enters', () => {
        const { context, player, target, ready } = makeContext();
        ready(new Hover(context));

        enter(target);
        expect(player.calls).toEqual(['play:start']);
    });

    it('plays on keyboard focus but not on focus from a click', () => {
        const { context, player, target, ready } = makeContext();
        ready(new Hover(context));

        const matches = vi.spyOn(target, 'matches');
        matches.mockImplementation((selector) => selector === ':focus-visible');
        target.dispatchEvent(new Event('focus'));
        matches.mockImplementation(() => false);
        target.dispatchEvent(new Event('focus'));
        expect(player.calls).toEqual(['play:start']);
    });

    it('drops an arrival while it is still playing', () => {
        const { context, player, target, ready } = makeContext();
        ready(new Hover(context));

        enter(target);
        player.playing = true;
        enter(target);
        expect(player.calls).toEqual(['play:start']);
    });

    it('ignores the pointer before ready, under reduced motion and after teardown', () => {
        const { context, player, target, ready, controller } = makeContext({ reducedMotion: true });
        const trigger = new Hover(context);
        enter(target);
        ready(trigger);
        enter(target);
        controller.abort();
        enter(target);
        expect(player.calls).toEqual([]);
    });
});
