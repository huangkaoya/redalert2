import { jsx } from '../../../jsx/jsx';
import { HtmlView } from '../../../jsx/HtmlView';
import { MainMenuScreen } from '../MainMenuScreen';
import { Iframe } from '../component/Iframe';
export class LadderRulesScreen extends MainMenuScreen {
    public title: string;
    private strings: any;
    private jsxRenderer: any;
    private rulesUrl: string;
    constructor(strings: any, jsxRenderer: any, rulesUrl: string) {
        super();
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.rulesUrl = rulesUrl;
        this.title = this.strings.get("GUI:Rules");
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
            component: Iframe,
            props: {
                src: this.rulesUrl,
                className: "ladder-rules-iframe",
            },
        }));
        this.controller.setMainComponent(component);
    }
    async onLeave(): Promise<void> {
        await this.controller.hideSidebarButtons();
    }
}
