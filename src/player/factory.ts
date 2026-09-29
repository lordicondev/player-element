import { Player } from '@lordicon/web';
import type { PlayerFactory } from '../types.ts';

/** The default player: `@lordicon/web`, initialised by the element once the DOM is set up. */
export const createPlayer: PlayerFactory = (container, data, properties) =>
    new Player(container, data, properties, { autoInit: false });
