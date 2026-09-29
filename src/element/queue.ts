import type { Player } from '@lordicon/web';

type Command = {
    run: (player: Player) => void;
    /** Called instead of `run` when the queue is cleared. */
    drop?: () => void;
};

/** Player commands issued before the player is ready, run in order once it is. */
export class CommandQueue {
    #commands: Command[] = [];

    get size(): number {
        return this.#commands.length;
    }

    push(command: Command): void {
        this.#commands.push(command);
    }

    flush(player: Player): void {
        for (const command of this.#commands.splice(0)) command.run(player);
    }

    clear(): void {
        for (const command of this.#commands.splice(0)) command.drop?.();
    }
}
