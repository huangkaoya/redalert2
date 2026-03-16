import { FullScreen } from "@/gui/FullScreen";
import React, { useState } from "react";
import { getHumanReadableKey } from "@/gui/screen/options/component/getHumanReadableKey";
interface KeyEvent {
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    keyCode?: number;
}
interface PressKeyInputProps {
    tooltip?: string;
    onChange: (keyEvent: KeyEvent | undefined) => void;
}
const hasModifiers = (event: KeyboardEvent): boolean => event.shiftKey || event.ctrlKey || event.altKey || event.metaKey;
const isModifierKey = (event: KeyboardEvent): boolean => ["Alt", "Control", "Shift", "Meta"].includes(event.key);
const forbiddenKeys = [
    "Escape",
    "Backspace",
    "Enter",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    " ",
];
export const PressKeyInput: React.FC<PressKeyInputProps> = ({ tooltip, onChange }) => {
    const [currentKeyEvent, setCurrentKeyEvent] = useState<KeyEvent | undefined>();
    const updateKeyEvent = (keyEvent: KeyEvent | undefined) => {
        setCurrentKeyEvent(keyEvent);
        if (!keyEvent || keyEvent.keyCode === undefined) {
            onChange(keyEvent);
        }
        else {
            onChange(keyEvent);
        }
    };
    const displayValue = currentKeyEvent ? getHumanReadableKey(currentKeyEvent) : "";
    return (<input type="text" value={displayValue} data-r-tooltip={tooltip} onChange={() => { }} onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.repeat || e.keyCode > 255) {
                return;
            }
            if (forbiddenKeys.includes(e.key) || FullScreen.isFullScreenHotKey(e as any)) {
                updateKeyEvent(undefined);
            }
            else {
                updateKeyEvent({
                    shiftKey: e.shiftKey,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    metaKey: e.metaKey,
                    keyCode: isModifierKey(e as any) ? undefined : e.keyCode,
                });
            }
        }} onKeyUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.repeat || e.keyCode > 255) {
                return;
            }
            if (currentKeyEvent?.keyCode === undefined &&
                isModifierKey(e as any)) {
                updateKeyEvent(hasModifiers(e as any)
                    ? {
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey,
                        keyCode: undefined,
                    }
                    : undefined);
            }
        }} onBlur={() => {
            if (currentKeyEvent && currentKeyEvent.keyCode === undefined) {
                updateKeyEvent(undefined);
            }
        }}/>);
};
