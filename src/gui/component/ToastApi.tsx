import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { Toasts } from "@/gui/component/Toasts";
import { jsx } from "@/gui/jsx/jsx";
interface ToastMessage {
    text: string;
    timestamp: number;
}
interface Viewport {
    value: any;
    onChange: {
        subscribe: (fn: (v: any) => void) => void;
        unsubscribe: (fn: (v: any) => void) => void;
    };
}
interface UiScene {
    add: (el: any) => void;
    remove: (el: any) => void;
}
interface JsxRenderer {
    render: (el: any) => [
        any
    ];
}
export class ToastApi {
    private viewport: Viewport;
    private uiScene: UiScene;
    private jsxRenderer: JsxRenderer;
    private messages: ToastMessage[];
    private disposables: CompositeDisposable;
    private handleViewportChange: (v: any) => void;
    private innerComponent?: any;
    private uiToasts?: any;
    private updateTimeoutId?: any;
    constructor(viewport: Viewport, uiScene: UiScene, jsxRenderer: JsxRenderer) {
        this.viewport = viewport;
        this.uiScene = uiScene;
        this.jsxRenderer = jsxRenderer;
        this.messages = [];
        this.disposables = new CompositeDisposable();
        this.handleViewportChange = (v) => {
            if (this.innerComponent) {
                this.innerComponent.applyOptions((opts: any) => (opts.viewport = v));
            }
        };
    }
    push(text: string) {
        const timestamp = Date.now();
        this.messages.push({ text, timestamp });
        if (this.updateTimeoutId) {
            clearTimeout(this.updateTimeoutId);
            this.updateTimeoutId = void 0;
        }
        this.update();
    }
    update() {
        this.messages = this.messages.filter((msg) => msg.timestamp > Date.now() - 5000);
        this.messages = this.messages.slice(-5);
        if (this.messages.length) {
            const texts = this.messages.map((msg) => msg.text);
            if (this.uiToasts) {
                this.innerComponent?.applyOptions((opts: any) => (opts.messages = texts));
            }
            else {
                const [ui] = this.jsxRenderer.render(jsx(HtmlView, {
                    innerRef: (ref: any) => (this.innerComponent = ref),
                    component: Toasts,
                    props: {
                        messages: texts,
                        viewport: this.viewport.value,
                        zIndex: 101,
                    },
                }));
                this.uiToasts = ui;
                this.uiScene.add(ui);
                this.viewport.onChange.subscribe(this.handleViewportChange);
                this.disposables.add(ui, () => this.uiScene.remove(ui), () => this.viewport.onChange.unsubscribe(this.handleViewportChange), () => (this.innerComponent = void 0), () => (this.uiToasts = void 0));
            }
            this.updateTimeoutId = setTimeout(() => this.update(), 5000);
        }
        else {
            this.destroy();
        }
    }
    destroy() {
        if (this.updateTimeoutId) {
            clearTimeout(this.updateTimeoutId);
            this.updateTimeoutId = void 0;
        }
        this.disposables.dispose();
    }
}
