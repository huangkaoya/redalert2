import * as THREE from 'three';
export interface Renderable {
    create3DObject(): void;
    get3DObject(): THREE.Object3D | undefined;
    update(deltaTime: number, ...args: any[]): void;
    destroy?(): void;
}
export class RenderableContainer {
    private children: Set<Renderable> = new Set();
    private renderQueue: Renderable[] = [];
    private container?: THREE.Object3D;
    constructor(container?: THREE.Object3D) {
        if (container) {
            this.set3DObject(container);
        }
    }
    set3DObject(container: THREE.Object3D): void {
        this.container = container;
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.container;
    }
    getChildren(): Renderable[] {
        return [...this.children];
    }
    add(...objects: Renderable[]): void {
        for (const obj of objects) {
            if (!this.children.has(obj)) {
                this.children.add(obj);
                this.renderQueue.push(obj);
            }
        }
    }
    remove(...objects: Renderable[]): void {
        for (const obj of objects) {
            if (this.children.has(obj)) {
                this.children.delete(obj);
                const queueIndex = this.renderQueue.indexOf(obj);
                if (queueIndex === -1) {
                    const obj3d = obj.get3DObject();
                    if (obj3d && obj3d.parent && this.get3DObject()) {
                        this.get3DObject()!.remove(obj3d);
                    }
                }
                else {
                    this.renderQueue.splice(queueIndex, 1);
                }
            }
        }
    }
    removeAll(): void {
        this.remove(...this.children);
    }
    processRenderQueue(): void {
        if (!this.get3DObject()) {
            throw new Error('A THREE.Object3D must be passed in the constructor or using the setter.');
        }
        let obj: Renderable | undefined;
        while ((obj = this.renderQueue.shift())) {
            obj.create3DObject();
            const obj3d = obj.get3DObject();
            if (obj3d) {
                this.get3DObject()!.add(obj3d);
            }
        }
    }
    create3DObject(): void {
        this.processRenderQueue();
    }
    update(deltaTime: number, ...args: any[]): void {
        if (this.renderQueue.length) {
            this.processRenderQueue();
        }
        for (const child of this.children) {
            if (this.renderQueue.length) {
                this.processRenderQueue();
            }
            child.update(deltaTime, ...args);
        }
    }
}
