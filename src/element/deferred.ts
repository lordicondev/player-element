/** A promise with its settlers on the outside, for `readyPromise`. */
export class Deferred<T = void> {
    readonly promise: Promise<T>;
    resolve!: (value: T) => void;
    reject!: (reason: unknown) => void;
    /** True once resolved or rejected. */
    settled = false;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = (value) => {
                this.settled = true;
                resolve(value);
            };
            this.reject = (reason) => {
                this.settled = true;
                reject(reason);
            };
        });
        // A rejection nobody awaits should not surface as an unhandled rejection.
        this.promise.catch(() => {});
    }
}
