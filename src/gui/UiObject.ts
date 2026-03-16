import { EventDispatcher } from '../util/event';
import { HtmlContainer } from './HtmlContainer';
import { RenderableContainer, Renderable } from '../engine/gfx/RenderableContainer';
import * as THREE from 'three';
export class UiObject implements Renderable {
    private rendered: boolean = false;
    private eventHandlers: Array<{
        eventName: string;
        handler: Function;
        disposer?: Function;
    }> = [];
    private _onFrame = new EventDispatcher();
    private _onDispose = new EventDispatcher();
    private target?: THREE.Object3D;
    private htmlContainer?: HtmlContainer;
    private withPosition: {
        x: number;
        y: number;
        z: number;
    } = { x: 0, y: 0, z: 0 };
    private withVisibility: boolean = true;
    private container: RenderableContainer;
    private tooltip?: string;
    private pointerEvents?: any;
    get onFrame() {
        return this._onFrame.asEvent();
    }
    get onDispose() {
        return this._onDispose.asEvent();
    }
    static zIndexToWorld(zIndex: number): number {
        return -zIndex;
    }
    constructor(target?: THREE.Object3D, htmlContainer?: HtmlContainer) {
        if (target)
            this.set3DObject(target);
        if (htmlContainer)
            this.setHtmlContainer(htmlContainer);
        this.container = new RenderableContainer();
        if (this.target) {
            this.container.set3DObject(this.target);
        }
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    set3DObject(target: THREE.Object3D): void {
        this.target = target;
        target.matrixAutoUpdate = false;
    }
    getRenderableContainer() {
        return this.container;
    }
    getHtmlContainer(): HtmlContainer | undefined {
        return this.htmlContainer;
    }
    setHtmlContainer(htmlContainer: HtmlContainer): void {
        this.htmlContainer = htmlContainer;
    }
    setPosition(x: number, y: number): void {
        const z = this.withPosition.z || 0;
        this.withPosition = { x, y, z };
        if (this.htmlContainer) {
            this.htmlContainer.setPosition(x, y);
        }
        if (this.target) {
            this.target.position.set(x, y, z);
            this.target.updateMatrix();
        }
    }
    getPosition(): {
        x: number;
        y: number;
    } {
        return { x: this.withPosition.x, y: this.withPosition.y };
    }
    setZIndex(zIndex: number): void {
        const { x, y } = this.withPosition;
        this.withPosition = { x, y, z: UiObject.zIndexToWorld(zIndex) };
        if (this.target) {
            this.target.position.set(x, y, this.withPosition.z);
            this.target.updateMatrix();
        }
    }
    setVisible(visible: boolean): void {
        this.withVisibility = visible;
        this.htmlContainer?.setVisible(visible);
        if (this.target) {
            this.target.visible = visible;
        }
    }
    isVisible(): boolean {
        return this.withVisibility;
    }
    setTooltip(tooltip: string): void {
        this.tooltip = tooltip;
        this.updateTooltip();
    }
    updateTooltip(): void {
        const obj = this.get3DObject();
        if (obj) {
            obj.userData.tooltip = this.tooltip;
        }
    }
    setPointerEvents(pointerEvents: any): void {
        if (this.pointerEvents) {
            throw new Error('A PointerEvents instance is already set');
        }
        this.pointerEvents = pointerEvents;
    }
    addEventListener(eventName: string, handler: Function): () => void {
        this.eventHandlers.push({ eventName, handler });
        if (this.rendered) {
            this.setupEventListener(eventName, handler);
        }
        return () => this.removeEventListener(eventName, handler);
    }
    removeEventListener(eventName: string, handler: Function): void {
        const index = this.eventHandlers.findIndex((e) => eventName === e.eventName && handler === e.handler);
        if (index !== -1) {
            this.eventHandlers[index].disposer?.();
            this.eventHandlers.splice(index, 1);
        }
    }
    setupEventListener(eventName: string, handler: Function): void {
        if (!this.pointerEvents) {
            throw new Error('A PointerEvents object must be provided prior to setting up an event listener');
        }
        const disposer = this.pointerEvents.addEventListener(this.get3DObject(), eventName, handler);
        const eventHandler = this.eventHandlers.find((e) => eventName === e.eventName && handler === e.handler);
        if (eventHandler) {
            eventHandler.disposer = disposer;
        }
    }
    create3DObject(): void {
        if (!this.get3DObject()) {
            throw new Error('Expecting a THREE.Object3D to have been set by now');
        }
        if (!this.rendered) {
            this.rendered = true;
            const { x, y, z } = this.withPosition;
            if (this.target) {
                this.target.position.set(x, y, z);
                this.target.visible = this.withVisibility;
                this.target.updateMatrix();
            }
            this.htmlContainer?.render();
            this.htmlContainer?.setPosition(x, y);
            this.htmlContainer?.setVisible(this.withVisibility);
            this.container.set3DObject(this.get3DObject()!);
            this.container.create3DObject();
            this.updateTooltip();
            this.eventHandlers.forEach((e) => this.setupEventListener(e.eventName, e.handler));
        }
        else {
        }
    }
    update(deltaTime: number): void {
        this.container.update(deltaTime);
        this._onFrame.dispatch(this, deltaTime);
    }
    add(...children: UiObject[]): void {
        this.container.add(...children);
        children
            .map((child) => child.getHtmlContainer())
            .forEach((htmlContainer, index) => {
            if (htmlContainer) {
                if (!this.htmlContainer) {
                    console.error(`[UiObject] Parent has no HTML container but child has one!`);
                    throw new Error("Can't add an UiObject that defines an HTMLContainer to a parent that doesn't provide an HTML container.");
                }
                this.htmlContainer.add(htmlContainer);
            }
        });
    }
    remove(...children: UiObject[]): void {
        children
            .map((child) => child.getHtmlContainer())
            .forEach((htmlContainer) => {
            if (htmlContainer) {
                this.htmlContainer?.remove(htmlContainer);
            }
        });
        this.container.remove(...children);
    }
    removeAll(): void {
        this.container.removeAll();
    }
    destroy(): void {
        this.container.getChildren().forEach((child) => child.destroy?.());
        this.htmlContainer?.unrender();
        this.eventHandlers.forEach((e) => e.disposer?.());
        this.eventHandlers.length = 0;
        this._onFrame = new EventDispatcher();
        this._onDispose.dispatch('dispose', undefined);
        this._onDispose = new EventDispatcher();
    }
}
