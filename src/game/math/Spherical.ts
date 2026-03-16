import { clamp } from '../../util/math';
import { GameMath } from './GameMath';
import * as THREE from 'three';
export class Spherical extends THREE.Spherical {
    setFromVector3(v: THREE.Vector3): this {
        this.radius = v.length();
        if (this.radius === 0) {
            this.theta = 0;
            this.phi = 0;
        }
        else {
            this.theta = GameMath.atan2(v.x, v.z);
            this.phi = GameMath.acos(clamp(v.y / this.radius, -1, 1));
        }
        return this;
    }
}
