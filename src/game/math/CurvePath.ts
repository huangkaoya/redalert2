import * as THREE from 'three';
import { LineCurve } from './LineCurve';
export class CurvePath extends THREE.CurvePath<THREE.Vector3> {
    closePath(): this {
        const start = this.curves[0].getPoint(0);
        const end = this.curves[this.curves.length - 1].getPoint(1);
        if (!start.equals(end)) {
            this.curves.push(new LineCurve(end as any, start as any) as any);
        }
        return this;
    }
}
