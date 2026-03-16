import { BufferGeometryUtils } from "@/engine/gfx/BufferGeometryUtils";
import * as THREE from 'three';
class VxlGeometryMonotoneBuilder {
    build(e, t = false) {
        let s = e.getAllVoxels()["voxelField"];
        var { vertices: i, faces: r } = (function (e, t) {
            for (var i = [], r = [], s = 0; s < 3; ++s) {
                var a = (s + 1) % 3, n = (s + 2) % 3, o = new Int32Array(3), l = new Int32Array(3), c = new Int32Array(2 * (t[a] + 1)), h = new Int32Array(t[a]), u = new Int32Array(t[a]), d = new Int32Array(2 * t[n]), g = new Int32Array(2 * t[n]), p = new Int32Array(24 * t[n]), m = [
                    [0, 0],
                    [0, 0],
                ];
                for (l[s] = 1, o[s] = -1; o[s] < t[s];) {
                    var f = [], y = 0;
                    for (o[n] = 0; o[n] < t[n]; ++o[n]) {
                        var T = 0, v = 0, b = 0;
                        for (o[a] = 0; o[a] < t[a]; ++o[a], v = b) {
                            var S = 0 <= o[s] ? e(o[0], o[1], o[2]) : 0, w = o[s] < t[s] - 1
                                ? e(o[0] + l[0], o[1] + l[1], o[2] + l[2])
                                : 0;
                            !(b = S) == !w ? (b = 0) : S || (b = -w),
                                v !== b && ((c[T++] = o[a]), (c[T++] = b));
                        }
                        c[T++] = t[a];
                        for (var C = (c[T++] = 0), E = 0, x = 0; E < y && x < T - 2;) {
                            let e = f[h[E]];
                            var O = e.left[e.left.length - 1][0], M = e.right[e.right.length - 1][0], A = e.color, R = c[x], P = c[x + 2], I = c[x + 1];
                            O < P && R < M && I === A
                                ? (e.merge_run(o[n], R, P),
                                    (u[C++] = h[E]),
                                    ++E,
                                    (x += 2))
                                : (P <= M &&
                                    (I &&
                                        ((k = new VxlRun(I, o[n], R, P)),
                                            (u[C++] = f.length),
                                            f.push(k)),
                                        (x += 2)),
                                    M <= P && (e.close_off(o[n]), ++E));
                        }
                        for (; E < y; ++E)
                            f[h[E]].close_off(o[n]);
                        for (; x < T - 2; x += 2) {
                            var k, R = c[x], P = c[x + 2];
                            (I = c[x + 1]) &&
                                ((k = new VxlRun(I, o[n], R, P)),
                                    (u[C++] = f.length),
                                    f.push(k));
                        }
                        var B = u, u = h, h = B, y = C;
                    }
                    for (E = 0; E < y; ++E) {
                        let e = f[h[E]];
                        e.close_off(t[n]);
                    }
                    o[s]++;
                    for (E = 0; E < f.length; ++E) {
                        var N = f[E], j = !1;
                        (b = N.color) < 0 && ((j = !0), (b = -b));
                        for (x = 0; x < N.left.length; ++x) {
                            d[x] = i.length;
                            var L = [0, 0, 0], D = N.left[x];
                            (L[s] = o[s]),
                                (L[a] = D[0]),
                                (L[n] = D[1]),
                                i.push({ position: L, value: b });
                        }
                        for (x = 0; x < N.right.length; ++x) {
                            g[x] = i.length;
                            (L = [0, 0, 0]), (D = N.right[x]);
                            (L[s] = o[s]),
                                (L[a] = D[0]),
                                (L[n] = D[1]),
                                i.push({ position: L, value: b });
                        }
                        var F = 0, _ = 0, U = 1, H = 1, G = !0;
                        for (p[_++] = d[0],
                            p[_++] = N.left[0][0],
                            p[_++] = N.left[0][1],
                            p[_++] = g[0],
                            p[_++] = N.right[0][0],
                            p[_++] = N.right[0][1]; U < N.left.length || H < N.right.length;) {
                            var V, W, z = !1;
                            U === N.left.length
                                ? (z = !0)
                                : H !== N.right.length &&
                                    ((V = N.left[U]),
                                        (W = N.right[H]),
                                        (z = V[1] > W[1]));
                            var K = z ? g[H] : d[U], q = z ? N.right[H] : N.left[U];
                            if (z !== G)
                                for (; F + 3 < _;)
                                    j === z
                                        ? r.push([p[F], p[F + 3], K])
                                        : r.push([p[F + 3], p[F], K]),
                                        (F += 3);
                            else
                                for (; F + 3 < _;) {
                                    for (x = 0; x < 2; ++x)
                                        for (var $ = 0; $ < 2; ++$)
                                            m[x][$] = p[_ - 3 * (x + 1) + $ + 1] - q[$];
                                    var Q = m[0][0] * m[1][1] - m[1][0] * m[0][1];
                                    if (z === 0 < Q)
                                        break;
                                    0 != Q &&
                                        (j === z
                                            ? r.push([p[_ - 3], p[_ - 6], K])
                                            : r.push([p[_ - 6], p[_ - 3], K])),
                                        (_ -= 3);
                                }
                            (p[_++] = K),
                                (p[_++] = q[0]),
                                (p[_++] = q[1]),
                                z ? ++H : ++U,
                                (G = z);
                        }
                    }
                }
            }
            return { vertices: i, faces: r };
        })(t
            ? (e, t, i) => {
                var r = s.get(e, t, i);
                return r ? r.colorIndex : 0;
            }
            : (e, t, i) => {
                var r = s.get(e, t, i);
                return r ? r.normalIndex + 256 * r.colorIndex : 0;
            }, [e.sizeX, e.sizeY, e.sizeZ]), a = e.minBounds, n = e.scale, o = e.getNormals();
        let l = new Float32Array(3 * i.length), c = new Float32Array(3 * i.length), h = new Float32Array(3 * i.length), u = 0, d = 0, g = 0;
        for (let b = 0, S = i.length; b < S; b++) {
            var p = i[b], m = t ? p.value : (p.value / 256) | 0;
            (l[u++] = a.x + p.position[0] * n.x),
                (l[u++] = a.y + p.position[1] * n.y),
                (l[u++] = a.z + p.position[2] * n.z),
                (h[g++] = m / 255),
                (h[g++] = 0),
                (h[g++] = 0),
                t ||
                    ((p = p.value % 256),
                        (p = o[Math.min(p, o.length - 1)]),
                        (c[d++] = p.x),
                        (c[d++] = p.y),
                        (c[d++] = p.z));
        }
        let f = new Uint32Array(3 * r.length), y = 0;
        for (let w = 0, C = r.length; w < C; w++) {
            var T = r[w];
            (f[y++] = T[0]), (f[y++] = T[1]), (f[y++] = T[2]);
        }
        let v = new THREE.BufferGeometry();
        return (v.setAttribute("position", new THREE.BufferAttribute(l, 3)),
            t ||
                v.setAttribute("normal", new THREE.BufferAttribute(c, 3)),
            v.setAttribute("color", new THREE.BufferAttribute(h, 3)),
            v.setIndex(new THREE.BufferAttribute(f, 1)),
            (v = BufferGeometryUtils.mergeVertices(v)),
            v.computeBoundingBox(),
            t && v.computeVertexNormals(),
            v);
    }
}
class VxlRun {
    color: any;
    left: any[][];
    right: any[][];
    constructor(e, t, i, r) {
        this.color = e;
        this.left = [[i, t]];
        this.right = [[r, t]];
    }
    close_off(e) {
        this.left.push([this.left[this.left.length - 1][0], e]);
        this.right.push([this.right[this.right.length - 1][0], e]);
    }
    merge_run(e, t, i) {
        var r = this.left[this.left.length - 1][0], s = this.right[this.right.length - 1][0];
        r !== t && (this.left.push([r, e]), this.left.push([t, e]));
        s !== i && (this.right.push([s, e]), this.right.push([i, e]));
    }
}
export { VxlGeometryMonotoneBuilder };
