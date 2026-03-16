import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { Iframe } from "@/gui/screen/mainMenu/component/Iframe";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
export class PatchNotesScreen extends MainMenuScreen {
    private strings: any;
    private jsxRenderer: any;
    private patchNotesUrl: string;
    constructor(strings: any, jsxRenderer: any, patchNotesUrl: string) {
        super();
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.patchNotesUrl = patchNotesUrl;
        this.title = this.strings.get("TS:PatchNotes");
    }
    onEnter(): void {
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
        this.controller.toggleMainVideo(false);
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            width: "100%",
            height: "100%",
            component: Iframe,
            props: { src: this.patchNotesUrl, className: "patch-notes" },
        }));
        this.controller.setMainComponent(component);
    }
    async onLeave(): Promise<void> {
        await this.controller.hideSidebarButtons();
    }
    async onStack(): Promise<void> {
        await this.onLeave();
    }
    onUnstack(): void {
        this.onEnter();
    }
}
