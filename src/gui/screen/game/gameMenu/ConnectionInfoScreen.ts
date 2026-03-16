import { jsx } from '@/gui/jsx/jsx';
import { ScreenType } from '@/gui/screen/game/gameMenu/ScreenType';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { ConInfoForm } from '@/gui/screen/game/gameMenu/ConInfoForm';
import { GameMenuScreen } from '@/gui/screen/game/GameMenuScreen';
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface Player {
    name: string;
    color: {
        asHexString(): string;
    };
    country?: {
        name: string;
    };
    isAi: boolean;
}
interface ChatMessage {
    text?: string;
    value?: string;
    recipient?: any;
}
interface ChatHistory {
    onNewMessage: {
        subscribe(handler: (message: ChatMessage) => void): void;
        unsubscribe(handler: (message: ChatMessage) => void): void;
    };
    lastComposeTarget?: {
        value: {
            type: any;
            name: string;
        };
    };
}
interface GservConnection {
    isOpen(): boolean;
    onLoadInfo: {
        subscribe(handler: (data: any) => void): void;
        unsubscribe(handler: (data: any) => void): void;
    };
    requestLoadInfo(): void;
}
interface ChatNetHandler {
    submitMessage(message: string, recipient: any): void;
}
interface ConnectionInfoParams {
    players: Player[];
    localPlayer: Player;
    chatHistory: ChatHistory;
    gservCon: GservConnection;
    chatNetHandler: ChatNetHandler;
    onQuit: () => void;
}
interface SidebarButton {
    label: string;
    onClick: () => void;
}
interface GameMenuController {
    toggleContentAreaVisibility(visible: boolean): void;
    setSidebarButtons(buttons: SidebarButton[]): void;
    showSidebarButtons(): void;
    hideSidebarButtons(): void;
    setMainComponent(component: any): void;
    pushScreen?(screenType: any, params: any): void;
    popScreen?(): void;
}
interface JsxRenderer {
    render(element: any): any[];
}
interface FormRef {
    refresh(): void;
    applyOptions(updater: (options: any) => void): void;
}
class LoadInfoParser {
    parse(data: any): any {
        return data;
    }
}
export class ConnectionInfoScreen extends GameMenuScreen {
    private strings: Strings;
    private jsxRenderer: JsxRenderer;
    private messages: ChatMessage[] = [];
    private disposables = new CompositeDisposable();
    private params?: ConnectionInfoParams;
    private form?: FormRef;
    declare controller?: GameMenuController;
    constructor(strings: Strings, jsxRenderer: JsxRenderer) {
        super();
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.messages = [];
        this.disposables = new CompositeDisposable();
    }
    private handleChatMessage = (message: ChatMessage): void => {
        this.messages.push(message);
        this.form?.refresh();
    };
    private handleConInfoUpdate = (data: any): void => {
        this.form?.applyOptions((options: any) => {
            options.conInfos = new LoadInfoParser().parse(data);
        });
    };
    onEnter(params: ConnectionInfoParams): void {
        this.params = params;
        this.controller?.toggleContentAreaVisibility(true);
        this.initView(params);
        if (params.gservCon.isOpen()) {
            params.gservCon.onLoadInfo.subscribe(this.handleConInfoUpdate);
            this.disposables.add(() => params.gservCon.onLoadInfo.unsubscribe(this.handleConInfoUpdate));
            params.gservCon.requestLoadInfo();
            const interval = setInterval(() => {
                if (params.gservCon.isOpen()) {
                    params.gservCon.requestLoadInfo();
                }
                else {
                    this.disposables.dispose();
                }
            }, 1000);
            this.disposables.add(() => clearInterval(interval));
            params.chatHistory.onNewMessage.subscribe(this.handleChatMessage);
            this.disposables.add(() => {
                this.messages.length = 0;
                params.chatHistory.onNewMessage.unsubscribe(this.handleChatMessage);
            });
        }
        this.messages.push({
            text: this.strings.get("GUI:ConnectingToPlayers") +
                "...\n" +
                this.strings.get("TXT_RECONNECT_HELP2") +
                " " +
                this.strings.get("TXT_RECONNECT_HELP2B"),
        });
    }
    private initView(params: ConnectionInfoParams): void {
        const strings = this.strings;
        const buttons: SidebarButton[] = [
            {
                label: strings.get("GUI:AbortMission"),
                onClick: () => {
                    this.controller?.pushScreen?.(ScreenType.QuitConfirm, {
                        onQuit: params.onQuit,
                        onCancel: () => {
                            this.controller?.popScreen?.();
                        },
                    });
                },
            },
        ];
        this.controller?.setSidebarButtons(buttons);
        this.controller?.showSidebarButtons();
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            width: "100%",
            height: "100%",
            component: ConInfoForm,
            innerRef: (form: FormRef) => (this.form = form),
            props: {
                players: params.players,
                localPlayer: params.localPlayer,
                strings: this.strings,
                messages: this.messages,
                chatHistory: params.chatHistory,
                onSendMessage: (message: ChatMessage) => {
                    if (message.value && message.recipient) {
                        params.chatNetHandler.submitMessage(message.value, message.recipient);
                    }
                },
            },
        }));
        this.controller?.setMainComponent(component);
        this.disposables.add(() => (this.form = undefined));
    }
    async onLeave(): Promise<void> {
        this.params = undefined;
        this.controller?.hideSidebarButtons();
        this.controller?.toggleContentAreaVisibility(false);
        this.disposables.dispose();
    }
    async onStack(): Promise<void> {
        this.controller?.hideSidebarButtons();
    }
    onUnstack(): void {
        if (this.params) {
            this.initView(this.params);
        }
    }
}
