import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { SoundOpts } from "@/gui/screen/options/component/SoundOpts";
import { StorageKey } from "@/LocalPrefs";
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
interface Mixer {
    serialize(): string;
}
interface Music {
    serializeOptions(): string;
}
interface LocalPrefs {
    setItem(key: StorageKey, value: string): void;
}
interface JsxRenderer {
    render(element: any): [
        any
    ];
}
export class SoundOptsScreen {
    private controller!: ScreenController;
    private initialSettings: string = "";
    public title: string;
    constructor(private strings: Strings, private jsxRenderer: JsxRenderer, private mixer: Mixer, private music: Music, private localPrefs: LocalPrefs) {
        this.title = this.strings.get("GUI:Sound");
    }
    setController(controller: ScreenController): void {
        this.controller = controller;
    }
    onEnter(): void {
        this.initialSettings = this.mixer.serialize();
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
            component: SoundOpts,
            props: {
                mixer: this.mixer,
                music: this.music,
                strings: this.strings,
            },
        }));
        this.controller.setMainComponent(component);
    }
    async onLeave(): Promise<void> {
        const mixerSettings = this.mixer.serialize();
        if (mixerSettings !== this.initialSettings) {
            this.localPrefs.setItem(StorageKey.Mixer, mixerSettings);
        }
        if (this.music) {
            const musicOptions = this.music.serializeOptions();
            this.localPrefs.setItem(StorageKey.MusicOpts, musicOptions);
        }
        await this.controller.hideSidebarButtons();
    }
}
