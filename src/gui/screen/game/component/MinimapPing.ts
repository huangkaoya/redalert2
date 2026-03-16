import * as THREE from "three";
import { UiObject } from "@/gui/UiObject";
export interface RadarRules {
    eventMinRadius: number;
    eventSpeed: number;
    eventRotationSpeed: number;
    eventColorSpeed: number;
}
export class MinimapPing extends UiObject {
    radarRules: RadarRules;
    colorLerpFactor: number;
    hiColor: THREE.Color;
    lowColor: THREE.Color;
    matHiColor: THREE.Color;
    matLowColor: THREE.Color;
    lastUpdate?: number;
    constructor(radarRules: RadarRules, hiColor: number | string, lowColor: number | string) {
        super();
        this.radarRules = radarRules;
        this.colorLerpFactor = 0;
        this.hiColor = new THREE.Color(hiColor);
        this.lowColor = new THREE.Color(lowColor);
        this.matHiColor = this.hiColor.clone();
        this.matLowColor = this.lowColor.clone();
        const minRadius = radarRules.eventMinRadius;
        const ping = this.createPingRectLine(minRadius, minRadius, this.matHiColor, this.matLowColor);
        ping.name = "minimap_ping";
        ping.scale.x = 15;
        ping.scale.y = 15;
        this.set3DObject(ping);
        this.get3DObject().matrixAutoUpdate = true;
    }
    createPingRectLine(width: number, height: number, color1: THREE.Color, color2: THREE.Color): THREE.LineSegments {
        const verts = [
            -0.5 * width, -0.5 * height, 0,
            -0.5 * width, 0.5 * height, 0,
            -0.5 * width, 0.5 * height, 0,
            0.5 * width, 0.5 * height, 0,
            0.5 * width, 0.5 * height, 0,
            0.5 * width, -0.5 * height, 0,
            0.5 * width, -0.5 * height, 0,
            -0.5 * width, -0.5 * height, 0,
        ];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        const material = new THREE.LineBasicMaterial({
            color: color1.getHex(),
            side: THREE.DoubleSide,
        });
        return new THREE.LineSegments(geometry, material);
    }
    override get3DObject(): THREE.Object3D {
        return super.get3DObject();
    }
    override update(now: number): void {
        super.update(now);
        if (!this.lastUpdate)
            this.lastUpdate = now;
        let t = ((now - this.lastUpdate) / 1000) * 60;
        this.lastUpdate = now;
        const obj = this.get3DObject();
        const shrinkSpeed = this.radarRules.eventSpeed / this.radarRules.eventMinRadius;
        obj.scale.x = Math.max(1, obj.scale.x - shrinkSpeed * t);
        obj.scale.y = Math.max(1, obj.scale.y - shrinkSpeed * t);
        obj.rotation.z += this.radarRules.eventRotationSpeed * t;
        if (obj.scale.x === 1) {
            obj.rotation.z = Math.min(obj.rotation.z, (Math.floor(obj.rotation.z / (Math.PI / 2)) * Math.PI) / 2);
        }
        this.colorLerpFactor = (this.colorLerpFactor + this.radarRules.eventColorSpeed * t) % 2;
        let lerpT = Math.min(1, this.colorLerpFactor) - Math.max(0, this.colorLerpFactor - 1);
        this.matHiColor.copy(this.hiColor).lerp(this.lowColor, lerpT);
        this.matLowColor.copy(this.lowColor).lerp(this.hiColor, lerpT);
    }
    override destroy(): void {
        super.destroy();
        const obj = this.get3DObject() as any;
        if (obj.material)
            obj.material.dispose();
        if (obj.geometry)
            obj.geometry.dispose();
    }
}
