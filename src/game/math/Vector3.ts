import { clamp } from '../../util/math';
import { GameMath } from './GameMath';
import { Quaternion } from './Quaternion';
import * as THREE from 'three';
export class Vector3 extends THREE.Vector3 {
    private static _quaternion = new Quaternion();
    private static _vector = new Vector3();
    applyEuler(euler: THREE.Euler): this {
        if (!euler || !euler.isEuler) {
            console.error('THREE.Vector3: .applyEuler() now expects an Euler rotation rather than a Vector3 and order.');
        }
        return this.applyQuaternion(Vector3._quaternion.setFromEuler(euler));
    }
    applyAxisAngle(axis: THREE.Vector3, angle: number): this {
        return this.applyQuaternion(Vector3._quaternion.setFromAxisAngle(axis, angle));
    }
    length(): number {
        return GameMath.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    projectOnPlane(planeNormal: THREE.Vector3): this {
        Vector3._vector.copy(this).projectOnVector(planeNormal);
        return this.sub(Vector3._vector);
    }
    reflect(normal: THREE.Vector3): this {
        return this.sub(Vector3._vector.copy(normal).multiplyScalar(2 * this.dot(normal)));
    }
    angleTo(v: THREE.Vector3): number {
        const theta = this.dot(v) / GameMath.sqrt(this.lengthSq() * v.lengthSq());
        return GameMath.acos(clamp(theta, -1, 1));
    }
    distanceTo(v: THREE.Vector3): number {
        return GameMath.sqrt(this.distanceToSquared(v));
    }
    setFromSpherical(spherical: THREE.Spherical): this {
        const sinPhiRadius = GameMath.sin(spherical.phi) * spherical.radius;
        this.x = sinPhiRadius * GameMath.sin(spherical.theta);
        this.y = GameMath.cos(spherical.phi) * spherical.radius;
        this.z = sinPhiRadius * GameMath.cos(spherical.theta);
        return this;
    }
    setFromCylindrical(cylindrical: THREE.Cylindrical): this {
        this.x = cylindrical.radius * GameMath.sin(cylindrical.theta);
        this.y = cylindrical.y;
        this.z = cylindrical.radius * GameMath.cos(cylindrical.theta);
        return this;
    }
}
