# Lordicon Element Player

Easily add, control, and customize animated [Lordicon](https://lordicon.com/) icons in your web projects with the `<lord-icon>` custom element.  
Designed for anyone who prefers a simple, declarative way to use animated icons directly in HTML.  
Under the hood, it’s powered by [`@lordicon/web`](https://www.npmjs.com/package/@lordicon/web) for full performance and features.

## Features

- 🧩 **Custom Element**: Use `<lord-icon>` anywhere in your HTML or JavaScript.
- 🎨 **Easy Customization**: Change colors, stroke, animation state, and more via attributes or JavaScript.
- 🕹️ **Built-in Triggers**: Animate on hover, click, loop, morph, and more.
- ⚡ **Flexible Loading**: Lazy, interaction-based, or delayed icon loading strategies.
- 🛡️ **TypeScript Support**: Full typings for safe integration.

## Installation

```sh
npm install @lordicon/element
```

## Usage

> **Note:**  
> This repository contains an `examples` directory with a rich collection of usage examples and integration scenarios.  
> Feel free to explore it for more advanced use cases and inspiration!

### Register the Custom Element

Before using `<lord-icon>` in your markup, register the element in your JavaScript:

```js
import { defineElement } from "@lordicon/element";

defineElement();
```

### Simple Example

Here's how to add your first animated icon:

```html
<lord-icon trigger="hover" src="/my-icon.json"></lord-icon>
```

### Customization via Attributes

Configure colors, stroke, animation state, and more using HTML attributes:


```html
<lord-icon 
    trigger="hover" 
    colors="primary:#fdd394,secondary:#03a9f4" 
    stroke="bold" 
    state="hover-jump" 
    src="/my-icon.json">
</lord-icon>
```

### Property Access

All attributes are accessible as JavaScript properties:

```js
const icon = document.querySelector('lord-icon');
icon.colors = 'primary:#00ff00,secondary:#0000ff';
icon.stroke = 'light';
icon.state = 'hover-jump';
icon.trigger = 'click';
```

### Animation Triggers

Triggers define when and how your icons animate. They provide intuitive ways to control animation playback based on user interactions or viewport events:

- `in` – Plays animation when the icon enters the viewport (intersection observer).
- `click` – Triggers animation on mouse click or tap.
- `hover` – Plays animation when user hovers over the icon.
- `loop` – Continuously loops the animation with optional delays between cycles.
- `loop-on-hover` – Loops animation only while the user is hovering over the icon.
- `morph` – Smoothly transitions between different animation phases.
- `boomerang` – Plays animation forward, then immediately backward in reverse.
- `sequence` – Plays through a predefined sequence of animation states.

```html
<lord-icon trigger="hover" src="/icons/party.json"></lord-icon>
<lord-icon trigger="click" src="/icons/like.json"></lord-icon>
<lord-icon trigger="loop" src="/icons/loader.json"></lord-icon>
```

## API Reference

### Attributes

All attributes can be set in HTML markup or accessed as JavaScript properties:

- **`src`** – URL path to the icon JSON file. Example: `"/icons/heart.json"`
- **`colors`** – Color palette in key-value format. Use color names from the icon's palette as keys. Example: `"primary:#ff0000,secondary:#00ff00"`
- **`stroke`** – Line thickness for supported icons. Available values: `"light"`, `"regular"`, `"bold"`
- **`speed`** – Animation playback speed multiplier. Default is `1`. Use `0.5` for half speed, `2` for double speed, etc.
- **`trigger`** – Animation trigger type. Available: `"in"`, `"click"`, `"hover"`, `"loop"`, `"loop-on-hover"`, `"morph"`, `"boomerang"`, `"sequence"`
- **`target`** – CSS selector for the element that should receive trigger events instead of the icon itself
- **`state`** – Specific animation state to play. Icons can have multiple built-in animations
- **`loading`** – Loading strategy for performance optimization. Available: `"lazy"` (viewport), `"interaction"` (user action), `"delay"` (timed)

### Properties

Read-only properties for accessing element state and instances:

- **`ready`** – Boolean indicating if the icon is fully initialized and ready for interaction
- **`readyPromise`** – Promise that resolves when the element becomes ready
- **`playerInstance`** – Direct access to the underlying Player instance from `@lordicon/web`
- **`triggerInstance`** – Reference to the current active trigger instance
- **`animationContainer`** – DOM element containing the actual animation (inside shadow DOM)

### Ready State Handling

Player initialization is inherently asynchronous due to resource loading (JSON files), DOM setup, and animation preparation. The `ready` event and `readyPromise` provide reliable ways to ensure the icon (playerInstance + triggerInstance) is fully operational before programmatic interaction.

The element provides a `ready` event for tracking player initialization:

```js
const icon = document.querySelector('lord-icon');

icon.addEventListener('ready', () => {
  console.log('Icon is ready!');
});
```

For convenient handling, you can also use the `readyPromise` getter:

```js
// Wait for the icon to be ready
await icon.readyPromise;
console.log('Icon is now ready!');
```