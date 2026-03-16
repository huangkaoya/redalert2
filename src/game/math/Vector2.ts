import { GameMath } from './GameMath';
import * as THREE from 'three';
export class Vector2 extends THREE.Vector2 {
    length(): number {
        return GameMath.sqrt(this.x * this.x + this.y * this.y);
    }
    angle(): number {
        let angle = GameMath.atan2(this.y, this.x);
        return angle < 0 ? angle + 2 * Math.PI : angle;
    }
    distanceTo(v: THREE.Vector2): number {
        return GameMath.sqrt(this.distanceToSquared(v));
    }
    rotateAround(center: THREE.Vector2, angle: number): this {
        const cos = GameMath.cos(angle);
        const sin = GameMath.sin(angle);
        const x = this.x - center.x;
        const y = this.y - center.y;
        this.x = x * cos - y * sin + center.x;
        this.y = x * sin + y * cos + center.y;
        return this;
    }
}
