import React from "react";
import { ChatInput } from "@/gui/component/ChatInput";
import { RECIPIENT_ALL, RECIPIENT_TEAM } from "@/network/gservConfig";
type HudChatProps = {
    messageList: any;
    chatHistory: any;
    strings: any;
    onSubmit: (e: any) => void;
    onCancel: () => void;
};
export const HudChat: React.FC<HudChatProps & {
    isComposing: boolean;
    localPlayer?: {
        color: {
            asHexString: () => string;
        };
    };
}> = ({ messageList, chatHistory, strings, onSubmit, onCancel, isComposing, localPlayer, }) => {
    if (!isComposing)
        return null;
    const forceColor = localPlayer?.color.asHexString() ?? "white";
    return (<ChatInput chatHistory={chatHistory} channels={[RECIPIENT_ALL, RECIPIENT_TEAM]} className="game-chat-input" forceColor={forceColor} noCycleHint={true} submitEmpty={true} strings={strings} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape")
                e.preventDefault();
            e.stopPropagation();
            (e.nativeEvent as KeyboardEvent & {
                stopImmediatePropagation?: () => void;
            }).stopImmediatePropagation?.();
        }} onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => {
            e.stopPropagation();
            (e.nativeEvent as KeyboardEvent & {
                stopImmediatePropagation?: () => void;
            }).stopImmediatePropagation?.();
        }} onSubmit={(e: any) => {
            e.value.length ? onSubmit(e) : onCancel();
        }} onCancel={onCancel} onBlur={onCancel}/>);
};
