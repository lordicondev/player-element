import type { IconState, Player, PlayOptions, Segment } from '@lordicon/web';

/**
 * What a trigger asked the player to do, in the order it asked. `play:segment` is
 * `play({ segment })`, `seek:end` is `seek('end')`, `segment` is setting `player.segment`.
 */
export type PlayerCall =
    | 'play'
    | 'play:start'
    | 'play:state'
    | 'play:segment'
    | 'play:reverse'
    | 'pause'
    | 'stop'
    | 'seek'
    | 'seek:start'
    | 'seek:end'
    | 'segment'
    | 'init'
    | 'destroy';

/**
 * A stand-in for the Lordicon player. Records the calls made to it and lets a test raise
 * player events, so the element and the triggers can be tested without a real animation.
 * `play()` resolves `true` on the next `complete`, `false` when another play takes over.
 */
export type StubPlayer = Player & {
    calls: PlayerCall[];
    ready: boolean;
    playing: boolean;
    direction: 1 | -1;
    speed: number;
    /** The segment last loaded through `segment` or `play({ segment })`; null for `segment = null`. */
    lastSegment: Segment | null;
    /** The state when `init()` ran: what the first frame drawn shows. */
    stateAtInit: string | null;
    /** Raises a player event on every listener registered for it. */
    emit(name: string): void;
    /** How many listeners are registered for an event. */
    listeners(name: string): number;
};

export type StubOptions = {
    states?: IconState[];
    state?: string | null;
    /** The icon's colours by name, as `player.colors` gives them. */
    colors?: Record<string, string>;
};

export function playerStub(options: StubOptions = {}): StubPlayer {
    const calls: PlayerCall[] = [];
    const handlers = new Map<string, Set<EventListener>>();
    let pending: ((completed: boolean) => void) | null = null;
    let becomeReady: (ready: boolean) => void = () => {};
    const readyPromise = new Promise<boolean>((resolve) => (becomeReady = resolve));

    const settle = (completed: boolean) => {
        pending?.(completed);
        pending = null;
    };

    const stub = {
        calls,
        ready: false,
        playing: false,
        direction: 1 as 1 | -1,
        speed: 1,
        lastSegment: null as Segment | null,
        state: options.state ?? null,
        states: options.states ?? [],
        colors: (options.colors ?? {}) as Record<string, string> | null,
        stroke: null as unknown,
        readyPromise,
        get currentState(): IconState | null {
            return stub.states.find((state) => state.name === stub.state) ?? null;
        },

        stateAtInit: null as string | null,
        init: () => {
            calls.push('init');
            stub.stateAtInit = stub.state;
        },
        destroy: () => {
            settle(false);
            becomeReady(false);
            calls.push('destroy');
        },
        play: (play: PlayOptions = {}) => {
            const { state, segment, from, reverse } = play;
            const fresh =
                state !== undefined ||
                segment !== undefined ||
                from !== undefined ||
                reverse !== undefined;

            if (state !== undefined) {
                stub.state = state;
                calls.push('play:state');
            } else if (segment) {
                stub.lastSegment = segment;
                calls.push('play:segment');
            } else if (reverse) {
                calls.push('play:reverse');
            } else if (from) {
                calls.push('play:start');
            } else {
                calls.push('play');
            }

            if (fresh) {
                settle(false);
                stub.direction = reverse ? -1 : 1;
            }

            return new Promise<boolean>((resolve) => {
                const previous = pending;
                pending = (completed) => {
                    previous?.(completed);
                    resolve(completed);
                };
            });
        },
        pause: () => void calls.push('pause'),
        stop: () => {
            settle(false);
            calls.push('stop');
        },
        seek: (frame: number | 'start' | 'end') => {
            calls.push(frame === 'start' ? 'seek:start' : frame === 'end' ? 'seek:end' : 'seek');
        },
        get segment(): Segment | null {
            return stub.lastSegment;
        },
        set segment(segment: Segment | null) {
            settle(false);
            stub.lastSegment = segment;
            stub.direction = 1;
            calls.push('segment');
        },
        addEventListener: (
            name: string,
            handler: EventListener,
            listenerOptions?: AddEventListenerOptions,
        ) => {
            const set = handlers.get(name) ?? new Set();
            set.add(handler);
            handlers.set(name, set);
            listenerOptions?.signal?.addEventListener('abort', () => set.delete(handler), {
                once: true,
            });
        },
        removeEventListener: (name: string, handler: EventListener) => {
            handlers.get(name)?.delete(handler);
        },
        emit: (name: string) => {
            if (name === 'ready') becomeReady(true);
            if (name === 'complete') settle(true);
            const detail = {
                segment: stub.lastSegment,
                direction: stub.direction,
                state: stub.state,
            };
            const event = name === 'complete' ? new CustomEvent(name, { detail }) : new Event(name);
            for (const handler of [...(handlers.get(name) ?? [])]) handler(event);
        },
        listeners: (name: string) => handlers.get(name)?.size ?? 0,
    };

    return stub as unknown as StubPlayer;
}

/** One morph state shaped like the real ones: a 0.5 ratio splitting 60 frames. */
export function morphState(name = 'morph-close'): IconState[] {
    return [{ name, time: 0, duration: 60, params: ['0.5'], default: false }] as IconState[];
}
