import * as THREE from "three";
export class ExtraLightHelper {
    static multiplyShp(target: THREE.Color, source: THREE.Color, intensity: number): void {
        target.copy(source).add(source.clone().addScalar(1).multiplyScalar(intensity));
    }
    static multiplyVxl(target: THREE.Color, source: THREE.Color, intensity: number, radius: number): void {
        target.copy(source).multiplyScalar(Math.max(0, 1 + radius));
    }
}
