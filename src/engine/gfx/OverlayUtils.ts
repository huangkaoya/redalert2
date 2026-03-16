import * as THREE from 'three';
import { CanvasUtils } from './CanvasUtils';
export class OverlayUtils {
    static createGroundCircle(radius: number, color: THREE.ColorRepresentation): THREE.Line {
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const segments = 64;
        const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
        const points2D = curve.getPoints(segments);
        const points3D = points2D.map((p) => new THREE.Vector3(p.x, p.y, 0));
        points3D.push(points3D[0].clone());
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(points3D);
        const line = new THREE.Line(geometry, material);
        line.rotation.x = Math.PI / 2;
        line.renderOrder = 1000000;
        return line;
    }
    static createTextBox(text: string, options: any): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 0;
        const context = canvas.getContext('2d', {
            alpha: !options.backgroundColor || !!options.backgroundColor.match(/^rgba/),
        });
        CanvasUtils.drawText(context, text, 0, 0, {
            ...options,
            autoEnlargeCanvas: true,
        });
        return canvas;
    }
}
