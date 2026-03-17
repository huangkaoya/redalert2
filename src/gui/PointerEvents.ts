import { CompositeDisposable } from '../util/disposable/CompositeDisposable';
import { equals } from '../util/Array';
import { clamp } from '../util/math';
import * as THREE from 'three';
interface PointerPosition {
    x: number;
    y: number;
}
interface CanvasMetrics {
    x: number;
    y: number;
    width: number;
    height: number;
    toCanvasPosition(pageX: number, pageY: number): PointerPosition;
    toCanvasOffset(offsetX: number, offsetY: number): PointerPosition;
}
interface LockModePointer {
    x: number;
    y: number;
}
interface Renderer {
    getCanvas(): HTMLCanvasElement;
    getScenes(): Scene[];
}
interface Scene {
    get3DObject(): THREE.Object3D;
    scene: THREE.Scene;
    camera: THREE.Camera;
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
interface TouchStartBuffer {
    cb: () => void;
    timeoutId: number;
}
interface FakeMouseEvent extends Partial<MouseEvent> {
    offsetX: number;
    offsetY: number;
    button: number;
    isTouch: boolean;
    detail: number;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    timeStamp: number;
    touchDuration?: number;
}
interface PointerEventData {
    type: string;
    target?: THREE.Object3D;
    pointer: PointerPosition;
    intersection?: THREE.Intersection;
    button: number;
    isTouch: boolean;
    touchDuration?: number;
    clicks: number;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    timeStamp: number;
    wheelDeltaY: number;
    stopPropagation: () => void;
}
interface EventHandler {
    callback: (event: PointerEventData) => void;
    useCapture: boolean;
}
interface EventContext {
    handlers: Map<string, EventHandler[]>;
}
function isVisibleInScene(obj: THREE.Object3D, sceneRoot: THREE.Object3D): boolean {
    return !!obj.visible && (obj === sceneRoot || (!!obj.parent && isVisibleInScene(obj.parent, sceneRoot)));
}
export class PointerEvents {
    private renderer: Renderer;
    private lockModePointer: LockModePointer;
    private document: Document;
    private canvasMetrics: CanvasMetrics;
    private disposables: CompositeDisposable;
    private canvasContext: EventContext;
    private objectContexts: Map<THREE.Object3D, EventContext>;
    private intersectionsEnabled: boolean;
    private clickPaths: Map<number, THREE.Object3D[]>;
    private touchFingers: number;
    private currentHoverPath?: THREE.Object3D[];
    private initialTouchEvent?: TouchEvent;
    private touchStartBuffer?: TouchStartBuffer;
    constructor(renderer: Renderer, lockModePointer: LockModePointer, document: Document, canvasMetrics: CanvasMetrics) {
        this.renderer = renderer;
        this.lockModePointer = lockModePointer;
        this.document = document;
        this.canvasMetrics = canvasMetrics;
        this.disposables = new CompositeDisposable();
        this.canvasContext = { handlers: new Map() };
        this.objectContexts = new Map();
        this.intersectionsEnabled = true;
        this.clickPaths = new Map();
        this.touchFingers = 0;
        const canvas = renderer.getCanvas();
        canvas.addEventListener('dblclick', this.onDblClick, false);
        canvas.addEventListener('mousemove', this.onMouseMove, false);
        canvas.addEventListener('mousedown', this.onMouseDown, false);
        canvas.addEventListener('mouseup', this.onMouseUp, false);
        canvas.addEventListener('touchmove', this.onTouchMove, false);
        canvas.addEventListener('touchstart', this.onTouchStart, false);
        canvas.addEventListener('touchend', this.onTouchEnd, false);
        canvas.addEventListener('wheel', this.onMouseWheel, { passive: true });
        this.disposables.add(() => {
            canvas.removeEventListener('dblclick', this.onDblClick, false);
            canvas.removeEventListener('mousemove', this.onMouseMove, false);
            canvas.removeEventListener('mousedown', this.onMouseDown, false);
            canvas.removeEventListener('mouseup', this.onMouseUp, false);
            canvas.removeEventListener('touchmove', this.onTouchMove, false);
            canvas.removeEventListener('touchstart', this.onTouchStart, false);
            canvas.removeEventListener('touchend', this.onTouchEnd, false);
            canvas.removeEventListener('wheel', this.onMouseWheel, false);
        });
    }
    private onDblClick = (event: MouseEvent): void => {
        if (event.button === 0) {
            this.onMouseEvent('dblclick', event);
        }
    };
    private onMouseMove = (event: MouseEvent): void => {
        const pointerPos = this.getPointerPosition(event);
        if (this.intersectionsEnabled) {
            const previousHoverPath = this.currentHoverPath ? [...this.currentHoverPath] : undefined;
            const previousTarget = previousHoverPath?.[0];
            const intersection = this.findObjectUnderPointer(pointerPos);
            const currentTarget = intersection?.object;
            this.currentHoverPath = undefined;
            if (currentTarget) {
                this.currentHoverPath = [currentTarget];
                currentTarget.traverseAncestors((ancestor) => {
                    this.currentHoverPath!.push(ancestor);
                });
            }
            if (!equals(this.currentHoverPath ?? [], previousHoverPath ?? [])) {
                if (previousHoverPath) {
                    for (const obj of previousHoverPath) {
                        if (!(this.currentHoverPath && this.currentHoverPath.includes(obj))) {
                            this.notify('mouseleave', obj, pointerPos, event, undefined, false);
                        }
                    }
                }
                if (this.currentHoverPath) {
                    for (const obj of this.currentHoverPath) {
                        if (!(previousHoverPath && previousHoverPath.includes(obj))) {
                            this.notify('mouseenter', obj, pointerPos, event, intersection, false);
                        }
                    }
                }
                if (previousTarget) {
                    this.notify('mouseout', previousTarget, pointerPos, event);
                }
                if (currentTarget) {
                    this.notify('mouseover', currentTarget, pointerPos, event, intersection);
                }
            }
            if (currentTarget) {
                this.notify('mousemove', currentTarget, pointerPos, event, intersection);
            }
            else {
                this.renderer.getScenes().forEach((scene) => {
                    this.notify('mousemove', scene.get3DObject(), pointerPos, event);
                });
            }
        }
        this.notify('mousemove', 'canvas', pointerPos, event);
    };
    private onMouseDown = (event: MouseEvent): void => {
        this.onMouseEvent('mousedown', event);
    };
    private onMouseUp = (event: MouseEvent): void => {
        this.onMouseEvent('mouseup', event);
    };
    private onMouseWheel = (event: WheelEvent): void => {
        this.onMouseEvent('wheel', event);
    };
    private onTouchMove = (event: TouchEvent): void => {
        event.preventDefault();
        if (this.initialTouchEvent?.touches) {
            const initialTouch = this.initialTouchEvent.touches[0];
            const currentTouch = [...event.changedTouches].find((touch) => initialTouch.identifier === touch.identifier);
            if (currentTouch) {
                if (this.touchStartBuffer) {
                    clearTimeout(this.touchStartBuffer.timeoutId);
                    this.touchStartBuffer.cb();
                    this.touchStartBuffer = undefined;
                }
                const fakeEvent = this.fakeMouseEventFromTouch(currentTouch, event);
                this.onMouseMove(fakeEvent as unknown as MouseEvent);
            }
        }
    };
    private onTouchStart = (event: TouchEvent): void => {
        event.preventDefault();
        const touches = event.touches;
        if (touches.length > 1) {
            if (this.touchFingers <= 0) {
                if (touches[0].target === this.renderer.getCanvas() && touches.length === 2) {
                    if (this.touchStartBuffer) {
                        clearTimeout(this.touchStartBuffer.timeoutId);
                        this.touchStartBuffer = undefined;
                    }
                    this.touchFingers = 2;
                    if (!this.initialTouchEvent) {
                        this.initialTouchEvent = event;
                    }
                    const initialTouch = this.initialTouchEvent.touches[0];
                    const fakeEvent = this.fakeMouseEventFromTouch(initialTouch, event, 2);
                    this.onMouseEvent('mousedown', fakeEvent as unknown as MouseEvent);
                }
            }
        }
        else {
            const callback = () => {
                this.touchFingers = 1;
                const fakeEvent = this.fakeMouseEventFromTouch(touches[0], event);
                this.onMouseEvent('mousedown', fakeEvent as unknown as MouseEvent);
            };
            const timeoutId = setTimeout(callback, 50);
            this.touchStartBuffer = { cb: callback, timeoutId };
            this.initialTouchEvent = event;
        }
    };
    private onTouchEnd = (event: TouchEvent): void => {
        event.preventDefault();
        if (this.initialTouchEvent?.touches) {
            const initialTouch = this.initialTouchEvent.touches[0];
            const endTouch = [...event.changedTouches].find((touch) => initialTouch.identifier === touch.identifier);
            if (endTouch) {
                if (this.touchStartBuffer) {
                    clearTimeout(this.touchStartBuffer.timeoutId);
                    this.touchStartBuffer.cb();
                    this.touchStartBuffer = undefined;
                }
                const button = this.touchFingers === 2 ? 2 : 0;
                const fakeEvent = this.fakeMouseEventFromTouch(endTouch, event, button);
                fakeEvent.touchDuration = event.timeStamp - this.initialTouchEvent.timeStamp;
                this.touchFingers = 0;
                this.initialTouchEvent = undefined;
                this.onMouseEvent('mouseup', fakeEvent as unknown as MouseEvent);
            }
        }
    };
    addEventListener(target: THREE.Object3D | 'canvas', eventType: string, callback: (event: PointerEventData) => void, useCapture: boolean = false): () => void {
        const context = target === 'canvas'
            ? this.canvasContext
            : this.getOrCreateObjectContext(target);
        let handlers = context.handlers.get(eventType);
        if (!handlers) {
            handlers = [];
            context.handlers.set(eventType, handlers);
        }
        handlers.push({ callback, useCapture });
        return () => this.removeEventListener(target, eventType, callback, useCapture);
    }
    removeEventListener(target: THREE.Object3D | 'canvas', eventType: string, callback: (event: PointerEventData) => void, useCapture: boolean = false): void {
        const context = target === 'canvas'
            ? this.canvasContext
            : this.objectContexts.get(target as THREE.Object3D);
        if (context && context.handlers.has(eventType)) {
            let handlers = context.handlers.get(eventType)!;
            handlers = handlers.filter((handler) => !(handler.callback === callback && handler.useCapture === useCapture));
            if (handlers.length) {
                context.handlers.set(eventType, handlers);
            }
            else {
                context.handlers.delete(eventType);
            }
            if (!context.handlers.size && target !== 'canvas') {
                this.objectContexts.delete(target as THREE.Object3D);
            }
        }
    }
    private getOrCreateObjectContext(obj: THREE.Object3D): EventContext {
        if (!obj) {
            throw new Error('Undefined Object3D instance.');
        }
        let context = this.objectContexts.get(obj);
        if (!context) {
            context = { handlers: new Map() };
            this.objectContexts.set(obj, context);
        }
        return context;
    }
    private fakeMouseEventFromTouch(touch: Touch, event: TouchEvent, button: number = 0): FakeMouseEvent {
        const position = this.computeTouchPosition(touch);
        return {
            offsetX: position.x,
            offsetY: position.y,
            button,
            isTouch: true,
            detail: 1,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            timeStamp: event.timeStamp,
        };
    }
    private computeTouchPosition(touch: Touch): PointerPosition {
        let position = this.canvasMetrics.toCanvasPosition(touch.pageX, touch.pageY);
        position.x = clamp(position.x, 0, this.canvasMetrics.width - 1);
        position.y = clamp(position.y, 0, this.canvasMetrics.height - 1);
        return position;
    }
    private onMouseEvent(eventType: string, event: MouseEvent | WheelEvent): void {
        const pointerPos = this.getPointerPosition(event);
        const intersection = this.findObjectUnderPointer(pointerPos);
        if (intersection) {
            this.notify(eventType, intersection.object, pointerPos, event, intersection);
        }
        else {
            this.renderer.getScenes().forEach((scene) => {
                this.notify(eventType, scene.get3DObject(), pointerPos, event);
            });
        }
        this.notify(eventType, 'canvas', pointerPos, event);
        if (eventType === 'mousedown' || eventType === 'mouseup') {
            const targetObj = intersection?.object;
            let clickPath: THREE.Object3D[] = [];
            if (targetObj) {
                clickPath = [targetObj];
                targetObj.traverseAncestors((ancestor) => {
                    clickPath.push(ancestor);
                });
            }
            if (eventType === 'mousedown') {
                this.clickPaths.set((event as MouseEvent).button, clickPath);
            }
            else {
                const downPath = this.clickPaths.get((event as MouseEvent).button);
                this.clickPaths.delete((event as MouseEvent).button);
                let clickHandled = false;
                for (const obj of clickPath) {
                    if (downPath?.includes(obj)) {
                        this.notify('click', obj, pointerPos, event, intersection);
                        clickHandled = true;
                        break;
                    }
                }
                if (!clickHandled) {
                    this.renderer.getScenes().forEach((scene) => {
                        this.notify('click', scene.get3DObject(), pointerPos, event);
                    });
                    this.notify('click', 'canvas', pointerPos, event);
                }
            }
        }
    }
    private getPointerPosition(event: MouseEvent | WheelEvent): PointerPosition {
        return this.document.pointerLockElement
            ? this.lockModePointer
            : this.canvasMetrics.toCanvasOffset((event as MouseEvent).offsetX, (event as MouseEvent).offsetY);
    }
    private findObjectUnderPointer(pointerPos: PointerPosition): THREE.Intersection | undefined {
        const scenes = this.renderer.getScenes();
        const objectsByScene = this.groupObjectsByScene();
        for (let i = scenes.length - 1; i >= 0; i--) {
            const raycaster = new THREE.Raycaster();
            const normalizedPointer = this.normalizePointer(pointerPos, scenes[i].viewport);
            raycaster.setFromCamera(normalizedPointer, scenes[i].camera);
            raycaster.layers.enable(1);
            const sceneObjects = objectsByScene
                .get(scenes[i].scene)!
                .filter((obj) => isVisibleInScene(obj, scenes[i].get3DObject()));
            const intersections = raycaster.intersectObjects(sceneObjects, true);
            if (intersections.length) {
                if (intersections.length === 1)
                    return intersections[0];
                const objectSet = new Set(intersections.map((intersection) => intersection.object));
                intersections.forEach((intersection) => {
                    if (objectSet.has(intersection.object)) {
                        intersection.object.traverseAncestors((ancestor) => {
                            if (objectSet.has(ancestor)) {
                                objectSet.delete(ancestor);
                            }
                        });
                    }
                });
                return intersections.filter((intersection) => objectSet.has(intersection.object))[0];
            }
        }
        return undefined;
    }
    private normalizePointer(pointerPos: PointerPosition, viewport: Scene['viewport']): THREE.Vector2 {
        return new THREE.Vector2(((pointerPos.x - viewport.x) / viewport.width) * 2 - 1, -((pointerPos.y - viewport.y) / viewport.height) * 2 + 1);
    }
    private groupObjectsByScene(): Map<THREE.Scene, THREE.Object3D[]> {
        const objectsByScene = new Map<THREE.Scene, THREE.Object3D[]>();
        this.renderer.getScenes().forEach((scene) => {
            objectsByScene.set(scene.get3DObject() as THREE.Scene, []);
        });
        [...this.objectContexts.keys()].forEach((obj) => {
            if (obj.type !== 'Scene') {
                let root = obj;
                while (root.parent) {
                    root = root.parent;
                }
                if (root.type === 'Scene') {
                    objectsByScene.get(root as THREE.Scene)!.push(obj);
                }
            }
        });
        return objectsByScene;
    }
    private notify(eventType: string, target: THREE.Object3D | 'canvas', pointerPos: PointerPosition, originalEvent: Event, intersection?: THREE.Intersection, bubble: boolean = true): void {
        const context = target === 'canvas'
            ? this.canvasContext
            : this.objectContexts.get(target as THREE.Object3D);
        const handlers = context?.handlers.get(eventType);
        if (!(handlers && handlers.length)) {
            if (target !== 'canvas' && (target as THREE.Object3D).parent && bubble) {
                this.notify(eventType, (target as THREE.Object3D).parent!, pointerPos, originalEvent, intersection);
            }
            return;
        }
        handlers.forEach((handler) => {
            let shouldContinueBubbling = true;
            const eventData: PointerEventData = {
                type: eventType,
                target: target !== 'canvas' ? (target as THREE.Object3D) : undefined,
                pointer: { ...pointerPos },
                intersection,
                button: (originalEvent as MouseEvent).button || 0,
                isTouch: !!(originalEvent as any).isTouch,
                touchDuration: (originalEvent as any).touchDuration,
                clicks: (originalEvent as MouseEvent).detail || 1,
                altKey: (originalEvent as KeyboardEvent).altKey || false,
                ctrlKey: (originalEvent as KeyboardEvent).ctrlKey || false,
                metaKey: (originalEvent as KeyboardEvent).metaKey || false,
                shiftKey: (originalEvent as KeyboardEvent).shiftKey || false,
                timeStamp: originalEvent.timeStamp,
                wheelDeltaY: (originalEvent as WheelEvent).deltaY ?? 0,
                stopPropagation: () => {
                    shouldContinueBubbling = false;
                },
            };
            handler.callback(eventData);
            if (shouldContinueBubbling && target !== 'canvas' && !handler.useCapture &&
                (target as THREE.Object3D).parent && bubble) {
                this.notify(eventType, (target as THREE.Object3D).parent!, pointerPos, originalEvent, intersection);
            }
        });
    }
    dispose(): void {
        if (this.touchStartBuffer) {
            clearTimeout(this.touchStartBuffer.timeoutId);
            this.touchStartBuffer = undefined;
        }
        this.disposables.dispose();
    }
}
