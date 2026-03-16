import * as THREE from 'three';
import { GameMath } from './GameMath';
export class Quaternion extends THREE.Quaternion {
    setFromEuler(euler: THREE.Euler, update: boolean = true): this {
        if (!euler || !euler.isEuler) {
            throw new Error('THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.');
        }
        const x = euler.x;
        const y = euler.y;
        const z = euler.z;
        const order = euler.order;
        const cx = GameMath.cos(x / 2);
        const cy = GameMath.cos(y / 2);
        const cz = GameMath.cos(z / 2);
        const sx = GameMath.sin(x / 2);
        const sy = GameMath.sin(y / 2);
        const sz = GameMath.sin(z / 2);
        if (order === 'XYZ') {
            this.x = sx * cy * cz + cx * sy * sz;
            this.y = cx * sy * cz - sx * cy * sz;
            this.z = cx * cy * sz + sx * sy * cz;
            this.w = cx * cy * cz - sx * sy * sz;
        }
        else if (order === 'YXZ') {
            this.x = sx * cy * cz + cx * sy * sz;
            this.y = cx * sy * cz - sx * cy * sz;
            this.z = cx * cy * sz - sx * sy * cz;
            this.w = cx * cy * cz + sx * sy * sz;
        }
        else if (order === 'ZXY') {
            this.x = sx * cy * cz - cx * sy * sz;
            this.y = cx * sy * cz + sx * cy * sz;
            this.z = cx * cy * sz + sx * sy * cz;
            this.w = cx * cy * cz - sx * sy * sz;
        }
        else if (order === 'ZYX') {
            this.x = sx * cy * cz - cx * sy * sz;
            this.y = cx * sy * cz + sx * cy * sz;
            this.z = cx * cy * sz - sx * sy * cz;
            this.w = cx * cy * cz + sx * sy * sz;
        }
        else if (order === 'YZX') {
            this.x = sx * cy * cz + cx * sy * sz;
            this.y = cx * sy * cz + sx * cy * sz;
            this.z = cx * cy * sz - sx * sy * cz;
            this.w = cx * cy * cz - sx * sy * sz;
        }
        else if (order === 'XZY') {
            this.x = sx * cy * cz - cx * sy * sz;
            this.y = cx * sy * cz - sx * cy * sz;
            this.z = cx * cy * sz + sx * sy * cz;
            this.w = cx * cy * cz + sx * sy * sz;
        }
        if (update !== false) {
            this._onChangeCallback();
        }
        return this;
    }
    setFromAxisAngle(axis: THREE.Vector3, angle: number): this {
        const halfAngle = angle / 2;
        const s = GameMath.sin(halfAngle);
        this.x = axis.x * s;
        this.y = axis.y * s;
        this.z = axis.z * s;
        this.w = GameMath.cos(halfAngle);
        this._onChangeCallback();
        return this;
    }
    setFromRotationMatrix(m: THREE.Matrix4): this {
        const te = m.elements;
        const m11 = te[0];
        const m12 = te[4];
        const m13 = te[8];
        const m21 = te[1];
        const m22 = te[5];
        const m23 = te[9];
        const m31 = te[2];
        const m32 = te[6];
        const m33 = te[10];
        const trace = m11 + m22 + m33;
        let s;
        if (trace > 0) {
            s = 0.5 / GameMath.sqrt(trace + 1.0);
            this.w = 0.25 / s;
            this.x = (m32 - m23) * s;
            this.y = (m13 - m31) * s;
            this.z = (m21 - m12) * s;
        }
        else if (m11 > m22 && m11 > m33) {
            s = 2.0 * GameMath.sqrt(1.0 + m11 - m22 - m33);
            this.w = (m32 - m23) / s;
            this.x = 0.25 * s;
            this.y = (m12 + m21) / s;
            this.z = (m13 + m31) / s;
        }
        else if (m22 > m33) {
            s = 2.0 * GameMath.sqrt(1.0 + m22 - m11 - m33);
            this.w = (m13 - m31) / s;
            this.x = (m12 + m21) / s;
            this.y = 0.25 * s;
            this.z = (m23 + m32) / s;
        }
        else {
            s = 2.0 * GameMath.sqrt(1.0 + m33 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = (m13 + m31) / s;
            this.y = (m23 + m32) / s;
            this.z = 0.25 * s;
        }
        this._onChangeCallback();
        return this;
    }
    length(): number {
        return GameMath.sqrt(this.x * this.x +
            this.y * this.y +
            this.z * this.z +
            this.w * this.w);
    }
    slerp(qb: THREE.Quaternion, t: number): this {
        if (t === 0)
            return this;
        if (t === 1)
            return this.copy(qb);
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        let cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
        if (cosHalfTheta < 0) {
            this.w = -qb.w;
            this.x = -qb.x;
            this.y = -qb.y;
            this.z = -qb.z;
            cosHalfTheta = -cosHalfTheta;
        }
        else {
            this.copy(qb);
        }
        if (cosHalfTheta >= 1.0) {
            this.w = w;
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
        const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;
        if (sqrSinHalfTheta <= Number.EPSILON) {
            const s = 1 - t;
            this.w = s * w + t * this.w;
            this.x = s * x + t * this.x;
            this.y = s * y + t * this.y;
            this.z = s * z + t * this.z;
            return this.normalize();
        }
        const sinHalfTheta = GameMath.sqrt(sqrSinHalfTheta);
        const halfTheta = GameMath.atan2(sinHalfTheta, cosHalfTheta);
        const ratioA = GameMath.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = GameMath.sin(t * halfTheta) / sinHalfTheta;
        this.w = w * ratioA + this.w * ratioB;
        this.x = x * ratioA + this.x * ratioB;
        this.y = y * ratioA + this.y * ratioB;
        this.z = z * ratioA + this.z * ratioB;
        this._onChangeCallback();
        return this;
    }
}
