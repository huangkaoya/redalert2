import React, { useState } from "react";
import { configurableCmds } from "@/gui/screen/options/component/configurableCmds";
import { List, ListItem } from "@/gui/component/List";
import { PressKeyInput } from "@/gui/screen/options/component/PressKeyInput";
import { getHumanReadableKey } from "@/gui/screen/options/component/getHumanReadableKey";
import { KeyboardHandler } from "@/gui/screen/game/worldInteraction/keyboard/KeyboardHandler";
import { KeyCommandType } from "@/gui/screen/game/worldInteraction/keyboard/KeyCommandType";
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface KeyEvent {
    keyCode?: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
}
interface KeyBinds {
    getHotKey(commandType: KeyCommandType): KeyEvent | undefined;
    getCommandType(keyEvent: KeyEvent): KeyCommandType | undefined;
    changeHotKey(commandType: KeyCommandType, keyEvent: KeyEvent | undefined): void;
}
interface KeyOptsProps {
    strings: Strings;
    keyBinds: KeyBinds;
    onResetAll?: () => Promise<void>;
    onHotKeyChange?: (commandType: KeyCommandType, keyEvent: KeyEvent | undefined) => void;
}
export const KeyOpts: React.FC<KeyOptsProps> = ({ strings, keyBinds, onResetAll, onHotKeyChange, }) => {
    const [selectedCommand, setSelectedCommand] = useState<KeyCommandType | undefined>();
    const [currentCommandType, setCurrentCommandType] = useState<KeyCommandType | undefined>();
    const [currentKeyEvent, setCurrentKeyEvent] = useState<KeyEvent | undefined>();
    const [inputKey, setInputKey] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const getLabel = (labelOrFunc: string | ((strings: Strings) => string)): string => {
        return typeof labelOrFunc === "function" ? labelOrFunc(strings) : strings.get(labelOrFunc);
    };
    const selectedCommandDesc = selectedCommand && configurableCmds.has(selectedCommand)
        ? configurableCmds.get(selectedCommand)!.desc
        : undefined;
    const descriptionText = selectedCommandDesc
        ? (typeof selectedCommandDesc === "function" ? selectedCommandDesc(strings) : strings.get(selectedCommandDesc))
        : undefined;
    const currentHotKey = selectedCommand ? keyBinds.getHotKey(selectedCommand) : undefined;
    return (<div className="opts key-opts">
      <div className="key-opts-list">
        <div className="key-opts-left">
          <List title={strings.get("GUI:Commands")} className="key-list">
            {[...configurableCmds].map(([commandType, { label }]) => (<ListItem key={commandType} selected={selectedCommand === commandType} onClick={() => {
                setSelectedCommand(commandType);
                setCurrentCommandType(undefined);
                setInputKey(inputKey + 1);
                setErrorMessage(undefined);
            }}>
                {getLabel(label)}
              </ListItem>))}
          </List>
        </div>
        <div className="key-opts-right">
          <fieldset className="key-opts-desc-container">
            <legend>{strings.get("GUI:Description")}</legend>
            <div className="key-opts-desc">
              {descriptionText}
            </div>
          </fieldset>
        </div>
      </div>
      <div className="key-opts-assigns">
        <div className="key-opts-cur-assign">
          <div className="key-opts-left" data-r-tooltip={strings.get("STT:KeyboardLabelAssigned")}>
            <div className="key-opts-cur-assign-label">
              {strings.get("GUI:CurrentShortcut")}
            </div>
            <div className="key-opts-cur-assign-value">
              {currentHotKey && getHumanReadableKey(currentHotKey)}
            </div>
          </div>
          <div className="key-opts-right">
            {errorMessage}
          </div>
        </div>
        <div className="key-opts-ch-assign">
          <div className="key-opts-left">
            <div className="key-opts-ch-assign-label">
              {strings.get("GUI:PressShortcut")}
            </div>
            <PressKeyInput key={inputKey} onChange={(keyEvent) => {
            setCurrentCommandType(keyEvent ? keyBinds.getCommandType(keyEvent) : undefined);
            setCurrentKeyEvent(keyEvent);
            setErrorMessage(undefined);
        }} tooltip={strings.get("STT:KeyboardEditEntry")}/>
            <div className="key-opts-ch-assign-current">
              <div>{strings.get("GUI:CurAssignedTo")}</div>
              <div>
                {currentCommandType && configurableCmds.has(currentCommandType)
            ? getLabel(configurableCmds.get(currentCommandType)!.label)
            : ""}
              </div>
            </div>
          </div>
          <div className="key-opts-right">
            <button className="dialog-button" disabled={!selectedCommand} onClick={() => {
            if (selectedCommand) {
                if (currentKeyEvent &&
                    (currentKeyEvent.shiftKey ||
                        currentKeyEvent.ctrlKey ||
                        currentKeyEvent.altKey ||
                        currentKeyEvent.metaKey)) {
                    if (KeyboardHandler.anyModifierCommands.includes(selectedCommand)) {
                        setErrorMessage(strings.get("Error:CannotMap"));
                        return;
                    }
                    const baseKeyCommand = keyBinds.getCommandType({
                        keyCode: currentKeyEvent.keyCode,
                        altKey: false,
                        ctrlKey: false,
                        shiftKey: false,
                        metaKey: false,
                    });
                    if (baseKeyCommand !== undefined &&
                        KeyboardHandler.anyModifierCommands.includes(baseKeyCommand)) {
                        setErrorMessage(strings.get("Error:CannotRemap"));
                        return;
                    }
                }
                onHotKeyChange?.(selectedCommand, currentKeyEvent);
                setCurrentCommandType(undefined);
                setCurrentKeyEvent(undefined);
                setInputKey(inputKey + 1);
                setErrorMessage(undefined);
            }
        }} data-r-tooltip={strings.get("STT:KeyboardButtonAssign")}>
              {strings.get("GUI:Assign")}
            </button>
            <button className="dialog-button" onClick={async () => {
            setSelectedCommand(undefined);
            setCurrentCommandType(undefined);
            setCurrentKeyEvent(undefined);
            setErrorMessage(undefined);
            await onResetAll?.();
            setInputKey(inputKey + 1);
        }} data-r-tooltip={strings.get("STT:KeyboardButtonResetAll")}>
              {strings.get("GUI:ResetAll")}
            </button>
          </div>
        </div>
        <fieldset className="key-opts-ch-assign-warn">
          <legend>{strings.get("TS:Warning").toLocaleUpperCase()}</legend>
          {strings.get("TS:HotKeyFSWarning")}
        </fieldset>
      </div>
    </div>);
};
