import { DataStream } from '../../../data/DataStream';
import * as THREE from 'three';
export class BufferGeometrySerializer {
    serialize(geometry: THREE.BufferGeometry): ArrayBuffer {
        if (Object.keys(geometry.morphAttributes).length) {
            throw new Error('Morph attributes are not supported');
        }
        if (geometry.groups.length > 1) {
            throw new Error('Groups are not supported');
        }
        const attributeNames = Object.keys(geometry.attributes);
        const index = geometry.index;
        const bufferSize = 1 +
            22 * attributeNames.length +
            Object.values(geometry.attributes)
                .map(attr => this.getTypedArrayByteSize(attr.array))
                .reduce((sum, size) => sum + size, 0) +
            1 +
            (index ? this.getTypedArrayByteSize(index.array) : 0);
        const stream = new DataStream(new ArrayBuffer(bufferSize));
        stream.writeUint8(attributeNames.length);
        for (const name of attributeNames) {
            const attribute = geometry.getAttribute(name);
            stream.writeString(name, 'ASCII', 20);
            stream.writeUint8(attribute.itemSize);
            stream.writeUint8(Number(attribute.normalized));
            this.writeTypedArray(stream, attribute.array);
        }
        stream.writeUint8(Number(Boolean(index)));
        if (index) {
            this.writeTypedArray(stream, index.array);
        }
        stream.seek(0);
        stream.dynamicSize = false;
        return stream.buffer;
    }
    unserialize(stream: DataStream): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const attributeCount = stream.readUint8();
        for (let i = 0; i < attributeCount; i++) {
            const name = stream.readCString(20);
            const itemSize = stream.readUint8();
            const normalized = Boolean(stream.readUint8());
            const array = this.readTypedArray(stream);
            const attribute = new THREE.BufferAttribute(array, itemSize, normalized);
            geometry.setAttribute(name, attribute);
        }
        if (Boolean(stream.readUint8())) {
            const indexArray = this.readTypedArray(stream);
            geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
        }
        return geometry;
    }
    writeTypedArray(stream: DataStream, array: ArrayLike<number> & {
        length: number;
    }): void {
        stream.writeUint32(array.length);
        if (array instanceof Float32Array) {
            stream.writeUint8(0);
            for (let i = 0; i < array.length; i++) {
                stream.writeFloat32(array[i]);
            }
        }
        else if (array instanceof Uint32Array) {
            stream.writeUint8(1);
            for (let i = 0; i < array.length; i++) {
                stream.writeUint32(array[i]);
            }
        }
        else if (array instanceof Uint16Array) {
            stream.writeUint8(2);
            for (let i = 0; i < array.length; i++) {
                stream.writeUint16(array[i]);
            }
        }
        else {
            throw new Error(`Unsupported array type "${(array as any).constructor.name}"`);
        }
    }
    readTypedArray(stream: DataStream): Float32Array | Uint32Array | Uint16Array {
        const length = stream.readUint32();
        const type = stream.readUint8();
        switch (type) {
            case 0:
                return stream.readFloat32Array(length);
            case 1:
                return stream.readUint32Array(length);
            case 2:
                return stream.readUint16Array(length);
            default:
                throw new Error(`Unsupported array type "${type}"`);
        }
    }
    getTypedArrayByteSize(array: ArrayLike<number> & {
        BYTES_PER_ELEMENT: number;
        length: number;
    }): number {
        return 5 + array.BYTES_PER_ELEMENT * array.length;
    }
}
