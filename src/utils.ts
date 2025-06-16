/**
 * Checks if value is object like.
 * @param value Value to check.
 * @returns True if value is object like, false otherwise.
 */
export function isObjectLike(value: any): value is object {
    return value !== null && typeof value === "object";
}