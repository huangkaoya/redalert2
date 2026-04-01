import { EventDispatcher } from "@/util/event";
export interface Message {
    text: string;
    color: string;
    time: number;
    animate: boolean;
    durationSeconds?: number;
}
export class MessageList {
    messageDurationSeconds: number;
    maxMessages: number;
    localPlayer: any;
    isComposing: boolean;
    messages: Message[];
    private _onNewMessage: EventDispatcher<[
        MessageList,
        Message
    ]>;
    constructor(messageDurationSeconds: number, maxMessages: number, localPlayer: any) {
        this.messageDurationSeconds = messageDurationSeconds;
        this.maxMessages = maxMessages;
        this.localPlayer = localPlayer;
        this.isComposing = false;
        this.messages = [];
        this._onNewMessage = new EventDispatcher();
    }
    get onNewMessage() {
        return this._onNewMessage.asEvent();
    }
    addUiFeedbackMessage(text: string) {
        const msg: Message = {
            text,
            color: this.localPlayer?.color.asHexString() ?? "grey",
            time: Date.now(),
            animate: false,
        };
        this.messages.push(msg);
        this._onNewMessage.dispatch(this as any, msg);
    }
    addSystemMessage(text: string, colorOrPlayer: string | {
        color: {
            asHexString: () => string;
        };
    }, durationSeconds?: number) {
        const color = typeof colorOrPlayer === "string"
            ? colorOrPlayer
            : colorOrPlayer.color.asHexString();
        const msg: Message = {
            text,
            color,
            time: Date.now(),
            animate: true,
            durationSeconds,
        };
        this.messages.push(msg);
        this._onNewMessage.dispatch(this as any, msg);
    }
    addChatMessage(text: string, color: string) {
        const msg: Message = {
            text,
            color,
            time: Date.now(),
            animate: true,
        };
        this.messages.push(msg);
        this._onNewMessage.dispatch(this as any, msg);
    }
    prune() {
        const now = Date.now();
        this.messages = this.messages.filter((msg) => msg.time >=
            now - 1000 * (msg.durationSeconds ?? this.messageDurationSeconds));
        this.messages.splice(0, this.messages.length - this.maxMessages);
    }
    getAll(): Message[] {
        return this.messages;
    }
}
