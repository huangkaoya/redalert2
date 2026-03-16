import React, { ComponentType, ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { HtmlContainer } from './HtmlContainer';
export class HtmlReactElement<P extends object> extends HtmlContainer {
    private options: P;
    private Component: ComponentType<P>;
    private root?: Root;
    static factory<P extends object>(Component: ComponentType<P>, options: P): HtmlReactElement<P> {
        return new HtmlReactElement<P>(options, Component);
    }
    constructor(options: P, Component: ComponentType<P>) {
        super();
        this.options = options;
        this.Component = Component;
    }
    render(): void {
        if (!this.isRendered()) {
            const newElement = document.createElement("div");
            this.setElement(newElement);
            this.renderReactElement();
        }
        super.render();
    }
    private renderReactElement(): void {
        const element = this.getElement();
        if (element) {
            const reactElement = React.createElement(this.Component, this.options);
            this.root ??= createRoot(element);
            this.root.render(reactElement);
        }
        else {
            console.warn("HtmlReactElement: Attempted to renderReactElement but no DOM element is set.");
        }
    }
    applyOptions(updater: (currentOptions: P) => void): void {
        updater(this.options);
        this.refresh();
    }
    refresh(): void {
        if (this.isRendered()) {
            this.renderReactElement();
        }
    }
    unrender(): void {
        if (this.root && this.isRendered()) {
            this.root.unmount();
            this.root = undefined;
        }
        super.unrender();
    }
    setComponent(NewComponent: ComponentType<P>, newOptions?: P) {
        this.Component = NewComponent;
        if (newOptions !== undefined) {
            this.options = newOptions;
        }
        this.refresh();
    }
}
