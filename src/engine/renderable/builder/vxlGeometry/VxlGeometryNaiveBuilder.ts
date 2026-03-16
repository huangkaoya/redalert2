import * as THREE from 'three';
import { BufferGeometryUtils } from '@/engine/gfx/BufferGeometryUtils';
export class VxlGeometryNaiveBuilder {
    build(vxl: any): THREE.BufferGeometry {
        const { voxels, voxelField } = vxl.getAllVoxels();
        const boxGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
        const vertexCount = boxGeometry.getAttribute("position").array.length / 3;
        const normalArray = boxGeometry.getAttribute("normal").array;
        let geometry = new THREE.BufferGeometry();
        geometry.setIndex(this.createIndexAttr(voxels, boxGeometry, vertexCount));
        geometry.setAttribute("position", this.createPositionAttr(vxl, voxels, boxGeometry));
        geometry.setAttribute("normal", this.createNormalAttr(vxl, voxels, vertexCount));
        geometry.setAttribute("color", this.createColorAttr(voxels, vertexCount, normalArray, voxelField));
        geometry = BufferGeometryUtils.mergeVertices(geometry);
        geometry.computeBoundingBox();
        return geometry;
    }
    private createPositionAttr(vxl: any, voxels: any[], boxGeometry: THREE.BoxBufferGeometry): THREE.BufferAttribute {
        const positionArray = boxGeometry.getAttribute("position").array;
        const arrayLength = positionArray.length;
        const positions = new Float32Array(arrayLength * voxels.length);
        const minBounds = vxl.minBounds;
        const scale = vxl.scale;
        for (let i = 0; i < voxels.length; i++) {
            const offset = i * arrayLength;
            const voxel = voxels[i];
            for (let j = 0; j < positionArray.length; j += 3) {
                positions[offset + j] = minBounds.x + voxel.x * scale.x + positionArray[j];
                positions[offset + j + 1] = minBounds.y + voxel.y * scale.y + positionArray[j + 1];
                positions[offset + j + 2] = minBounds.z + voxel.z * scale.z + positionArray[j + 2];
            }
        }
        return new THREE.BufferAttribute(positions, 3);
    }
    private createNormalAttr(vxl: any, voxels: any[], vertexCount: number): THREE.BufferAttribute {
        const normals = new Float32Array(vertexCount * voxels.length * 3);
        const normalTable = vxl.getNormals();
        for (let i = 0; i < voxels.length; i++) {
            const offset = i * vertexCount * 3;
            const normal = normalTable[Math.min(voxels[i].normalIndex, normalTable.length - 1)];
            for (let j = 0; j < 3 * vertexCount; j += 3) {
                normals[offset + j] = normal.x;
                normals[offset + j + 1] = normal.y;
                normals[offset + j + 2] = normal.z;
            }
        }
        return new THREE.BufferAttribute(normals, 3);
    }
    private createColorAttr(voxels: any[], vertexCount: number, normalArray: Float32Array, voxelField: any): THREE.BufferAttribute {
        const colors = new Float32Array(vertexCount * voxels.length * 3);
        for (let i = 0; i < voxels.length; i++) {
            const offset = i * vertexCount * 3;
            const voxel = voxels[i];
            for (let j = 0; j < 3 * vertexCount; j += 3) {
                const hasVoxel = voxelField.get(voxel.x + normalArray[j], voxel.y + normalArray[j + 1], voxel.z + normalArray[j + 2]);
                colors[offset + j] = hasVoxel ? 0 : voxel.colorIndex / 255;
                colors[offset + j + 1] = 0;
                colors[offset + j + 2] = 0;
            }
        }
        return new THREE.BufferAttribute(colors, 3);
    }
    private createIndexAttr(voxels: any[], boxGeometry: THREE.BoxBufferGeometry, vertexCount: number): THREE.BufferAttribute {
        const indexArray = boxGeometry.getIndex().array;
        const indices = new Uint32Array(voxels.length * indexArray.length);
        for (let i = 0; i < voxels.length; i++) {
            for (let j = 0; j < indexArray.length; j++) {
                indices[i * indexArray.length + j] = i * vertexCount + indexArray[j];
            }
        }
        return new THREE.BufferAttribute(indices, 1);
    }
}
