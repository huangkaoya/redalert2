import * as THREE from 'three';
import { Octree } from '@brakebein/threeoctree';
export class FrustumCuller {
    cull<T extends THREE.Mesh = THREE.Mesh>(octree: Octree<T>, frustum: THREE.Frustum): any[] {
        const visibleNodes: any[] = [];
        const traverse = (node: any): void => {
            const BOX_KEY: unique symbol = Symbol.for('__ra2web_box');
            let box = (node as any)[BOX_KEY] as THREE.Box3 | undefined;
            if (!box) {
                const r = node.radius + (node.overlap ?? 0);
                const pos = node.position;
                box = new THREE.Box3(new THREE.Vector3(pos.x - r, pos.y - r, pos.z - r), new THREE.Vector3(pos.x + r, pos.y + r, pos.z + r));
                (node as any)[BOX_KEY] = box;
            }
            if (frustum.intersectsBox(box)) {
                (node as any).visible = true;
                if (Array.isArray(node.nodesIndices) && node.nodesIndices.length > 0) {
                    for (const index of node.nodesIndices) {
                        const child = node.nodesByIndex[index];
                        if (child) {
                            traverse(child);
                        }
                    }
                }
                visibleNodes.push(node);
            }
            else {
                (node as any).visible = false;
            }
        };
        traverse(octree.root);
        return visibleNodes;
    }
}
