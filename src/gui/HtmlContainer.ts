import { LazyHtmlElement } from "./LazyHtmlElement";
export class HtmlContainer extends LazyHtmlElement {
    protected visible: boolean = true;
    protected left: number = 0;
    protected top: number = 0;
    protected width: number | string = 0;
    protected height: number | string = 0;
    protected relativeMode: boolean = false;
    protected translateMode: boolean = false;
    constructor() {
        super();
    }
    render(): void {
        if (!this.isRendered()) {
            let element = this.getElement();
            if (!element) {
                element = document.createElement("div");
                this.setElement(element);
            }
            this.updateMode();
            this.updatePosition();
            this.updateVisibility();
            this.updateSize();
        }
        super.render();
    }
    setRelativeMode(relative: boolean): void {
        if (this.relativeMode !== relative) {
            this.relativeMode = relative;
            this.updateMode();
        }
    }
    setTranslateMode(translate: boolean): void {
        if (this.translateMode !== translate) {
            this.translateMode = translate;
            this.updatePosition();
        }
    }
    setPosition(left: number, top: number): void {
        this.left = left;
        this.top = top;
        this.updatePosition();
    }
    setSize(width: number | string, height: number | string): void {
        this.width = width;
        this.height = height;
        this.updateSize();
    }
    getSize(): {
        width: number | string;
        height: number | string;
    } {
        return { width: this.width, height: this.height };
    }
    setVisible(visible: boolean): void {
        if (this.visible !== visible) {
            this.visible = visible;
            this.updateVisibility();
        }
    }
    protected updateMode(): void {
        const element = this.getElement();
        if (element) {
            if (this.relativeMode) {
                element.style.position = "relative";
            }
            else {
                element.style.overflow = "visible";
                element.style.position = "absolute";
            }
        }
    }
    protected updatePosition(): void {
        const element = this.getElement();
        if (element) {
            if (this.translateMode) {
                element.style.top = "0";
                element.style.left = "0";
                element.style.transform = `translate(${this.left}px, ${this.top}px)`;
            }
            else {
                element.style.left = this.left + 'px';
                element.style.top = this.top + 'px';
                element.style.transform = "";
            }
        }
    }
    protected updateSize(): void {
        const element = this.getElement();
        if (element) {
            element.style.width = typeof this.width === 'number' ? this.width + 'px' : this.width;
            element.style.height = typeof this.height === 'number' ? this.height + 'px' : this.height;
        }
    }
    hide(): void {
        this.setVisible(false);
    }
    show(): void {
        this.setVisible(true);
    }
    protected updateVisibility(): void {
        const element = this.getElement();
        if (element) {
            element.style.display = this.visible ? "block" : "none";
        }
    }
}
