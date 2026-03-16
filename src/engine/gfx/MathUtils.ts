import * as THREE from 'three';
export class MathUtils {
    static rotateObjectAboutPoint(object: THREE.Object3D, point: THREE.Vector3, axis: THREE.Vector3, angle: number, useWorldSpace: boolean = false): void {
        if (useWorldSpace && object.parent) {
            object.parent.localToWorld(object.position);
        }
        object.position.sub(point);
        object.position.applyAxisAngle(axis, angle);
        object.position.add(point);
        if (useWorldSpace && object.parent) {
            object.parent.worldToLocal(object.position);
        }
        object.rotateOnAxis(axis, angle);
    }
    static translateTowardsCamera(object: THREE.Object3D, camera: THREE.Camera, distance: number): void {
        const quaternion = new THREE.Quaternion().setFromEuler(camera.rotation);
        object.setRotationFromQuaternion(quaternion);
        object.translateZ(distance * Math.cos(camera.rotation.y));
        object.setRotationFromEuler(new THREE.Euler(0, 0, 0));
    }
}
