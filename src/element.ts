import { IconProperties, LegacyIconProperties, Player } from '@lordicon/web';
import { IconData, Trigger, TriggerConstructor } from './interfaces';
import { parseColors, parseState, parseStroke, } from './parsers';

/**
 * Defines the available strategies for loading icons in the custom element.
 * - 'lazy': Loads the icon when it enters the viewport.
 * - 'interaction': Loads the icon after a user interaction.
 * - 'delay': Loads the icon after a specified delay.
 */
export type LoadingType = 'lazy' | 'interaction' | 'delay';

/**
 * List of DOM events that can trigger icon loading when using the 'interaction' loading strategy.
 */
const INTERSECTION_LOADING_EVENTS = ['click', 'mouseenter', 'mouseleave'];

/**
 * Checks if the browser supports constructable stylesheets for better style encapsulation.
 * See: https://developers.google.com/web/updates/2019/02/constructable-stylesheets
 */
const SUPPORTS_ADOPTING_STYLE_SHEETS = 'adoptedStyleSheets' in Document.prototype && 'replace' in CSSStyleSheet.prototype;

/**
 * Main CSS styles for the custom element, ensuring proper layout, sizing, and color handling.
 */
const ELEMENT_STYLE = `
    :host {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 32px;
        transform: translate3d(0px, 0px, 0px);
    }

    :host(.current-color) svg path[fill] {
        fill: currentColor;
    }

    :host(.current-color) svg path[stroke] {
        stroke: currentColor;
    }

    svg {
        position: absolute;
        pointer-events: none;
        display: block;
        transform: unset!important;
    }

    ::slotted(*) {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    .body.ready ::slotted(*) {
        display: none;
    }
`;

/**
 * Holds a reference to the shared stylesheet instance if constructable stylesheets are supported.
 */
let styleSheet: CSSStyleSheet | null = null;

/**
 * Enumerates all supported attributes for the custom element.
 */
type SUPPORTED_ATTRIBUTES = |
    'colors' |
    'src' |
    'state' |
    'trigger' |
    'loading' |
    'target' |
    'stroke' |
    'speed';

/**
 * List of attributes observed by the custom element for changes.
 */
const OBSERVED_ATTRIBUTES: SUPPORTED_ATTRIBUTES[] = [
    'colors',
    'src',
    'state',
    'trigger',
    'loading',
    'target',
    'stroke',
    'speed',
];

/**
 * The Lordicon custom element class.
 * Handles icon loading, rendering, customization, and interaction logic.
 */
export class Element extends HTMLElement {
    protected static _definedTriggers: Map<string, TriggerConstructor> = new Map<string, TriggerConstructor>();

    /**
     * Returns the current version of the element.
     */
    static get version() {
        return '__BUILD_VERSION__';
    }

    /**
     * Returns the list of attributes to observe for changes.
     */
    static get observedAttributes() {
        return OBSERVED_ATTRIBUTES;
    }

    /**
     * Registers a custom trigger for icon interaction.
     * Triggers define how the icon responds to user actions.
     * @param name The name of the trigger.
     * @param triggerClass The trigger class constructor.
     */
    static defineTrigger(name: string, triggerClass: TriggerConstructor) {
        Element._definedTriggers.set(name, triggerClass);
    }

    protected _root?: ShadowRoot;
    protected _isConnected: boolean = false;
    protected _ready: boolean = false;
    protected _assignedIconData?: IconData;
    protected _loadedIconData?: IconData;
    protected _triggerInstance?: Trigger;
    protected _playerInstance?: Player;

    /**
     * Stores a callback for deferred icon loading, used by lazy/interation/delay strategies.
     */
    delayedLoading: ((cancel?: boolean) => void) | null = null;

    /**
     * Handles changes to observed attributes and delegates to the appropriate handler.
     * @param name The attribute name.
     * @param oldValue The previous value.
     * @param newValue The new value.
     */
    protected attributeChangedCallback(
        name: SUPPORTED_ATTRIBUTES,
        _oldValue: any,
        _newValue: any
    ) {
        this[`${name}Changed`].call(this);
    }

