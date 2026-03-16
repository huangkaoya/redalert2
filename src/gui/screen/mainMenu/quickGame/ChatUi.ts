import { CancellationToken } from "@puzzl/core/lib/async/cancellation";
import { WL_CHANNEL_ID_MIN } from "@/network/ladder/wladderConfig";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { ChatRecipientType } from "@/network/chat/ChatMessage";
import { SoundKey } from "@/engine/sound/SoundKey";
import { ChannelType } from "@/engine/sound/ChannelType";
import { Task } from "@puzzl/core/lib/async/Task";
import { ChatHistory } from "@/gui/chat/ChatHistory";
import { formatTime } from "@/util/time";
import { ChatInput } from "@/gui/component/ChatInput";
export class ChatUi {
    private messages: any[];
    private updateView: () => void;
    private wolConfig: any;
    private wolCon: any;
    private wolService: any;
    private wladderService: any;
    private strings: any;
    private sound: any;
    private disposables: CompositeDisposable;
    private users: any[] = [];
    private chatHistory: ChatHistory;
    private playerProfiles: Map<string, any>;
    private channelName?: string;
    private ranksUpdateTask?: Task<void>;
    constructor(messages: any[], updateView: () => void, wolConfig: any, wolCon: any, wolService: any, wladderService: any, strings: any, sound: any) {
        this.messages = messages;
        this.updateView = updateView;
        this.wolConfig = wolConfig;
        this.wolCon = wolCon;
        this.wolService = wolService;
        this.wladderService = wladderService;
        this.strings = strings;
        this.sound = sound;
        this.disposables = new CompositeDisposable();
        this.users = [];
        this.chatHistory = new ChatHistory();
        this.playerProfiles = new Map();
        this.onChannelJoinLeave = (event: any) => {
            let channelName = event.channel;
            const match = channelName.match(/#Lob (\d+) (\d)/i);
            if (match) {
                const [, channelId, lobbyIndex] = match.map(Number);
                if (this.wolConfig.getAllQuickMatchChannelIds().includes(channelId)) {
                    return;
                }
                channelName = this.strings.get("TXT_LOB_" + (lobbyIndex + 1));
            }
            if (event.user.name === this.wolCon.getCurrentUser()) {
                this.addSystemMessage(this.strings.get(event.type === "join" ? "TXT_JOINED_S" : "TXT_YOULEFT", channelName));
            }
            else if (event.channel === this.channelName) {
                if (event.type === "join") {
                    this.users.push(event.user);
                    this.users.sort((a, b) => Number(b.operator) - Number(a.operator));
                }
                else {
                    const userIndex = this.users.findIndex((u) => u.name === event.user.name);
                    if (userIndex !== -1) {
                        this.users.splice(userIndex, 1);
                    }
                }
                this.updateView();
                this.refreshPlayerRanks();
            }
        };
        this.onChannelUsers = (event: any) => {
            if (event.channelName === this.channelName) {
                this.users = event.users.slice();
                this.users.sort((a, b) => Number(b.operator) - Number(a.operator));
                this.updateView();
                this.refreshPlayerRanks();
            }
        };
        this.onChannelMessage = (message: any) => {
            if ((message.to.type !== ChatRecipientType.Page &&
                message.to.type !== ChatRecipientType.Whisper) ||
                this.sound.play(SoundKey.IncomingMessage, ChannelType.Ui)) {
                this.messages.push(message);
                this.updateView();
            }
            if (message.to.type === ChatRecipientType.Whisper &&
                message.to.name !== this.wolCon.getServerName() &&
                message.from !== this.wolCon.getCurrentUser()) {
                this.chatHistory.lastWhisperFrom.value = message.from;
            }
        };
    }
    private onChannelJoinLeave: (event: any) => void;
    private onChannelUsers: (event: any) => void;
    private onChannelMessage: (message: any) => void;
    private addSystemMessage(text: string): void {
        this.messages.push({ text });
        this.updateView();
    }
    private refreshPlayerRanks(): void {
        if (this.wladderService.getUrl()) {
            this.ranksUpdateTask?.cancel();
            const task = (this.ranksUpdateTask = new Task(async (cancellationToken: CancellationToken) => {
                const playerNames = this.users.map((user) => user.name);
                const profiles = await this.wladderService.listSearch(playerNames, cancellationToken);
                if (!cancellationToken.isCancelled()) {
                    for (const profile of profiles) {
                        this.playerProfiles.set(profile.name, profile);
                    }
                    this.updateView();
                }
            }));
            task.start().catch((error) => {
                if (!(error instanceof Error && error.name === "OperationCanceledError")) {
                    console.error(error);
                }
            });
        }
    }
    join(channelName: string): void {
        this.channelName = channelName;
        this.wolCon.onJoinChannel.subscribe(this.onChannelJoinLeave);
        this.wolCon.onLeaveChannel.subscribe(this.onChannelJoinLeave);
        this.wolCon.onChannelUsers.subscribe(this.onChannelUsers);
        this.wolCon.onChatMessage.subscribe(this.onChannelMessage);
    }
    leave(): void {
        this.channelName = undefined;
        this.users.length = 0;
        this.messages.length = 0;
        this.playerProfiles.clear();
        this.ranksUpdateTask?.cancel();
        this.ranksUpdateTask = undefined;
        this.wolCon.onJoinChannel.unsubscribe(this.onChannelJoinLeave);
        this.wolCon.onLeaveChannel.unsubscribe(this.onChannelJoinLeave);
        this.wolCon.onChannelUsers.unsubscribe(this.onChannelUsers);
        this.wolCon.onChatMessage.unsubscribe(this.onChannelMessage);
    }
    dispose(): void {
        this.disposables.dispose();
        this.ranksUpdateTask?.cancel();
    }
    getChatProps(): any {
        return {
            strings: this.strings,
            messages: this.messages,
            channels: this.channelName ? [this.channelName] : [],
            localUsername: this.wolCon.getCurrentUser(),
            users: this.users,
            chatHistory: this.chatHistory,
            playerProfiles: this.playerProfiles,
            onSendMessage: (message: any) => {
                if (message.value.length) {
                    if (this.wolCon.isOpen() && this.channelName) {
                        this.wolCon.sendChatMessage(message.value, message.recipient);
                        if (message.recipient.type === ChatRecipientType.Whisper) {
                            this.chatHistory.lastWhisperTo.value = message.recipient.name;
                        }
                    }
                }
                else {
                    this.addSystemMessage(this.strings.get("TXT_ENTER_MESSAGE"));
                }
            },
        };
    }
}
