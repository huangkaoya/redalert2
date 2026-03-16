import * as THREE from 'three';
import { GameMath } from './GameMath';
import { Quaternion } from './Quaternion';
import { Vector3 } from './Vector3';
import { clamp } from '../../util/math';
export class Euler extends THREE.Euler {
    constructor(...args: any[]) {
        super(...args);
    }
    setFromRotationMatrix(matrix: THREE.Matrix4, order?: string, update?: boolean): this {
        const elements = matrix.elements;
        const m11 = elements[0];
        const m12 = elements[4];
        const m13 = elements[8];
        const m21 = elements[1];
        const m22 = elements[5];
        const m23 = elements[9];
        const m31 = elements[2];
        const m32 = elements[6];
        const m33 = elements[10];
        order = order || this.order;
        if (order === 'XYZ') {
            this.y = GameMath.asin(clamp(m13, -1, 1));
            if (Math.abs(m13) < 0.99999) {
                this.x = GameMath.atan2(-m23, m33);
                this.z = GameMath.atan2(-m12, m11);
            }
            else {
                this.x = GameMath.atan2(m32, m22);
                this.z = 0;
            }
        }
        else if (order === 'YXZ') {
            this.x = GameMath.asin(-clamp(m23, -1, 1));
            if (Math.abs(m23) < 0.99999) {
                this.y = GameMath.atan2(m13, m33);
                this.z = GameMath.atan2(m21, m22);
            }
            else {
                this.y = GameMath.atan2(-m31, m11);
                this.z = 0;
            }
        }
        else if (order === 'ZXY') {
            this.x = GameMath.asin(clamp(m32, -1, 1));
            if (Math.abs(m32) < 0.99999) {
                this.y = GameMath.atan2(-m31, m33);
                this.z = GameMath.atan2(-m12, m22);
            }
            else {
                this.y = 0;
                this.z = GameMath.atan2(m21, m11);
            }
        }
        else if (order === 'ZYX') {
            this.y = GameMath.asin(-clamp(m31, -1, 1));
            if (Math.abs(m31) < 0.99999) {
                this.x = GameMath.atan2(m32, m33);
                this.z = GameMath.atan2(m21, m11);
            }
            else {
                this.x = 0;
                this.z = GameMath.atan2(-m12, m22);
            }
        }
        else if (order === 'YZX') {
            this.z = GameMath.asin(clamp(m21, -1, 1));
            if (Math.abs(m21) < 0.99999) {
                this.x = GameMath.atan2(-m23, m22);
                this.y = GameMath.atan2(-m31, m11);
            }
            else {
                this.x = 0;
                this.y = GameMath.atan2(m13, m33);
            }
        }
        else if (order === 'XZY') {
            this.z = GameMath.asin(-clamp(m12, -1, 1));
            if (Math.abs(m12) < 0.99999) {
                this.x = GameMath.atan2(m32, m22);
                this.y = GameMath.atan2(m13, m11);
            }
            else {
                this.x = GameMath.atan2(-m23, m33);
                this.y = 0;
            }
        }
        else {
            console.warn('THREE.Euler: .setFromRotationMatrix() given unsupported order: ' + order);
        }
        this.order = order as THREE.EulerOrder;
        if (update !== false) {
            this._onChangeCallback();
        }
        return this;
    }
    reorder(newOrder: THREE.EulerOrder): this {
        const quaternion = new Quaternion();
        quaternion.setFromEuler(this);
        return this.setFromQuaternion(quaternion, newOrder) as this;
    }
    toVector3(optionalTarget?: THREE.Vector3): THREE.Vector3 {
        if (optionalTarget) {
            return optionalTarget.set(this.x, this.y, this.z);
        }
        return new Vector3(this.x, this.y, this.z);
    }
}
