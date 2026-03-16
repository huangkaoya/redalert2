import * as THREE from 'three';
import { Vector3 } from './Vector3';
export class CubicBezierCurve3 extends THREE.CubicBezierCurve3 {
    constructor(v0?: THREE.Vector3, v1?: THREE.Vector3, v2?: THREE.Vector3, v3?: THREE.Vector3) {
        super(v0 || new Vector3(), v1 || new Vector3(), v2 || new Vector3(), v3 || new Vector3());
    }
    getPoint(t: number, optionalTarget?: THREE.Vector3): THREE.Vector3 {
        return super.getPoint(t, optionalTarget || new Vector3());
    }
}
