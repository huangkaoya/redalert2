import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { RECIPIENT_ALL } from '@/network/gservConfig';
import { BoxedVar } from '@/util/BoxedVar';
import { EventDispatcher } from '@/util/event';
export class ChatHistory {
    private lastWhisperFrom: BoxedVar<string | undefined>;
    private lastWhisperTo: BoxedVar<string | undefined>;
    private lastComposeTarget: BoxedVar<{
        type: ChatRecipientType;
        name: string;
    }>;
    private messages: any[];
    private _onNewMessage: EventDispatcher;
    constructor() {
        this.lastWhisperFrom = new BoxedVar(undefined);
        this.lastWhisperTo = new BoxedVar(undefined);
        this.lastComposeTarget = new BoxedVar({
            type: ChatRecipientType.Channel,
            name: RECIPIENT_ALL,
        });
        this.messages = [];
        this._onNewMessage = new EventDispatcher();
    }
    get onNewMessage() {
        return this._onNewMessage.asEvent();
    }
    addChatMessage(message: any) {
        this.messages.push(message);
        this._onNewMessage.dispatch(this, message);
    }
    getAll() {
        return this.messages;
    }
}
