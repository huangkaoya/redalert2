import { BufferGeometryUtils } from "@/engine/gfx/BufferGeometryUtils";
import * as THREE from 'three';
export class VxlGeometryCulledBuilder {
    build(e: any) {
        let { voxels: a, voxelField: n } = e.getAllVoxels();
        const t = new THREE.BoxBufferGeometry(1, 1, 1);
        const o = t.getAttribute("position").array;
        const l = o.length / 3;
        const c = t.getAttribute("normal").array;
        const h = t.getIndex().array;
        const u: number[] = [];
        const d: number[] = [];
        const g: number[] = [];
        const p: number[] = [];
        const m = e.minBounds;
        const f = e.scale;
        const y = e.getNormals();
        let T = 0;
        for (let E = 0, r = a.length; E < r; E++) {
            const v = a[E];
            const b = y[Math.min(a[E].normalIndex, y.length - 1)];
            const e = new Array(l);
            for (let t = 0, i = 3 * l; t < i; t += 3) {
                if (!n.get(v.x + c[t], v.y + c[t + 1], v.z + c[t + 2])) {
                    e[t / 3] = T;
                    u.push(m.x + v.x * f.x + o[t], m.y + v.y * f.y + o[t + 1], m.z + v.z * f.z + o[t + 2]);
                    d.push(b.x, b.y, b.z);
                    g.push(v.colorIndex / 255, 0, 0);
                    T++;
                }
            }
            for (let r = 0, s = h.length; r < s; r += 3) {
                const S = e[h[r]];
                const w = e[h[r + 1]];
                const C = e[h[r + 2]];
                if (S !== undefined && w !== undefined && C !== undefined) {
                    p.push(S, w, C);
                }
            }
        }
        let i = new THREE.BufferGeometry();
        i.setIndex(new THREE.BufferAttribute(new Uint32Array(p), 1));
        i.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * t), 3));
        i.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(3 * t), 3));
        i.setAttribute("color", new THREE.BufferAttribute(new Float32Array(4 * t), 4));
        i = BufferGeometryUtils.mergeVertices(i);
        i.computeBoundingBox();
        return i;
    }
}
