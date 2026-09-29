import { BaseTrigger, defineElement, type TriggerContext } from '../src/index.ts';

/**
 * Each click plays the animation the other way. `ping-pong(end)` starts from the last frame;
 * `from` is its first option, so `ping-pong(from=end)` means the same.
 */
class PingPong extends BaseTrigger {
    static readonly primary = 'from';

    direction: 1 | -1;

    constructor(context: TriggerContext) {
        super(context);
        this.direction = this.option('from') === 'end' ? -1 : 1;
        this.listen(this.target, 'click', () => {
            if (!this.player.playing) void this.player.play();
        });
    }

    onReady() {
        this.player.direction = this.direction;
        if (this.direction === -1) this.player.seek('end');
    }

    onComplete() {
        this.direction = this.direction === 1 ? -1 : 1;
        this.player.direction = this.direction;
    }
}

defineElement({ triggers: { 'ping-pong': PingPong } });
