import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { RECIPIENT_TEAM } from '@/network/gservConfig';
export class ChatTypingHandler {
    private isTyping = false;
    constructor(private keyboardHandler: any, private arrowScrollHandler: any, private messageList: any, private chatHistory: any) { }
    startTyping(): void {
        if (!this.isTyping) {
            this.keyboardHandler.pause();
            this.arrowScrollHandler.pause();
            this.messageList.isComposing = true;
            this.isTyping = true;
        }
    }
    endTyping(): void {
        if (this.isTyping) {
            this.keyboardHandler.unpause();
            this.arrowScrollHandler.unpause();
            this.messageList.isComposing = false;
            this.isTyping = false;
        }
    }
    handleKeyDown(event: KeyboardEvent): void {
        if (this.isTyping) {
            return;
        }
        if (event.key === 'Enter') {
            this.startTyping();
        }
        else if (event.key === 'Backspace') {
            this.chatHistory.lastComposeTarget.value = {
                type: ChatRecipientType.Channel,
                name: RECIPIENT_TEAM,
            };
            this.startTyping();
        }
    }
    handleKeyUp(event: KeyboardEvent): void {
    }
    dispose(): void {
        this.keyboardHandler.unpause();
        this.arrowScrollHandler.unpause();
        this.messageList.isComposing = false;
    }
}
