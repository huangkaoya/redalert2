export function isIpad(): boolean {
    return (/iPad/i.test(navigator.userAgent) ||
        (/MacIntel/i.test(navigator.platform) && !!navigator.maxTouchPoints));
}
export function isMac(): boolean {
    return navigator.platform.includes("Mac");
}
export function isMacFirefox(): boolean {
    return isMac() && navigator.userAgent.toLowerCase().includes("firefox");
}
