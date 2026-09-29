import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { morphState } from '../testing/player-stub.ts';

let stub: ReturnType<typeof useStubPlayer>;

beforeEach(() => {
    stub = useStubPlayer({ states: morphState() });
    stubFetch();
});

afterEach(() => {
    stub.restore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

describe('playback methods', () => {
    it('queues commands until ready, then runs them in order', async () => {
        const element = mount({ src: '/lock.json' });
        element.seek('end');
        void element.play({ from: 'start' });
        await settle();
        expect(stub.player.calls).toEqual(['init']);

        await becomeReady(stub.player);
        expect(stub.player.calls).toEqual(['init', 'seek:end', 'play:start']);
    });

    it('settles a queued play with false when the icon is removed first', async () => {
        const element = mount({ src: '/lock.json' });
        const played = element.play();
        element.remove();
        await expect(played).resolves.toBe(false);
    });

    it("hands back the player's own promise once ready", async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);
        const play = vi.spyOn(stub.player, 'play');

        const played = element.play({ from: 'start' });
        expect(played).toBe(play.mock.results[0].value);
    });

    it('runs commands at once when ready', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);
        stub.player.calls.length = 0;

        element.pause();
        element.seek('start');
        element.stop();
        expect(stub.player.calls).toEqual(['pause', 'seek:start', 'stop']);
    });

    it('plays a state and resolves when it has played', async () => {
        const element = mount({ src: '/lock.json' });
        await settle();
        await becomeReady(stub.player);
        stub.player.calls.length = 0;

        const done = element.play({ state: 'morph-close', reverse: true });
        expect(stub.player.state).toBe('morph-close');
        expect(stub.player.direction).toBe(-1);
        expect(stub.player.calls).toEqual(['play:state']);

        stub.player.emit('complete');
        await expect(done).resolves.toBe(true);
    });

    it('resolves a queued play once it has run and finished', async () => {
        const element = mount({ src: '/lock.json' });
        const done = element.play();
        await settle();
        await becomeReady(stub.player);
        stub.player.emit('complete');
        await expect(done).resolves.toBe(true);
    });

    it('drops queued commands when the element is disconnected', async () => {
        const element = mount({ src: '/lock.json' });
        void element.play();
        await settle();
        element.remove();
        await settle();
        document.body.append(element);
        await settle();
        await becomeReady(stub.player);

        expect(stub.player.calls).toEqual(['init']);
    });
});
