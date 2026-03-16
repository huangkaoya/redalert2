import { Vector2 } from './Vector2';
import * as THREE from 'three';
export class QuadraticBezierCurve extends THREE.QuadraticBezierCurve {
    constructor(v0?: THREE.Vector2, v1?: THREE.Vector2, v2?: THREE.Vector2) {
        super(v0 || new Vector2(), v1 || new Vector2(), v2 || new Vector2());
    }
    getPoint(t: number, optionalTarget?: THREE.Vector2): THREE.Vector2 {
        return super.getPoint(t, optionalTarget || new Vector2());
    }
}
