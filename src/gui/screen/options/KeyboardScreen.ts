import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { KeyOpts } from "@/gui/screen/options/component/KeyOpts";
import { KeyCommandType } from "@/gui/screen/game/worldInteraction/keyboard/KeyCommandType";
interface ScreenController {
    setSidebarButtons(buttons: SidebarButton[]): void;
    showSidebarButtons(): void;
    hideSidebarButtons(): Promise<void>;
    setMainComponent(component: any): void;
    leaveCurrentScreen?(): void;
}
interface SidebarButton {
    label: string;
    isBottom?: boolean;
    onClick: () => void;
}
interface Strings {
    get(key: string): string;
}
interface KeyBinds {
    changeHotKey(commandType: KeyCommandType, hotKey: any): void;
    resetAndReload(): Promise<void>;
    save(): Promise<void>;
}
interface JsxRenderer {
    render(element: any): [
        any
    ];
}
export class KeyboardScreen {
    private controller!: ScreenController;
    private isDirty: boolean = false;
    public title: string;
    constructor(private strings: Strings, private jsxRenderer: JsxRenderer, private keyBinds: KeyBinds) {
        this.title = this.strings.get("GUI:KeyboardOptions");
    }
    setController(controller: ScreenController): void {
        this.controller = controller;
    }
    onEnter(): void {
        this.isDirty = false;
        this.controller.setSidebarButtons([
            {
                label: this.strings.get("GUI:Back"),
                isBottom: true,
                onClick: () => {
                    this.controller?.leaveCurrentScreen();
                },
            },
        ]);
        this.controller.showSidebarButtons();
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            width: "100%",
            height: "100%",
            component: KeyOpts,
            props: {
                keyBinds: this.keyBinds,
                strings: this.strings,
                onHotKeyChange: (commandType: KeyCommandType, hotKey: any) => {
                    this.keyBinds.changeHotKey(commandType, hotKey);
                    this.isDirty = true;
                },
                onResetAll: async () => {
                    try {
                        await this.keyBinds.resetAndReload();
                    }
                    catch (error) {
                        console.error(error);
                    }
                },
            },
        }));
        this.controller.setMainComponent(component);
    }
    async onLeave(): Promise<void> {
        await this.controller.hideSidebarButtons();
        if (this.isDirty) {
            this.isDirty = false;
            try {
                await this.keyBinds.save();
            }
            catch (error) {
                console.error(error);
            }
        }
    }
}
