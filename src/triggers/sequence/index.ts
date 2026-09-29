import {
    splitSegment,
    stateEndFrame,
    stateSegment,
    type IconState,
    type PlayOptions,
} from '@lordicon/web';
import { BaseTrigger } from '../base.ts';
import type { TriggerContext } from '../types.ts';
import { parseSteps, type Frame, type Part, type Step } from './parser.ts';

/**
 * Plays a script, and repeats it unless it ends with `stop`:
 *
 *     trigger="sequence(play in-reveal, wait 500, play hover-jump)"
 *
 * See `parseSteps()` for the steps. A script with no `play` or `wait` runs once, as a still
 * pose. A play cut short by something else (a method call) ends the script; a new `state`
 * starts it over. Under reduced motion it runs once without moving: each play jumps to the
 * frame it would end on.
 */
export class Sequence extends BaseTrigger {
    static readonly primary = 'steps';

    #steps: Step[];
    #at = 0;
    /** Bumped on every start, so a play or wait from an earlier run is ignored. */
    #run = 0;
    #cancelWait: (() => void) | null = null;

    constructor(context: TriggerContext) {
        super(context);
        this.#steps = parseSteps(this.option('steps', ''));
        if (!this.#steps.length) console.warn('lord-icon: a sequence needs at least one step');
    }

    onReady(): void {
        this.start();
    }

    onState(): void {
        this.start();
    }

    private start(): void {
        this.#run++;
        this.#at = 0;
        this.#cancelWait?.();
        this.#cancelWait = null;
        this.next(this.#run);
    }

    private end(): void {
        this.#run++;
    }

    /** Runs steps until one takes time: a play or a wait. */
    private next(run: number): void {
        const moves = this.#steps.some((step) => step.kind === 'play' || step.kind === 'wait');

        while (run === this.#run && !this.signal.aborted) {
            if (this.#at === this.#steps.length) {
                // The end of a pass: again, unless nothing in it moves.
                if (!moves || this.reducedMotion) return this.end();
                this.#at = 0;
            }

            const step = this.#steps[this.#at++];

            if (step.kind === 'stop') return this.end();
            if (step.kind === 'show') {
                this.show(step.state, step.frame);
            } else if (this.reducedMotion) {
                if (step.kind === 'play') this.land(step.state, step.part);
            } else if (step.kind === 'wait') {
                this.#cancelWait = this.timeout(() => this.next(run), step.ms);
                return;
            } else {
                void this.player.play(this.playOptions(step.state, step.part)).then((finished) => {
                    if (run !== this.#run) return;
                    if (finished) this.next(run);
                    else this.end();
                });
                return;
            }
        }
    }

    /** The state a step names, or the element's own, loaded into the player. */
    private load(name: string | null): IconState | null {
        this.player.state = name ?? this.element.state;
        return this.player.currentState;
    }

    private playOptions(name: string | null, part: Part): PlayOptions {
        if (part === 'all' || part === 'reverse') {
            return { state: name ?? this.element.state, reverse: part === 'reverse' };
        }

        const state = this.load(name);
        if (!state) return { from: 'start' };

        const whole = stateSegment(state);
        const halves = splitSegment(state);

        if (part === 'there') return { segment: halves ? halves[0] : whole };
        if (part === 'back')
            return halves ? { segment: halves[1] } : { segment: whole, reverse: true };

        // A range counts frames from the state's start, both ends included.
        const to = part.to === 'end' ? state.duration : Math.min(part.to, state.duration);
        return { segment: [state.time + part.from, state.time + Math.max(to, part.from) + 1] };
    }

    /** Shows a frame of a state (absolute frames are counted from its start) and holds it. */
    private show(name: string | null, frame: Frame): void {
        const state = this.load(name);
        this.player.segment = null;

        if (frame === 'start' || frame === 'end') this.player.seek(frame);
        else if (frame === 'there') this.player.seek(state ? stateEndFrame(state) : 'end');
        else this.player.seek((state?.time ?? 0) + frame);
    }

    /** Under reduced motion, a play shows the frame it would end on. */
    private land(name: string | null, part: Part): void {
        if (part === 'all') this.show(name, 'end');
        else if (part === 'reverse') this.show(name, 'start');
        else if (part === 'there') this.show(name, 'there');
        else if (part === 'back') {
            const state = this.load(name);
            this.show(name, state && splitSegment(state) ? 'end' : 'start');
        } else this.show(name, part.to === 'end' ? 'end' : part.to);
    }
}
