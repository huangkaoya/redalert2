export class LazyHtmlElement {
    protected element?: HTMLElement;
    protected children: Set<LazyHtmlElement> = new Set();
    protected rendered: boolean = false;
    constructor(element?: HTMLElement) {
        if (element) {
            this.setElement(element);
        }
    }
    setElement(element: HTMLElement): void {
        this.element = element;
    }
    getElement(): HTMLElement | undefined {
        return this.element;
    }
    getChildren(): LazyHtmlElement[] {
        return [...this.children];
    }
    isRendered(): boolean {
        return this.rendered;
    }
    add(...children: LazyHtmlElement[]): void {
        for (const child of children) {
            if (!this.children.has(child)) {
                this.children.add(child);
                if (this.rendered) {
                    this.renderChild(child);
                }
            }
        }
    }
    remove(...children: LazyHtmlElement[]): void {
        for (const child of children) {
            if (this.children.has(child)) {
                this.children.delete(child);
                if (this.rendered) {
                    this.unrenderChild(child);
                }
            }
        }
    }
    removeAll(): void {
        this.remove(...this.children);
    }
    render(): void {
        if (!this.element) {
            throw new Error('An HTML element must be passed in the constructor or using the setter.');
        }
        this.children.forEach(child => this.renderChild(child));
        this.rendered = true;
    }
    protected renderChild(child: LazyHtmlElement): void {
        child.render();
        const childElement = child.getElement();
        if (childElement) {
            this.getElement()!.appendChild(childElement);
        }
    }
    protected unrenderChild(child: LazyHtmlElement): void {
        const childElement = child.getElement();
        if (childElement) {
            child.unrender();
            if (childElement.parentElement === this.getElement()) {
                this.getElement()!.removeChild(childElement);
            }
        }
    }
    unrender(): void {
        if (this.isRendered()) {
            this.children.forEach(child => this.unrenderChild(child));
            this.rendered = false;
        }
    }
}
