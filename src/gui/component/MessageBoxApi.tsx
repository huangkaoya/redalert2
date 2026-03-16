import React from 'react';
import { jsx } from '../jsx/jsx';
import { HtmlView } from '../jsx/HtmlView';
import { CompositeDisposable } from '../../util/disposable/CompositeDisposable';
import { Dialog } from './Dialog';
import { PromptDialog } from './PromptDialog';
export interface ButtonConfig {
    label: string;
    onClick?: () => void;
}
export interface MessageBoxApiProps {
    viewport: any;
    uiScene: any;
    jsxRenderer: any;
}
export class MessageBoxApi {
    private viewport: any;
    private uiScene: any;
    private jsxRenderer: any;
    private disposables: CompositeDisposable;
    private component: any;
    constructor(viewport: any, uiScene: any, jsxRenderer: any) {
        this.viewport = viewport;
        this.uiScene = uiScene;
        this.jsxRenderer = jsxRenderer;
        this.disposables = new CompositeDisposable();
    }
    show(message: string | React.ReactNode, buttons: string | ButtonConfig[], callback?: (() => void) | {
        className?: string;
    }) {
        this.destroy();
        const options = typeof callback === 'function' ? undefined : callback;
        let [element] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.component = ref),
            component: Dialog,
            props: {
                children: typeof message === 'string' ? this.splitNewLines(message) : message,
                className: options?.className,
                viewport: this.viewport.value || this.viewport,
                zIndex: 101,
                buttons: typeof buttons === 'string'
                    ? [{
                            label: buttons,
                            onClick: () => {
                                this.disposables.dispose();
                                typeof callback === 'function' && callback();
                            }
                        }]
                    : (buttons ?? []).map(btn => ({
                        label: btn.label,
                        onClick: () => {
                            this.disposables.dispose();
                            btn.onClick?.();
                        }
                    }))
            }
        }));
        this.uiScene.add(element);
        this.disposables.add(element, () => this.uiScene.remove(element), () => (this.component = undefined));
    }
    splitNewLines(text: string): React.ReactNode[] {
        return text.split(/\n/g).map((line, index) => index ? (<React.Fragment key={index}>
          <br />
          <span>{line}</span>
        </React.Fragment>) : (<span key={index}>{line}</span>));
    }
    async confirm(message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.show(message, [
                { label: confirmLabel, onClick: () => resolve(true) },
                { label: cancelLabel, onClick: () => resolve(false) }
            ]);
        });
    }
    async alert(message: string, buttonLabel: string): Promise<void> {
        return new Promise((resolve) => this.show(message, buttonLabel, resolve));
    }
    async prompt(promptText: string, submitLabel: string, cancelLabel: string, inputProps?: any): Promise<string | undefined> {
        this.destroy();
        return new Promise((resolve) => {
            let [element] = this.jsxRenderer.render(jsx(HtmlView, {
                innerRef: (ref: any) => (this.component = ref),
                component: PromptDialog,
                props: {
                    promptText,
                    submitLabel,
                    cancelLabel,
                    inputProps,
                    onSubmit: (value: string) => {
                        resolve(value);
                        element.destroy();
                    },
                    onDismiss: () => {
                        resolve(undefined);
                        element.destroy();
                    },
                    viewport: this.viewport.value || this.viewport
                }
            }));
            this.uiScene.add(element);
            this.disposables.add(element, () => this.uiScene.remove(element), () => (this.component = undefined));
        });
    }
    updateViewport(viewport: any): void {
        this.viewport = viewport;
        this.component?.applyOptions((props: any) => (props.viewport = viewport.value || viewport));
    }
    updateText(text: string | React.ReactNode): void {
        this.component?.applyOptions((props: any) => {
            if (props.promptText) {
                props.promptText = text;
            }
            else {
                props.children = typeof text === 'string' ? this.splitNewLines(text) : text;
            }
        });
    }
    destroy(): void {
        this.disposables.dispose();
    }
}
