import type { Player } from '@lordicon/web';

/**
 * Icon animation data in Lottie JSON format.
 * This player is optimized for icons from [Lordicon](https://lordicon.com/).
 */
export type IconData = any;

/**
 * A function that loads icon data by name.
 * 
 * Use this to provide a custom way to fetch icon data (e.g., from your own server).
 * 
 * **Important:** Set the icon loader before defining the `lord-icon` custom element.
 * 
 * Example:
 * ```js
 * import { defineElement, Element } from '@lordicon/element';
 * 
 * Element.setIconLoader(async (name) => {
 *   const response = await fetch(`https://example.com/icons/${name}.json`);
 *   return await response.json();
 * });
 * 
 * defineElement();
 * ```
 * 
 * @param name The name of the icon to load.
 * @returns A promise that resolves to the icon data.
 */
export type IconLoader = (name: string) => Promise<IconData>;

/**
 * Interface for creating custom triggers.
 * 
 * Triggers allow you to define custom interactions for the icon element.
 * Implement this interface to control how the icon responds to events.
 * 
 * You have access to:
 * - `player`: The animation player instance.
 * - `element`: The custom icon element.
 * - `targetElement`: The element that triggers the interaction.
 * 
 * Example:
 * ```js
 * class CustomTrigger {
 *   constructor(player, element, targetElement) {
 *     this.player = player;
 *     this.element = element;
 *     this.targetElement = targetElement;
 *   }
 *   onReady() {
 *     this.player.play();
 *   }
 * }
 * Element.defineTrigger('custom', CustomTrigger);
 * ```
 */
export interface Trigger {
    /**
     * The trigger has been connected to the element.
     */
    onConnected?: () => void;

    /**
     * The trigger has been disconnected from the element.
     * 
     * Note: Remember to remove any potential event listeners you assigned earlier in this trigger.
     */
    onDisconnected?: () => void;

    /**
     * The player is ready. Now you can control the animation and icon properties with it.
     */
    onReady?: () => void;

    /**
     * The player has completed an animation.
     */
    onComplete?: () => void;

    /**
     * The player has rendered a frame.
     */
    onFrame?: () => void;

    /**
     * The player was refreshed, for example, due to icon customization.
     */
    onRefresh?: () => void;
}

/**
 * Constructor type for custom triggers.
 * 
 * Use this to define how your trigger is created.
 * 
 * @param player The animation player instance.
 * @param element The custom icon element.
 * @param targetElement The element that triggers the interaction.
 */
export interface TriggerConstructor {
    new(player: Player, element: HTMLElement, targetElement: HTMLElement): Trigger;
}