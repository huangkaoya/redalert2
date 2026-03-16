import * as THREE from "three";
import * as IsoCoords from "@/engine/IsoCoords";
import { WithVisibility } from "@/engine/renderable/WithVisibility";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
interface Point {
    x: number;
    y: number;
}
interface Size {
    width: number;
    height: number;
}
interface BoundsInfo {
    getClampedFullSize(): Point & Size;
    getLocalSize(): Point & Size;
    onLocalResize: {
        subscribe: (callback: () => void) => void;
        unsubscribe: (callback: () => void) => void;
    };
}
interface Map {
    mapBounds: BoundsInfo;
}
export class MapBounds {
    private map: Map;
    private withVisibility: WithVisibility;
    private disposables: CompositeDisposable;
    private target?: THREE.Object3D;
    private wrapperObj?: THREE.Object3D;
    constructor(map: Map) {
        this.map = map;
        this.withVisibility = new WithVisibility();
        this.disposables = new CompositeDisposable();
        const handleResize = () => {
            if (this.target && this.wrapperObj) {
                this.target.remove(this.wrapperObj);
                this.wrapperObj = this.build();
                this.target.add(this.wrapperObj);
            }
        };
        map.mapBounds.onLocalResize.subscribe(handleResize);
        this.disposables.add(() => map.mapBounds.onLocalResize.unsubscribe(handleResize));
    }
    private build(): THREE.Object3D {
        const fullSize = this.map.mapBounds.getClampedFullSize();
        const localSize = this.map.mapBounds.getLocalSize();
        const fullRect = this.createBoundRect({ x: fullSize.x, y: fullSize.y }, { x: fullSize.x + fullSize.width, y: fullSize.y + fullSize.height }, 0xFF0000);
        fullRect.matrixAutoUpdate = false;
        const localRect = this.createBoundRect({ x: localSize.x, y: localSize.y }, { x: localSize.x + localSize.width, y: localSize.y + localSize.height - 1 }, 0x0000FF);
        localRect.matrixAutoUpdate = false;
        const container = new THREE.Object3D();
        container.matrixAutoUpdate = false;
        container.add(fullRect);
        container.add(localRect);
        return container;
    }
    private createBoundRect(start: Point, end: Point, color: number): THREE.Line {
        const topLeft = IsoCoords.IsoCoords.screenTileToWorld(start.x, start.y);
        const bottomRight = IsoCoords.IsoCoords.screenTileToWorld(end.x, end.y);
        const bottomLeft = IsoCoords.IsoCoords.screenTileToWorld(end.x, start.y);
        const topRight = IsoCoords.IsoCoords.screenTileToWorld(start.x, end.y);
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const geometry = new THREE.BufferGeometry();
        const verts = new Float32Array([
            topLeft.x, 0, topLeft.y,
            topRight.x, 0, topRight.y,
            bottomRight.x, 0, bottomRight.y,
            bottomLeft.x, 0, bottomLeft.y,
            topLeft.x, 0, topLeft.y,
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        this.disposables.add(geometry, material);
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 1000000;
        return line;
    }
    public get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    public create3DObject(): void {
        if (!this.target) {
            const container = new THREE.Object3D();
            container.matrixAutoUpdate = false;
            container.name = "map_bounds";
            container.visible = this.withVisibility.isVisible();
            this.target = container;
            if (!this.wrapperObj && container.visible) {
                this.wrapperObj = this.build();
                this.target.add(this.wrapperObj);
            }
        }
    }
    public update(): void { }
    public setVisible(visible: boolean): void {
        if (visible !== this.withVisibility.isVisible()) {
            this.withVisibility.setVisible(visible);
            if (this.target) {
                this.target.visible = visible;
                if (visible) {
                    if (!this.wrapperObj) {
                        this.wrapperObj = this.build();
                    }
                    this.target.add(this.wrapperObj);
                }
                else if (this.wrapperObj) {
                    this.target.remove(this.wrapperObj);
                }
            }
        }
    }
    public dispose(): void {
        this.disposables.dispose();
    }
}
