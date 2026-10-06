# Changelog

## 3.0.1

### Fixed

- A built-in trigger replaced through `defineElement({ triggers })` or `defineTrigger()` stays
  through later calls of `defineElement()`. It used to go back to the built-in one whenever
  `defineElement()` was called again, from another module say.

## 3.0.0

Built on `@lordicon/web` 2.1: absolute frames, one `play(options)` that returns a promise.
Triggers take their options in the `trigger` attribute, and playback has methods on the
element.

### Migrating from 2.x

- `Element` is now `LordIconElement`; `playerInstance` is `player`, `triggerInstance` is
  `currentTrigger`. `animationContainer` and the `loading` property are gone; `loading` is an
  attribute, and `load()` loads an icon whatever it waits for (was `delayedLoading()`).
- `readyPromise` resolves `true`, or `false` when the element leaves the page first, and
  rejects when the icon cannot load.
- `class="current-color"` is the `current-color` attribute.
- Trigger options moved into the attribute: `delay="1000"` is `loop(1000)`,
  `sequence="…"` is `sequence(…)` in the new step language below. `click-to-replay` is gone.
- `intro` is an element attribute and works with every trigger; triggers no longer read it.
  `ready` fires before the intro plays.
- `morph mode="class:x"` is `follow(x)`; `mode="manual"` is `play({ state })`.
- Playback has methods on the element (`play()`, `pause()`, `stop()`, `seek()`), so
  `playerInstance` is rarely needed. The player behind `player` is `@lordicon/web` 2:
  `playFromStart()` is `play({ from: 'start' })`, frames are absolute; see its README.
- Custom triggers take one `context` argument, tear down with `signal`, and have no
  `onConnected`/`onDisconnected`.
- `scale`, `axis-x`, `axis-y` and the 0–100 `stroke` values are gone.

### Sequence steps

Steps are separated by commas, with words inside a step. Frames count from the state's
start, and a range now includes its last frame.

| 2.x                                               | 3.0                                    |
| ------------------------------------------------- | -------------------------------------- |
| `state:x,play`                                    | `play x`                               |
| `play:reverse`                                    | `play reverse`, or `play x reverse`    |
| `delay:500,play`                                  | `show start, wait 500, play`           |
| `delay:500:last,play`                             | `play, wait 500`                       |
| `delay:first:last:500,play`                       | `show start, wait 500, play, wait 500` |
| `frame:<n>`                                       | `show <n>`                             |
| `frame:<duration>`, the last frame                | `show end`                             |
| `frame:<duration * ratio>`, a morph's second look | `show x there`                         |
| `frame:<a>:<b>`                                   | `play <a>-<b - 1>`                     |
| `frame:0:<split>,frame:<split>:<duration>`        | `play x there`, `play x back`          |
| `idle`                                            | `stop`                                 |

`delay:N` held the first frame of the play after it; `wait N` holds what is on screen. They
agree at the start of the first round, or when the step before ends on that frame (the end of a
play is the start of `play reverse`). Elsewhere a bare `wait` shows something else: in a script
that repeats, `wait 500, play in-reveal` holds the drawn icon from the second round on, then
jumps back to the empty one. Hence the `show start` in front.

### Added

- `play(options)`, `pause()`, `stop()` and `seek()` on the element, queued until it is ready.
- `states`, the icon's states; `player`, the `@lordicon/web` Player.
- Events `complete` (with the player's `detail`), `state`, `error`, and `trigger` when a
  trigger starts or is replaced (after the intro when there is one), or goes with the icon
  (null).
- `load()`: loads the icon at once, whatever `loading` waits for, and gives `readyPromise`.
- The `intro`, `current-color` and `motion` attributes.
- The `follow` trigger; a first option without a name, `loop(1000)`.
- `BaseTrigger`, `Morpher` and the state helpers of `@lordicon/web`.
- `currentTrigger`, the running trigger, next to the `trigger` attribute.
- `onCommand` on triggers: a trigger that runs its own playback can take over the element's
  `play()`, `pause()`, `stop()` and `seek()`.
- `onInteraction` on triggers: with `loading="interaction"`, what happened on the target while
  the icon loaded (the latest `pointerenter`, `click` and `focus`, in order) goes to the
  trigger once it runs (`BaseTrigger` hands each to its own listeners on the target), but not
  a pointer that left before the icon was ready. The page gets each event once, as it
  happened. `interaction.attributes` in the trigger's context and `startingAttribute()` give
  the target's attributes from before the first of them; `follow` starts from there, so the
  change that came with the interaction animates rather than jumps.
- `whenVisible()`, for triggers that wait to be seen.
- `pause()` holds a trigger's delay (`wait`, `loop(1000)`, `in(300)`) until `play()`.
- `loadIcon()` to override in a subclass, and `defineElement({ element })` to define it:
  loading of your own, of encrypted icons say.
- States for CSS: `lord-icon:state(waiting | loading | ready | error | intro | playing)`.
  A trigger that plays the icon on a clock of its own tells `playing` with `setAnimating()`.
- `target` takes an element as a property, for a target that is not an ancestor.
- Icons are hidden from screen readers unless named: with `aria-label` (or
  `aria-labelledby`) the icon is an image.
- The package imports on a server; `defineElement()` does nothing there.
- An icon moved on the page (removed and put back in the same task) keeps playing, without
  loading again or replaying its intro; its trigger follows the target it has there.
- Properties set on the element before it is defined (by a framework, say) apply once it is.
- A warning for a `state` the icon does not have, and for `intro`, `loading` or `motion`
  changed after the icon started loading (they apply from the next load).
