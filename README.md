# Lordicon Element Player

Easily add, control, and customize animated [Lordicon](https://lordicon.com/) icons in your web projects with the `<lord-icon>` custom element.  
Designed for anyone who prefers a simple, declarative way to use icons directly in HTML.  
Under the hood, it’s powered by [`@lordicon/web`](https://www.npmjs.com/package/@lordicon/web) for full performance and features.

## Features

- 🧩 **Custom Element**: Use `<lord-icon>` anywhere in your HTML or JavaScript.
- 🎨 **Easy Customization**: Change colors, stroke, animation state, and more via attributes or JavaScript.
- 🕹️ **Built-in Triggers**: Animate on hover, click, loop, morph, and more.
- 🔔 **Lifecycle Events**: Listen for ready, complete, frame, and refresh events.
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

### Basic usage

Example markup:

```html
<lord-icon trigger="hover" src="/my-icon.json"></lord-icon>
```

### Customizing Properties

```html
   <lord-icon trigger="hover" colors="primary:#fdd394,secondary:#03a9f4" stroke="bold" state="hover-jump" src="/my-icon.json"></lord-icon>
```

### Customizing Properties (JS)

You can update properties dynamically via JavaScript:

```js
const icon = document.querySelector('lord-icon');
icon.colors = 'primary:#00ff00,secondary:#0000ff';
icon.stroke = 'light';
icon.state = 'hover-jump';
icon.trigger = 'click';
```

### Built-in Triggers

- `in` – Play when entering viewport.
- `click` – Play on click.
- `hover` – Play on hover.
- `loop` – Loop animation.
- `loop-on-hover` – Loop while hovered.
- `morph` – Morph between states.
- `boomerang` – Play forward and backward.
- `sequence` – Play a sequence.

```html
<lord-icon trigger="hover" src="/icons/party.json"></lord-icon>
<lord-icon trigger="click" src="/icons/like.json"></lord-icon>
<lord-icon trigger="loop" src="/icons/loader.json"></lord-icon>
```

### Events

Listen for lifecycle events:

```js
icon.addEventListener('ready', () => {
  console.log('Icon is ready!');
});

icon.addEventListener('complete', () => {
  console.log('Animation completed!');
});
```

Supported events: ready, complete, frame, refresh.

## API

### Attributes

- `src`: Link to the icon.
- `colors`: Assign colors in text notation, where the first part is the color name and the second part is its value. For example: "outline:#121331,primary:#3a3347".
- `stroke`: Thickness for supported icons, for example: "light", "regular", "bold".
- `trigger`: The trigger name to be assigned to the icon. By default, we support: "in," "click", "hover", "loop", "loop-on-hover", "morph", "boomerang", "sequence."
- `target`: Query selector for the element on which events will be listened.
- `state`: Choose an animation for the icon (a single icon in Lordicon can have multiple built-in animations - you can see which animations an icon supports in our editor).
- `loading`: The method by which the icon will be loaded. It allows for delayed loading of the icon. Acceptable values: "lazy", "interaction".
- `icon`: Icon name to load. This applies to those who want to load icons in conjunction with the API.
- `delay`: It allows you to introduce a pause between animation plays. Available for the following triggers: "loop", "loop-on-hover", "in".

### Properties

- `ready` – `true` if ready.
- `readyPromise` – Promise that resolves when ready.
- `playerInstance` – Access underlying Player instance from `@lordicon/web`.
- `triggerInstance` – Access current trigger instance.
