import * as THREE from 'three';
export class Box2 extends THREE.Box2 {
    constructor(min?: THREE.Vector2, max?: THREE.Vector2) {
        super(min, max);
    }
}