    /**
     * Called when the element is added to the DOM.
     * Sets up shadow DOM, styles, and loading strategy.
     */
    protected connectedCallback() {
        // Create elements only once.
        if (!this._root) {
            this.createElements();
        }

        if (this.loading === 'lazy') {
            // Lazy loading: load icon when it enters the viewport.
            let intersectionObserver: IntersectionObserver | undefined = undefined;

            this.delayedLoading = (cancel?: boolean) => {
                intersectionObserver!.unobserve(this);
                intersectionObserver = undefined;
                this.delayedLoading = null;

                if (!cancel) {
                    this.createPlayer();
                }
            };

            const callback: IntersectionObserverCallback = (entries, _observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && intersectionObserver) {
                        if (this.delayedLoading) {
                            this.delayedLoading();
                        }
                    }
                });
            };
            intersectionObserver = new IntersectionObserver(callback);
            intersectionObserver.observe(this);
        } else if (this.loading === 'interaction') {
            // Interaction loading: load icon after user interaction.
            let interactionEvent: string | undefined = undefined;

            this.delayedLoading = (cancel?: boolean) => {
                for (const eventName of INTERSECTION_LOADING_EVENTS) {
                    (targetElement || this).removeEventListener(eventName, intersectionCallback);
                }
                this.delayedLoading = null;

                if (!cancel) {
                    this.createPlayer().then(() => {
                        if (interactionEvent) {
                            (targetElement || this).dispatchEvent(new Event(interactionEvent));
                        }
                    });
                }
            };

            const targetElement = this.target ? this.closest<HTMLElement>(this.target) : null;

            let intersectionCallback: (this: Element, event: Event) => void = (event: Event) => {
                const eventName = event?.type;

                if (!interactionEvent) {
                    interactionEvent = eventName;
                    if (this.delayedLoading) {
                        this.delayedLoading();
                    }
                } else {
                    interactionEvent = eventName;
                }
            }

            intersectionCallback = intersectionCallback.bind(this);

            // Attach event listeners for all supported interaction events.
            for (const eventName of INTERSECTION_LOADING_EVENTS) {
                (targetElement || this).addEventListener(eventName, intersectionCallback);
            }
        } else if (this.loading === 'delay') {
            // Delay loading: load icon after a specified timeout.
            this.delayedLoading = (cancel?: boolean) => {
                this.delayedLoading = null;

                if (!cancel) {
                    this.createPlayer();
                }
            };

            // Get the delay duration from the attribute or use a default value.
            const delay = this.hasAttribute('loading-delay') ? +this.getAttribute('loading-delay')! : 0;

            // Delay loading
            setTimeout(() => {
                if (this.delayedLoading) {
                    this.delayedLoading();
                }
            }, delay);
        } else {
            this.createPlayer();
        }

        this._isConnected = true;
    }

    /**
     * Called when the element is removed from the DOM.
     * Cleans up any resources and event listeners.
     */
    protected disconnectedCallback() {
        // Cancel any pending loading.
        if (this.delayedLoading) {
            this.delayedLoading(true);
        }

        // Destroy player and trigger instances.
        this.destroyPlayer();

        this._isConnected = false;
    }

    /**
     * Creates the shadow DOM structure and attaches styles and slots.
     */
    protected createElements() {
        // Attach shadow root.
        this._root = this.attachShadow({
            mode: 'open'
        });

        // Attach styles (using constructable stylesheet if supported).
        if (SUPPORTS_ADOPTING_STYLE_SHEETS) {
            if (!styleSheet) {
                styleSheet = new CSSStyleSheet();
                styleSheet.replaceSync(ELEMENT_STYLE);
            }

            this._root.adoptedStyleSheets = [styleSheet];
        } else {
            const style = document.createElement('style');
            style.innerHTML = ELEMENT_STYLE;
            this._root.appendChild(style);
        }

        // Create main container for the animation
        const container = document.createElement('div');
        container.classList.add('body');
        this._root.appendChild(container);

        // Add slot for projected content.
        const slot = document.createElement('slot');
        container.appendChild(slot);
    }

    /**
     * Factory method for creating a Player instance.
     * Can be overridden for custom player instantiation.
     */
    protected playerFactory(container: HTMLElement, iconData: IconData, properties: IconProperties & LegacyIconProperties) {
        return new Player(
            container,
            iconData,
            properties,
            {
                autoInit: false,
            },
        );
    }

    /**
     * Instantiates the Player and sets up dynamic styles, triggers, and event listeners.
     * Handles asynchronous icon data loading.
     */
    protected async createPlayer(): Promise<void> {
        // Prevent duplicate player creation during deferred loading.
        if (this.delayedLoading) {
            return;
        }

        const iconData = await this.loadIconData();
        if (!iconData) {
            return;
        }

        // Create the Player instance with parsed properties
        this._playerInstance = this.playerFactory(
            this.animationContainer!,
            iconData,
            {
                state: parseState(this.state),
                stroke: parseStroke(this.stroke),
                colors: parseColors(this.colors),
                // legacy properties
                scale: parseFloat('' + this.getAttribute('scale') || ''),
                axisX: parseFloat('' + this.getAttribute('axis-x') || ''),
                axisY: parseFloat('' + this.getAttribute('axis-y') || ''),
            },
        );

        // Generate dynamic CSS for custom colors
        const colors = Object.entries(this._playerInstance!.colors || {});
        if (colors.length) {
            let styleContent = '';

            for (const [key, _value] of colors) {
                styleContent += `
                    :host(:not(.current-color)) svg path[fill].${key} {
                        fill: var(--lord-icon-${key}, var(--lord-icon-${key}-base, #000));
                    }
        
                    :host(:not(.current-color)) svg path[stroke].${key} {
                        stroke: var(--lord-icon-${key}, var(--lord-icon-${key}-base, #000));
                    }
                `
            }

            const style = document.createElement('style');
            style.innerHTML = styleContent;
            this.animationContainer!.appendChild(style);
        }

        // Initialize the Player
        this._playerInstance.init();

        // Set up event listeners for Player lifecycle events
        this._playerInstance.addEventListener('ready', () => {
            if (this._triggerInstance && this._triggerInstance.onReady) {
                this._triggerInstance.onReady();
            }
        });

        this._playerInstance.addEventListener('refresh', () => {
            this.refresh();

            if (this._triggerInstance && this._triggerInstance.onRefresh) {
                this._triggerInstance.onRefresh();
            }
        });

        this._playerInstance.addEventListener('complete', () => {
            if (this._triggerInstance && this._triggerInstance.onComplete) {
                this._triggerInstance.onComplete();
            }
        });

        this._playerInstance.addEventListener('frame', () => {
            if (this._triggerInstance && this._triggerInstance.onFrame) {
                this._triggerInstance.onFrame();
            }
        });

        // Synchronize CSS variables and refresh state.
        this.refresh();

        // Set up the trigger if defined.
        this.triggerChanged();

        // Wait for the Player to be ready before marking the element as ready
        await new Promise<void>((resolve, _reject) => {
            if (this._playerInstance!.ready) {
                resolve();
            } else {
                this._playerInstance!.addEventListener('ready', resolve);
            }
        });

        // Mark the animation container and element as ready
        this.animationContainer!.classList.add('ready');

        this._ready = true;

        // Dispatch a 'ready' event for external listeners.
        this.dispatchEvent(new CustomEvent('ready'));
    }

    /**
     * Destroys the Player and Trigger instances, cleaning up all resources.
     * Called when the icon data changes or the element is disconnected.
     */
    protected destroyPlayer() {
        // Mark as not ready.
        this._ready = false;

        // Clear loaded icon data.
        this._loadedIconData = undefined;

        // Disconnect and remove trigger instance.
        if (this._triggerInstance) {
            if (this._triggerInstance.onDisconnected) {
                this._triggerInstance.onDisconnected();
            }
            this._triggerInstance = undefined;
        }

        // Destroy and remove Player instance.
        if (this._playerInstance) {
            this._playerInstance.destroy();
            this._playerInstance = undefined;

            // Remove ready class from animation container.
            this.animationContainer!.classList.remove('ready');
        }
    }

    /**
     * Loads icon data from the 'src' attribute or uses the assigned icon data.
     * Returns the icon data object or undefined if loading fails.
     */
    protected async loadIconData(): Promise<IconData> {
        let icon = this.icon;

        if (!icon && this.src) {
            const response = await fetch(this.src);
            this._loadedIconData = icon = await response.json();
        }

        return icon;
    }

    /**
     * Synchronizes the element's state with the Player instance.
     * Updates CSS variables and other dynamic properties.
     */
    protected refresh() {
        this.movePaletteToCssVariables();
    }

    /**
     * Updates CSS variables for icon colors based on the Player's palette.
     * CSS variables take precedence over other color assignments.
     */
    protected movePaletteToCssVariables() {
        for (const [key, value] of Object.entries(this._playerInstance!.colors || {})) {
            if (value) {
                this.animationContainer!.style.setProperty(`--lord-icon-${key}-base`, value);
            } else {
                this.animationContainer!.style.removeProperty(`--lord-icon-${key}-base`);
            }
        }
    }

    /**
     * Called when the 'target' attribute changes.
     * Reloads the trigger to use the new target element.
     */
    protected targetChanged() {
        this.triggerChanged();
    }

    /**
     * Called when the 'loading' attribute changes.
     */
    protected loadingChanged() {
    }

    /**
     * Called when the 'trigger' attribute changes.
     * Disconnects the old trigger and instantiates the new one.
     */
    protected triggerChanged(): void {
        if (this._triggerInstance) {
            if (this._triggerInstance.onDisconnected) {
                this._triggerInstance.onDisconnected();
            }
            this._triggerInstance = undefined;

            this._playerInstance?.pause();
        }

        if (!this.trigger || !this._playerInstance) {
            return;
        }

        const TriggerClass = Element._definedTriggers.get(this.trigger);
        if (!TriggerClass) {
            throw new Error(`Can't use unregistered trigger: '${this.trigger}'!`);
        }

        const targetElement = this.target ? this.closest<HTMLElement>(this.target) : null;

        this._triggerInstance = new TriggerClass(
            this._playerInstance,
            this,
            targetElement || this,
        );

        if (this._triggerInstance.onConnected) {
            this._triggerInstance.onConnected();
        }

        if (this._playerInstance.ready && this._triggerInstance.onReady) {
            this._triggerInstance.onReady();
        }
    }

    /**
     * Called when the 'colors' attribute changes.
     * Updates the Player's color palette.
     */
    protected colorsChanged() {
        if (!this._playerInstance) {
            return;
        }

        this._playerInstance.colors = parseColors(this.colors) || null;
    }

    /**
     * Called when the 'stroke' attribute changes.
     * Updates the Player's stroke width.
     */
    protected strokeChanged() {
        if (!this._playerInstance) {
            return;
        }

        this._playerInstance.stroke = parseStroke(this.stroke) || null;
    }

    /**
     * Called when the 'speed' attribute changes.
     * Updates the Player's animation speed.
     */
    protected speedChanged() {
        if (!this._playerInstance) {
            return;
        }

        const speed = this.getAttribute('speed');
        if (speed) {
            const parsedSpeed = parseFloat(speed);
            if (!isNaN(parsedSpeed)) {
                this._playerInstance.speed = parsedSpeed;
            } else {
                this._playerInstance.speed = 1;
            }
        } else {
            this._playerInstance.speed = 1;
        }
    }

    /**
     * Called when the 'state' attribute changes.
     * Updates the Player's animation state.
     */
    protected stateChanged() {
        if (!this._playerInstance) {
            return;
        }

        this._playerInstance.state = this.state;

        // Notify the trigger instance about the state change.
        this._triggerInstance?.onState?.();
    }

    /**
     * Called when the 'icon' attribute changes.
     * Reloads the Player with the new icon.
     */
    protected iconChanged() {
        if (!this._isConnected) {
            return;
        }

        this.destroyPlayer();
        this.createPlayer();
    }

    /**
     * Called when the 'src' attribute changes.
     * Reloads the Player with the new icon source.
     */
    protected srcChanged() {
        if (!this._isConnected) {
            return;
        }

        this.destroyPlayer();
        this.createPlayer();
    }

    /**
     * Directly assigns icon data to the element.
     * Triggers a reload if the data changes.
     */
    set icon(value: IconData | undefined) {
        if (value !== this._assignedIconData) {
            this._assignedIconData = value;

            // Clear loaded icon data to avoid conflicts.
            this._loadedIconData = undefined;

            this.iconChanged();
        }
    }

    /**
     * Gets the currently assigned or loaded icon data.
     */
    get icon(): IconData | undefined {
        return this._assignedIconData || this._loadedIconData;
    }

    /**
     * Sets the 'src' attribute for loading icon data from a URL.
     */
    set src(value: string | null) {
        if (value) {
            this.setAttribute('src', value);
        } else {
            this.removeAttribute('src');
        }
    }

    /**
     * Gets the current 'src' attribute value.
     */
    get src(): string | null {
        return this.getAttribute('src');
    }

    /**
     * Sets the animation state for the icon.
     * You can check available states from the player instance.
     */
    set state(value: string | null) {
        if (value) {
            this.setAttribute('state', value);
        } else {
            this.removeAttribute('state');
        }
    }

    /**
     * Gets the current animation state.
     */
    get state(): string | null {
        return this.getAttribute('state');
    }

    /**
     * Sets the color palette for the icon.
     * Accepts a comma-separated string, e.g. 'primary:#fdd394,secondary:#03a9f4'.
     */
    set colors(value: string | null) {
        if (value) {
            this.setAttribute('colors', value);
        } else {
            this.removeAttribute('colors');
        }
    }

    /**
     * Gets the current color palette string.
     */
    get colors(): string | null {
        return this.getAttribute('colors');
    }

    /**
     * Sets the trigger name for icon interaction.
     * The trigger must be registered beforehand.
     */
    set trigger(value: string | null) {
        if (value) {
            this.setAttribute('trigger', value);
        } else {
            this.removeAttribute('trigger');
        }
    }

    /**
     * Gets the current trigger name.
     */
    get trigger(): string | null {
        return this.getAttribute('trigger');
    }

    /**
     * Sets the loading strategy for the icon.
     * Options: 'lazy', 'interaction', or 'delay'.
     */
    set loading(value: LoadingType | null) {
        if (value) {
            this.setAttribute('loading', value);
        } else {
            this.removeAttribute('loading');
        }
    }

    /**
     * Gets the current loading strategy.
     */
    get loading(): LoadingType | null {
        if (this.getAttribute('loading')) {
            const param = this.getAttribute('loading')!.toLowerCase();
            if (param === 'lazy') {
                return 'lazy';
            } else if (param === 'interaction') {
                return 'interaction';
            } else if (param === 'delay') {
                return 'delay';
            }
        }

        return null;
    }

    /**
     * Sets the CSS selector for the target element used for event listening.
     */
    set target(value: string | null) {
        if (value) {
            this.setAttribute('target', value);
        } else {
            this.removeAttribute('target');
        }
    }

    /**
     * Gets the current target selector.
     */
    get target(): string | null {
        return this.getAttribute('target');
    }

    /**
     * Sets the stroke style for the icon (e.g., 1, 2, 3, light, regular, bold).
     */
    set stroke(value: string | null) {
        if (value) {
            this.setAttribute('stroke', value);
        } else {
            this.removeAttribute('stroke');
        }
    }

    /**
     * Gets the current stroke width.
     */
    get stroke(): string | null {
        if (this.hasAttribute('stroke')) {
            return this.getAttribute('stroke');
        }
        return null;
    }

    /**
     * Sets the animation speed for the icon.
     * Accepts a number or a string that can be parsed to a number.
     */
    set speed(value: string | number | null) {
        if (value) {
            this.setAttribute('speed', String(value));
        } else {
            this.removeAttribute('speed');
        }
    }

    /**
     * Gets the current animation speed.
     * Returns 1 if not set or invalid.
     */
    get speed(): number {
        const speed = this.getAttribute('speed');
        if (speed) {
            const parsedSpeed = parseFloat(speed);
            if (!isNaN(parsedSpeed)) {
                return parsedSpeed;
            }
        }
        return 1; // Default speed
    }

    /**
     * Returns true if the element is fully initialized and ready for interaction.
     * You can listen for the 'ready' event to detect readiness.
     */
    get ready() {
        return this._ready;
    }

    /**
     * Returns a promise that resolves when the element is ready.
     * Useful for awaiting initialization in external code.
     */
    get readyPromise(): Promise<void> {
        if (this._ready) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this.addEventListener('ready', () => {
                resolve();
            }, { once: true });
        });
    }

    /**
     * Returns the Player instance associated with this element.
     */
    get playerInstance(): Player | undefined {
        return this._playerInstance;
    }

    /**
     * Returns the Trigger instance associated with this element.
     */
    get triggerInstance(): Trigger | undefined {
        return this._triggerInstance;
    }

    /**
     * Returns the animation container element inside the shadow DOM.
     */
    get animationContainer(): HTMLElement | undefined {
        return this._root!.lastElementChild as any;
    }
}
