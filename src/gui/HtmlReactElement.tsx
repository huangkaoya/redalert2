import React, { ComponentType, ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { HtmlContainer } from './HtmlContainer';

// P represents the props type for the React component
export class HtmlReactElement<P extends object> extends HtmlContainer {
    private options: P;
    private Component: ComponentType<P>;
    private root?: Root;

    static factory<P extends object>(
        Component: ComponentType<P>, 
        options: P
    ): HtmlReactElement<P> {
        return new HtmlReactElement<P>(options, Component);
    }

    constructor(options: P, Component: ComponentType<P>) {
        super(); // HtmlContainer constructor might take arguments, adjust if necessary
        this.options = options;
        this.Component = Component;
    }

    render(): void {
        if (!this.isRendered()) {
            const newElement = document.createElement("div");
            // Assign some default class or allow configuration?
            // newElement.className = "html-react-element-wrapper"; 
            this.setElement(newElement);
            this.renderReactElement();
        }
        super.render(); // Call HtmlContainer's render (if it does anything beyond setting isRendered)
    }

    private renderReactElement(): void {
        const element = this.getElement();
        if (element) {
            const reactElement = React.createElement(this.Component, this.options);
            this.root ??= createRoot(element);
            this.root.render(reactElement);
        } else {
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
    
    // Allow updating the component itself, if needed (advanced use case)
    setComponent(NewComponent: ComponentType<P>, newOptions?: P) {
        this.Component = NewComponent;
        if (newOptions !== undefined) {
            this.options = newOptions;
        }
        this.refresh();
    }
}
