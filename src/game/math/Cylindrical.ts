import * as THREE from 'three';
import { GameMath } from './GameMath';
export class Cylindrical extends THREE.Cylindrical {
    setFromVector3(v: THREE.Vector3): this {
        this.radius = GameMath.sqrt(v.x * v.x + v.z * v.z);
        this.theta = GameMath.atan2(v.x, v.z);
        this.y = v.y;
        return this;
    }
}
