import * as THREE from "three";

export class WithPosition {
  public matrixUpdate: boolean = false;
  private position: THREE.Vector3;
  private target?: any;

  constructor() {
    this.position = new THREE.Vector3();
  }

  setPosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.updatePosition();
  }

  getPosition(): THREE.Vector3 {
    return this.position;
  }

  updatePosition(): void {
    if (this.target) {
      const object = this.target.get3DObject();
      if (object) {
        object.position.set(
          this.position.x,
          this.position.y,
          this.position.z
        );
        if (this.matrixUpdate) {
          object.matrix.setPosition(object.position);
          object.matrixWorldNeedsUpdate = true;
        }
      }
    }
  }

  applyTo(target: any): void {
    this.target = target;
    this.updatePosition();
  }
}
