import { getKeyName } from "@/util/keyNames";
import { isMac, isIpad } from "@/util/userAgent";
interface KeyEvent {
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    keyCode?: number;
}
export function getHumanReadableKey(event: KeyEvent): string {
    const isMacOrIpad = isMac() || isIpad();
    const parts: string[] = [];
    if (event.ctrlKey) {
        parts.push("Ctrl");
    }
    if (event.altKey) {
        parts.push(isMacOrIpad ? "⌥" : "Alt");
    }
    if (event.shiftKey) {
        parts.push("Shift");
    }
    if (event.metaKey) {
        parts.push(isMacOrIpad ? "⌘" : "Win");
    }
    if (event.keyCode !== undefined) {
        parts.push(getKeyName(event.keyCode));
        return parts.join("+");
    }
    else {
        return parts.join("+") + "+";
    }
}
