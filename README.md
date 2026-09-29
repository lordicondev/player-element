# Lordicon Element

`<lord-icon>` puts an animated [Lordicon](https://lordicon.com/) icon on the page; its
attributes say when it plays.

```html
<lord-icon src="/icons/lock.json" trigger="hover"></lord-icon>
```

## Install

```sh
npm install @lordicon/element
```

```js
import { defineElement } from '@lordicon/element';

defineElement();
```

Without a bundler, load the self-contained build; it defines the element itself. `@3` keeps
the page on this major version:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@lordicon/element@3"></script>
```

## Attributes

| Attribute       | Value                                                                           |
| --------------- | ------------------------------------------------------------------------------- |
| `src`           | URL of the icon's Lottie JSON. Or assign the `icon` property with the data.     |
| `trigger`       | What plays it. See below.                                                       |
| `state`         | Which of the icon's animations to use. `*` plays them all.                      |
| `target`        | Selector of the ancestor the trigger follows; the property takes an element.    |
| `colors`        | `primary:#ff5a36,secondary:red`                                                 |
| `stroke`        | `light`, `regular` or `bold`                                                    |
| `speed`         | Playback speed, `1` by default.                                                 |
| `current-color` | The icon takes `color` from the page, like text.                                |
| `intro`         | A state to play once when the icon comes into view, before the trigger starts.  |
| `loading`       | `lazy` (when in view), `interaction` (on pointer, click or focus), `delay:500`. |
| `motion`        | `always` animates this icon even when the viewer asked for less motion.         |

`intro`, `loading` and `motion` are read when the icon loads; a change applies from the next
load (a new `src`), and the element warns about it.

## States

An icon holds several animations, named for what they are for: `in-*` enters, `hover-*`
plays once, `loop-*` repeats, `morph-*` goes to a second look and back. `state` picks one;
without it the icon's default plays. `icon.states` lists them once the icon is ready.

## Triggers

```html
<lord-icon trigger="click" ...></lord-icon>
<lord-icon trigger="loop(1000)" ...></lord-icon>
<button aria-pressed="false">
    <lord-icon trigger="follow" target="button" state="morph-close" ...></lord-icon>
</button>
```

A trigger is a name, with options in parentheses. The first option may go without its
name: `loop(1000)` is `loop(delay=1000)`.

| Trigger         | Plays                                                                  | First option |
| --------------- | ---------------------------------------------------------------------- | ------------ |
| `hover`         | once, when the pointer enters the target or keyboard focus lands on it |              |
| `click`         | once per click                                                         |              |
| `in`            | once, when half of the icon has scrolled into view                     | `delay`      |
| `loop`          | over and over                                                          | `delay`      |
| `loop-on-hover` | over and over while the pointer is on the target                       | `delay`      |
| `morph`         | to the second look on pointer enter, back on leave                     | `ratio`      |
| `boomerang`     | there and straight back on pointer enter                               | `ratio`      |
| `follow`        | in step with an attribute on the target, `aria-pressed` by default     | `attr`       |
| `sequence`      | a script: `sequence(play in-reveal, wait 500, play hover-jump)`        | `steps`      |

## Script

```ts
const icon = document.querySelector('lord-icon')!;

icon.play(); // queued until the icon is ready
icon.play({ state: 'in-reveal' });
icon.pause();
icon.stop(); // back to the first frame
icon.seek('end'); // or 'start', or a frame
await icon.load(); // loads now, whatever `loading` waits for

const finished = await icon.play({ state: 'hover-jump' }); // false if cut short

icon.addEventListener('ready', () => console.log(icon.states));
icon.addEventListener('complete', (event) => console.log(event.detail.state));
icon.addEventListener('error', (event) => console.error(event.detail));
icon.addEventListener('trigger', (event) => console.log(event.detail)); // the trigger started

icon.player; // the player behind the icon, for the rest
icon.currentTrigger; // the trigger running it, for triggers with methods of their own
```

`play()` takes the options of the player's: `state`, `segment`, `from: 'start'`, `reverse`.
`readyPromise` resolves `true` once the icon is ready, `false` if the element leaves the page
first, and rejects when the icon cannot load. The `state` event follows the `state` attribute.
The `trigger` event comes whenever a trigger starts or is replaced, `currentTrigger` holding
it: after `ready`, or after the intro when there is one; and with null when it goes with the
icon (a new `src`, or off the page). `load()` starts loading at once, for an
icon whose `loading` waits for something else (a hover on a button next to it, say), and gives
`readyPromise`; an icon loading or ready already is left as it is.

`pause()` also holds a trigger's delay (a `wait`, `loop(1000)`), and `play()` lets it run out.

`icon.player` is the [`@lordicon/web`](https://www.npmjs.com/package/@lordicon/web) Player.
To drive an icon from JavaScript without the element, use that package directly.

## In CSS

CSS sees where the icon is, with `:state()`:

```css
lord-icon {
    opacity: 0;
    transition: opacity 0.3s;
}

lord-icon:state(ready) {
    opacity: 1;
}
```

`waiting` for what `loading` asks, `loading`, `ready`, `error` when it cannot load, `intro`
while the intro lasts, and `playing` while it plays. Not to be confused with `state`, the
icon's animation.

## Loading of your own

Icons load from `src` as Lottie JSON. A subclass can load some icons another way, and leave
the rest to the element:

```ts
import { defineElement, LordIconElement, type IconData } from '@lordicon/element';

class SecretIcon extends LordIconElement {
    protected async loadIcon(src: string, signal: AbortSignal): Promise<IconData> {
        if (!src.endsWith('.enc')) return super.loadIcon(src, signal);
        const response = await fetch(src, { signal });
        return decrypt(await response.text());
    }
}

defineElement({ element: SecretIcon });
```

A rejection shows as the `error` event.

## Custom triggers

```ts
import { BaseTrigger, defineElement, type TriggerContext } from '@lordicon/element';

/** Plays on double click; `double-click(300)` waits 300 ms first. */
class DoubleClick extends BaseTrigger {
    static readonly primary = 'delay';

    constructor(context: TriggerContext) {
        super(context);
        // Listeners and timeouts made through the base class stop with the trigger.
        this.listen(this.target, 'dblclick', () => {
            if (this.reducedMotion) return;
            this.timeout(() => this.player.play({ from: 'start' }), this.number('delay', 0));
        });
    }
}

defineElement({ triggers: { 'double-click': DoubleClick } });
```

A trigger gets `{ player, element, target, signal, options, reducedMotion }`. Its hooks, all
optional:

- `onReady`, `onComplete`, `onState`, `onFrame`: the player is ready, finished a segment, the
  `state` attribute changed, a frame was drawn.
- `onInteraction`: with `loading="interaction"`, what happened on the target while the icon
  loaded (the latest `pointerenter`, `click` and `focus`, in order; not a pointer that has left
  since). `BaseTrigger` hands each to what it `listen`s for, so it plays as if the trigger had
  been there. The page does not get the events twice.
- `onCommand`: the element's `play()`, `pause()`, `stop()` and `seek()`, before the player
  sees them. Return `true` (for `play`, a promise of its result) to take one over.
  `BaseTrigger`'s own holds its timeouts through a `pause()`.

A trigger that plays the icon its own way, seeking the player on a clock of its own, calls
`this.setAnimating(true | false)` so that `:state(playing)` follows it.

`startingAttribute(name)` reads the target's attribute from before that interaction, so
`follow` animates a change made while the icon loaded. `findState()`, `defaultState()`,
`stateType()`, `stateSegment()`, `stateRatio()`, `splitSegment()`, `stateEndFrame()` and
`Morpher` are exported for triggers that work with states and segments;
`this.player.currentState` is the state the icon is on, as an object for them.

## Details

**`follow`** reacts to the attribute's value:

- `"true"` / `"false"`: with a `morph-*` state the icon morphs there and back; with any other
  state it plays once when the value turns true.
- a number: an entrance (the `state`) when it leaves zero, a nudge (the default state) when it
  goes up again, nothing when it goes down.
- a map, `follow(data-stage, busy=loop-cycle, done=morph-check)`: a `loop-*` state loops while
  the value holds and finishes its round first, a `morph-*` state goes to its second look and
  back, any other state plays once.

The value at ready picks between boolean and number; without one yet, the first value does.
`ratio=0.6` sets where a morph splits.

**Morph states** go to a second look and back. Some carry a ratio in their marker
(`morph-close:0.5`): frames up to it lead there, the rest lead back. Others have none: the
whole animation plays forwards, then backwards. A ratio counts between 0 and 1, both
excluded.

**`sequence`** steps are separated by commas; the script repeats unless it ends with `stop`.

- `play [state] [reverse | there | back | <from>-<to>]`: a state, or part of it. `there` and
  `back` are the halves of a morph. A range counts frames from the state's start, both ends
  included: `play in-reveal 0-30`, `play in-reveal 30-end`.
- `show [state] <frame | start | end | there>`: one frame, held. `show morph-close there` is
  the morph's second look.
- `wait <ms>` pauses; `stop` ends the script.

A wait holds what is on screen. In a script that repeats, `wait 500, play in-reveal` holds the
end of `in-reveal` from the second round on; `show in-reveal start, wait 500, play in-reveal`
holds its first frame every time.

A step without a state uses the element's `state`. A script with no `play` or `wait` runs
once, as a still pose.

**`intro`** plays the first time the icon is in view, then the trigger takes over. It takes a
state (without one, the first `in-*` state) and the options `delay=300` and `after=.card`:
`after` names an ancestor whose running animations have to finish first, so an icon in a card
that slides in waits for the card. The icon is `ready` before its intro; a method call such as
`play()` cuts the intro short.

**Reduced motion.** When the viewer asks for less motion, one-shot animations show their last
frame, morphs jump between their looks, loops and intros stay still.
`defineElement({ motion: 'always' })` turns this off for every icon, `motion="always"` for
one.

**Looks.** Colours can also come from CSS: `--lord-icon-primary`, `--lord-icon-secondary` and
so on. Light DOM inside the element shows until the icon is ready, as a placeholder.

**Screen readers** skip icons. Give one an `aria-label` when it means something on its own.

**Frameworks.** The package imports on a server, where `defineElement()` does nothing. An icon
moved on the page (a list reordered, say) keeps playing, without loading again.
`defineElement()` also takes `tag` (default `lord-icon`) and `triggers` (your own, by name).

**Before the script loads**, `<lord-icon>` has no size of its own, and a placeholder inside it
shows at its natural size. Give it both in your CSS:

```css
lord-icon {
    display: inline-block;
    width: 32px;
    height: 32px;
}

lord-icon:not(:defined) > * {
    width: 100%;
    height: 100%;
}
```

## Upgrading

What changed from 2.x, and what to write instead: [CHANGELOG.md](CHANGELOG.md).

## Development

```sh
npm install
npm start          # the examples at localhost:8080
npm test
npm run check      # types, lint, formatting
npm run build      # dist/index.js, dist/lordicon.js and the type declarations
```

## License

MIT
