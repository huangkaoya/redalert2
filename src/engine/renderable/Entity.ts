import { WithPosition } from "./WithPosition";
import { WithVisibility } from "./WithVisibility";
import * as THREE from "three";
export class Entity {
    private position: WithPosition;
    private visibility: WithVisibility;
    private target?: THREE.Object3D;
    constructor() {
        this.position = new WithPosition();
        this.visibility = new WithVisibility();
        this.position.applyTo(this);
        this.visibility.applyTo(this);
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    set3DObject(object: THREE.Object3D): void {
        this.target = object;
        this.position.updatePosition();
        this.visibility.updateVisibility();
    }
    setPosition(x: number, y: number, z: number): void {
        this.position.setPosition(x, y, z);
    }
    getPosition(): THREE.Vector3 {
        return this.position.getPosition();
    }
    setVisible(visible: boolean): void {
        this.visibility.setVisible(visible);
    }
    isVisible(): boolean {
        return this.visibility.isVisible();
    }
}
