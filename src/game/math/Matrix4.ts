import { GameMath } from './GameMath';
import { Vector3 } from './Vector3';
import * as THREE from 'three';
export class Matrix4 extends THREE.Matrix4 {
    private static _v1 = new Vector3();
    private static _v2 = new Vector3();
    private static _v3 = new Vector3();
    private static _v4 = new Vector3();
    private static _matrix = new Matrix4();
    extractRotation(matrix: THREE.Matrix4): this {
        const elements = this.elements;
        const matrixElements = matrix.elements;
        const scaleX = 1 / Matrix4._v1.setFromMatrixColumn(matrix, 0).length();
        const scaleY = 1 / Matrix4._v1.setFromMatrixColumn(matrix, 1).length();
        const scaleZ = 1 / Matrix4._v1.setFromMatrixColumn(matrix, 2).length();
        elements[0] = matrixElements[0] * scaleX;
        elements[1] = matrixElements[1] * scaleX;
        elements[2] = matrixElements[2] * scaleX;
        elements[3] = 0;
        elements[4] = matrixElements[4] * scaleY;
        elements[5] = matrixElements[5] * scaleY;
        elements[6] = matrixElements[6] * scaleY;
        elements[7] = 0;
        elements[8] = matrixElements[8] * scaleZ;
        elements[9] = matrixElements[9] * scaleZ;
        elements[10] = matrixElements[10] * scaleZ;
        elements[11] = 0;
        elements[12] = 0;
        elements[13] = 0;
        elements[14] = 0;
        elements[15] = 1;
        return this;
    }
    makeRotationFromEuler(euler: THREE.Euler): this {
        if (!euler || !euler.isEuler) {
            console.error('THREE.Matrix4: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.');
        }
        const elements = this.elements;
        const x = euler.x;
        const y = euler.y;
        const z = euler.z;
        const a = GameMath.cos(x);
        const b = GameMath.sin(x);
        const c = GameMath.cos(y);
        const d = GameMath.sin(y);
        const e = GameMath.cos(z);
        const f = GameMath.sin(z);
        if (euler.order === 'XYZ') {
            const ae = a * e;
            const af = a * f;
            const be = b * e;
            const bf = b * f;
            elements[0] = c * e;
            elements[4] = -c * f;
            elements[8] = d;
            elements[1] = af + be * d;
            elements[5] = ae - bf * d;
            elements[9] = -b * c;
            elements[2] = bf - ae * d;
            elements[6] = be + af * d;
            elements[10] = a * c;
        }
        else if (euler.order === 'YXZ') {
            const ce = c * e;
            const cf = c * f;
            const de = d * e;
            const df = d * f;
            elements[0] = ce + df * b;
            elements[4] = de * b - cf;
            elements[8] = a * d;
            elements[1] = a * f;
            elements[5] = a * e;
            elements[9] = -b;
            elements[2] = cf * b - de;
            elements[6] = df + ce * b;
            elements[10] = a * c;
        }
        else if (euler.order === 'ZXY') {
            const ce = c * e;
            const cf = c * f;
            const de = d * e;
            const df = d * f;
            elements[0] = ce - df * b;
            elements[4] = -a * f;
            elements[8] = de + cf * b;
            elements[1] = cf + de * b;
            elements[5] = a * e;
            elements[9] = df - ce * b;
            elements[2] = -a * d;
            elements[6] = b;
            elements[10] = a * c;
        }
        else if (euler.order === 'ZYX') {
            const ae = a * e;
            const af = a * f;
            const be = b * e;
            const bf = b * f;
            elements[0] = c * e;
            elements[4] = be * d - af;
            elements[8] = ae * d + bf;
            elements[1] = c * f;
            elements[5] = bf * d + ae;
            elements[9] = af * d - be;
            elements[2] = -d;
            elements[6] = b * c;
            elements[10] = a * c;
        }
        else if (euler.order === 'YZX') {
            const ac = a * c;
            const ad = a * d;
            const bc = b * c;
            const bd = b * d;
            elements[0] = c * e;
            elements[4] = bd - ac * f;
            elements[8] = bc * f + ad;
            elements[1] = f;
            elements[5] = a * e;
            elements[9] = -b * e;
            elements[2] = -d * e;
            elements[6] = ad * f + bc;
            elements[10] = ac - bd * f;
        }
        else if (euler.order === 'XZY') {
            const ac = a * c;
            const ad = a * d;
            const bc = b * c;
            const bd = b * d;
            elements[0] = c * e;
            elements[4] = -f;
            elements[8] = d * e;
            elements[1] = ac * f + bd;
            elements[5] = a * e;
            elements[9] = ad * f - bc;
            elements[2] = bc * f - ad;
            elements[6] = b * e;
            elements[10] = bd * f + ac;
        }
        elements[3] = 0;
        elements[7] = 0;
        elements[11] = 0;
        elements[12] = 0;
        elements[13] = 0;
        elements[14] = 0;
        elements[15] = 1;
        return this;
    }
    lookAt(eye: THREE.Vector3, target: THREE.Vector3, up: THREE.Vector3): this {
        const x = Matrix4._v1;
        const y = Matrix4._v2;
        const z = Matrix4._v3;
        const elements = this.elements;
        z.subVectors(eye, target);
        if (z.lengthSq() === 0) {
            z.z = 1;
        }
        z.normalize();
        x.crossVectors(up, z);
        if (x.lengthSq() === 0) {
            if (Math.abs(up.z) === 1) {
                z.x += 0.0001;
            }
            else {
                z.z += 0.0001;
            }
            z.normalize();
            x.crossVectors(up, z);
        }
        x.normalize();
        y.crossVectors(z, x);
        elements[0] = x.x;
        elements[4] = y.x;
        elements[8] = z.x;
        elements[1] = x.y;
        elements[5] = y.y;
        elements[9] = z.y;
        elements[2] = x.z;
        elements[6] = y.z;
        elements[10] = z.z;
        return this;
    }
    getMaxScaleOnAxis(): number {
        const elements = this.elements;
        const scaleXSq = elements[0] * elements[0] + elements[1] * elements[1] + elements[2] * elements[2];
        const scaleYSq = elements[4] * elements[4] + elements[5] * elements[5] + elements[6] * elements[6];
        const scaleZSq = elements[8] * elements[8] + elements[9] * elements[9] + elements[10] * elements[10];
        return GameMath.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
    }
    makeRotationX(theta: number): this {
        const c = GameMath.cos(theta);
        const s = GameMath.sin(theta);
        this.set(1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1);
        return this;
    }
    makeRotationY(theta: number): this {
        const c = GameMath.cos(theta);
        const s = GameMath.sin(theta);
        this.set(c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1);
        return this;
    }
    makeRotationZ(theta: number): this {
        const c = GameMath.cos(theta);
        const s = GameMath.sin(theta);
        this.set(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
        return this;
    }
    makeRotationAxis(axis: THREE.Vector3, angle: number): this {
        const c = GameMath.cos(angle);
        const s = GameMath.sin(angle);
        const t = 1 - c;
        const x = axis.x;
        const y = axis.y;
        const z = axis.z;
        const tx = t * x;
        const ty = t * y;
        this.set(tx * x + c, tx * y - s * z, tx * z + s * y, 0, tx * y + s * z, ty * y + c, ty * z - s * x, 0, tx * z - s * y, ty * z + s * x, t * z * z + c, 0, 0, 0, 0, 1);
        return this;
    }
    decompose(position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3): this {
        const elements = this.elements;
        let sx = Matrix4._v1.set(elements[0], elements[1], elements[2]).length();
        const sy = Matrix4._v1.set(elements[4], elements[5], elements[6]).length();
        const sz = Matrix4._v1.set(elements[8], elements[9], elements[10]).length();
        if (this.determinant() < 0) {
            sx = -sx;
        }
        position.x = elements[12];
        position.y = elements[13];
        position.z = elements[14];
        Matrix4._matrix.copy(this);
        const invSX = 1 / sx;
        const invSY = 1 / sy;
        const invSZ = 1 / sz;
        Matrix4._matrix.elements[0] *= invSX;
        Matrix4._matrix.elements[1] *= invSX;
        Matrix4._matrix.elements[2] *= invSX;
        Matrix4._matrix.elements[4] *= invSY;
        Matrix4._matrix.elements[5] *= invSY;
        Matrix4._matrix.elements[6] *= invSY;
        Matrix4._matrix.elements[8] *= invSZ;
        Matrix4._matrix.elements[9] *= invSZ;
        Matrix4._matrix.elements[10] *= invSZ;
        quaternion.setFromRotationMatrix(Matrix4._matrix);
        scale.x = sx;
        scale.y = sy;
        scale.z = sz;
        return this;
    }
}
