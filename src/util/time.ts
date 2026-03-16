export async function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), milliseconds);
    });
}
export function throttle<T extends (...args: any[]) => Promise<any>>(func: T, delay: number): T {
    let inProgress = false;
    let lastCallTime = Number.NEGATIVE_INFINITY;
    const throttledFunc = async function (this: ThisParameterType<T>, ...args: Parameters<T>): Promise<ReturnType<T>> {
        if (inProgress) {
            return Promise.resolve(undefined as any);
        }
        const currentTime = Date.now();
        const timeSinceLastCall = currentTime - lastCallTime;
        if (delay <= timeSinceLastCall) {
            lastCallTime = currentTime;
            return await func.apply(this, args);
        }
        else {
            inProgress = true;
            await sleep(delay - timeSinceLastCall);
            lastCallTime = Date.now();
            inProgress = false;
            return await func.apply(this, args);
        }
    } as T;
    return throttledFunc;
}
export function createThrottledMethod<T extends (...args: any[]) => Promise<any>>(func: T, delay: number): T {
    return throttle(func, delay);
}
