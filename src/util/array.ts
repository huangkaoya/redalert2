export function findReverse<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): T | undefined {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i], i, array)) {
            return array[i];
        }
    }
    return undefined;
}
export function findIndexReverse<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): number {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i], i, array)) {
            return i;
        }
    }
    return -1;
}
export function equals<T>(array1: T[], array2: T[]): boolean {
    if (array1.length !== array2.length) {
        return false;
    }
    for (let i = 0, length = array1.length; i < length; i++) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}
