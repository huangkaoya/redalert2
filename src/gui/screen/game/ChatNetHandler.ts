import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { RECIPIENT_ALL, RECIPIENT_TEAM } from '@/network/gservConfig';
export class ChatNetHandler {
    private disposables = new CompositeDisposable();
    constructor(private gservCon: any, private wolCon: any, private messageList: any, private chatHistory: any, private chatMessageFormat: any, private localPlayer: any, private game: any, private replayRecorder: any, private mutedPlayers: Set<string>) { }
    init(): void {
        this.wolCon.onChatMessage.subscribe(this.handleMessage);
        this.disposables.add(() => this.wolCon.onChatMessage.unsubscribe(this.handleMessage));
        this.gservCon.onChatMessage.subscribe(this.handleMessage);
        this.disposables.add(() => this.gservCon.onChatMessage.unsubscribe(this.handleMessage));
    }
    private handleMessage = (message: any): void => {
        if (message.from === this.localPlayer.name &&
            message.to.type === ChatRecipientType.Whisper) {
            this.messageList.addChatMessage(this.chatMessageFormat.formatPrefixPlain(message) + ' ' + message.text, 'mediumpurple');
            this.chatHistory.addChatMessage(message);
            return;
        }
        const prefix = this.chatMessageFormat.formatPrefixPlain(message);
        let color: string;
        if (message.to.type !== ChatRecipientType.Page ||
            (message.from !== this.gservCon.getServerName() &&
                message.from !== this.wolCon.getServerName())) {
            let playerName: string;
            if (message.to.type === ChatRecipientType.Whisper) {
                playerName = message.from;
                color = 'mediumpurple';
            }
            else {
                const player = this.game.getPlayerByName(message.from);
                playerName = player.name;
                color = player.color.asHexString();
            }
            if (this.mutedPlayers.has(playerName)) {
                return;
            }
        }
        else {
            color = 'yellow';
        }
        if (message.to.type === ChatRecipientType.Channel &&
            message.to.name === RECIPIENT_ALL) {
            this.replayRecorder.recordChatMessage(this.game.currentTick, message.from, message.text);
        }
        this.messageList.addChatMessage(prefix + ' ' + message.text, color);
        this.chatHistory.addChatMessage(message);
        if (message.to.type === ChatRecipientType.Whisper &&
            message.to.name !== this.wolCon.getServerName() &&
            message.to.name !== this.gservCon.getServerName()) {
            this.chatHistory.lastWhisperFrom.value = message.from;
        }
    };
    submitMessage(text: string, recipient: any): void {
        if (!this.gservCon.isOpen()) {
            console.warn("Can't send chat message. Network connection is already closed.");
            return;
        }
        if (recipient.type === ChatRecipientType.Channel &&
            recipient.name === RECIPIENT_ALL) {
            if (text.startsWith('/')) {
                const currentUser = this.wolCon.getCurrentUser();
                if (this.wolCon.isOpen() && currentUser) {
                    this.wolCon.privmsg([currentUser], text);
                }
            }
            else {
                this.gservCon.sayChannel(text);
            }
        }
        else if (recipient.type === ChatRecipientType.Channel &&
            recipient.name === RECIPIENT_TEAM) {
            const allies = this.game.alliances
                .getAllies(this.localPlayer)
                .filter((player: any) => !player.isAi)
                .map((player: any) => player.name);
            this.gservCon.privmsg([...allies, this.localPlayer.name], text);
        }
        else if (recipient.type === ChatRecipientType.Whisper &&
            this.wolCon.isOpen()) {
            this.wolCon.privmsg([recipient.name], text);
            this.chatHistory.lastWhisperTo.value = recipient.name;
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
