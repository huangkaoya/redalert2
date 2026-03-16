import * as THREE from 'three';
export class BoxIntersectObject3D extends THREE.Object3D {
    private static ray: THREE.Ray = new THREE.Ray();
    private static matrix: THREE.Matrix4 = new THREE.Matrix4();
    private static box: THREE.Box3 = new THREE.Box3();
    private static center: THREE.Vector3 = new THREE.Vector3();
    private boxSize: THREE.Vector3;
    constructor(boxSize: THREE.Vector3) {
        super();
        this.boxSize = boxSize;
    }
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
        if (this.parent) {
            BoxIntersectObject3D.matrix.copy(this.parent.matrixWorld).invert();
            BoxIntersectObject3D.ray.copy(raycaster.ray).applyMatrix4(BoxIntersectObject3D.matrix);
            BoxIntersectObject3D.center.copy(this.position);
            const box = BoxIntersectObject3D.box.setFromCenterAndSize(BoxIntersectObject3D.center, this.boxSize);
            if (BoxIntersectObject3D.ray.intersectsBox(box)) {
                const point = new THREE.Vector3();
                box.getCenter(point);
                point.applyMatrix4(this.parent.matrixWorld);
                intersects.push({
                    distance: raycaster.ray.origin.distanceTo(point),
                    point: point,
                    object: this
                });
            }
        }
    }
}
