import { Element } from '../src';
import '../src/release';

const iconElement = document.getElementById('main-icon') as Element;

iconElement.addEventListener('ready', () => {
    const playerInstance = iconElement.playerInstance!;

    // Play the intro animation initially.
    playerInstance.state = 'in-reveal';
    playerInstance.playFromStart();

    // Store the next state.
    let nextState: string | null = null;

    // React to animation completion.
    playerInstance.addEventListener('complete', () => {
        // Change to the assigned state.
        playerInstance.state = nextState ?? 'loop-spin';

        // Play from the beginning.
        playerInstance.playFromStart();

        // Clear the next state.
        nextState = null;
    });

    // React to mouse enter.
    iconElement.addEventListener('mouseenter', (e) => {
        // Set the next state to hover.
        nextState = 'hover-jump';
    });
});
