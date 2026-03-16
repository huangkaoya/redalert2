import * as THREE from 'three';
export class BufferGeometryUtils {
    static mergeVertices(geometry: THREE.BufferGeometry, tolerance: number = 1e-4): THREE.BufferGeometry {
        tolerance = Math.max(tolerance, Number.EPSILON);
        const hashToIndex: {
            [key: string]: number;
        } = {};
        const indices = geometry.getIndex();
        const positionAttribute = geometry.getAttribute("position");
        const vertexCount = (indices || positionAttribute).count;
        let nextIndex = 0;
        const attributeNames = Object.keys(geometry.attributes);
        const newAttributes: {
            [key: string]: number[];
        } = {};
        const morphAttributes: {
            [key: string]: number[][];
        } = {};
        const newIndices: number[] = [];
        const getters = [
            (attr: THREE.BufferAttribute, index: number) => attr.getX(index),
            (attr: THREE.BufferAttribute, index: number) => attr.getY(index),
            (attr: THREE.BufferAttribute, index: number) => attr.getZ(index),
            (attr: THREE.BufferAttribute, index: number) => attr.getW(index),
        ];
        for (let i = 0, l = attributeNames.length; i < l; i++) {
            const name = attributeNames[i];
            newAttributes[name] = [];
            const morphAttribute = geometry.morphAttributes[name];
            if (morphAttribute) {
                morphAttributes[name] = new Array(morphAttribute.length).fill(undefined).map(() => []);
            }
        }
        const decimalShift = Math.log10(1 / tolerance);
        const decimalFactor = Math.pow(10, decimalShift);
        const hashPrecision = Math.max(10000, decimalFactor);
        for (let i = 0; i < vertexCount; i++) {
            const index = indices ? indices.getX(i) : i;
            let hash = "";
            for (let a = 0, l = attributeNames.length; a < l; a++) {
                const name = attributeNames[a];
                const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;
                const itemSize = attribute.itemSize;
                for (let j = 0; j < itemSize; j++) {
                    hash += ~~(getters[j](attribute, index) * hashPrecision) + ",";
                }
            }
            if (hash in hashToIndex) {
                newIndices.push(hashToIndex[hash]);
            }
            else {
                for (let a = 0, l = attributeNames.length; a < l; a++) {
                    const name = attributeNames[a];
                    const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;
                    const morphAttribute = geometry.morphAttributes[name];
                    const itemSize = attribute.itemSize;
                    const newAttributeArray = newAttributes[name];
                    const newMorphAttributeArrays = morphAttributes[name];
                    for (let j = 0; j < itemSize; j++) {
                        const getter = getters[j];
                        newAttributeArray.push(getter(attribute, index));
                        if (morphAttribute) {
                            for (let k = 0, kl = morphAttribute.length; k < kl; k++) {
                                newMorphAttributeArrays[k].push(getter(morphAttribute[k] as THREE.BufferAttribute, index));
                            }
                        }
                    }
                }
                hashToIndex[hash] = nextIndex;
                newIndices.push(nextIndex);
                nextIndex++;
            }
        }
        const result = geometry.clone();
        for (let i = 0, l = attributeNames.length; i < l; i++) {
            const name = attributeNames[i];
            const originalAttribute = geometry.getAttribute(name);
            const newArray = new (originalAttribute.array.constructor as any)(newAttributes[name]);
            const newAttribute = new THREE.BufferAttribute(newArray, originalAttribute.itemSize, originalAttribute.normalized);
            result.setAttribute(name, newAttribute);
            if (name in morphAttributes) {
                for (let j = 0; j < morphAttributes[name].length; j++) {
                    const originalMorphAttribute = geometry.morphAttributes[name][j];
                    const newMorphArray = new (originalMorphAttribute.array.constructor as any)(morphAttributes[name][j]);
                    const newMorphAttribute = new THREE.BufferAttribute(newMorphArray, originalMorphAttribute.itemSize, originalMorphAttribute.normalized);
                    result.morphAttributes[name][j] = newMorphAttribute;
                }
            }
        }
        result.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1));
        return result;
    }
    static mergeBufferGeometries(geometries: THREE.BufferGeometry[], useGroups: boolean = false): THREE.BufferGeometry {
        const isIndexed = geometries[0].index !== null;
        const attributesUsed = new Set(Object.keys(geometries[0].attributes));
        const mergedAttributes: {
            [key: string]: THREE.BufferAttribute[];
        } = {};
        const mergedGeometry = new THREE.BufferGeometry();
        let offset = 0;
        for (let i = 0; i < geometries.length; ++i) {
            const geometry = geometries[i];
            let attributeCount = 0;
            if (isIndexed !== (geometry.index !== null)) {
                throw new Error("mergeBufferGeometries() failed with geometry at index " + i +
                    ". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.");
            }
            if (Object.keys(geometry.morphAttributes).length) {
                throw new Error("mergeBufferGeometries() failed with geometry at index " + i +
                    ". Morph attributes are not supported");
            }
            for (const name in geometry.attributes) {
                if (!attributesUsed.has(name)) {
                    throw new Error("mergeBufferGeometries() failed with geometry at index " + i +
                        '. All geometries must have compatible attributes; make sure "' + name +
                        '" attribute exists among all geometries, or in none of them.');
                }
                if (mergedAttributes[name] === undefined) {
                    mergedAttributes[name] = [];
                }
                mergedAttributes[name].push(geometry.attributes[name] as THREE.BufferAttribute);
                attributeCount++;
            }
            if (attributeCount !== attributesUsed.size) {
                throw new Error("mergeBufferGeometries() failed with geometry at index " + i +
                    ". Make sure all geometries have the same number of attributes.");
            }
            if (useGroups) {
                let count: number;
                if (isIndexed) {
                    count = geometry.index!.count;
                }
                else {
                    if (geometry.attributes.position === undefined) {
                        throw new Error("mergeBufferGeometries() failed with geometry at index " + i +
                            ". The geometry must have either an index or a position attribute");
                    }
                    count = geometry.attributes.position.count;
                }
                mergedGeometry.addGroup(offset, count, i);
                offset += count;
            }
        }
        if (isIndexed) {
            let indexOffset = 0;
            const mergedIndex: number[] = [];
            for (let i = 0; i < geometries.length; ++i) {
                const index = geometries[i].index!;
                for (let j = 0; j < index.count; ++j) {
                    mergedIndex.push(index.getX(j) + indexOffset);
                }
                indexOffset += geometries[i].attributes.position.count;
            }
            mergedGeometry.setIndex(new THREE.BufferAttribute(new (mergedIndex.length > 65535 ? Uint32Array : Uint16Array)(mergedIndex), 1));
        }
        for (const name in mergedAttributes) {
            const mergedAttribute = this.mergeBufferAttributes(mergedAttributes[name]);
            if (!mergedAttribute) {
                throw new Error("mergeBufferGeometries() failed while trying to merge the " + name + " attribute.");
            }
            mergedGeometry.setAttribute(name, mergedAttribute);
        }
        return mergedGeometry;
    }
    static mergeBufferAttributes(attributes: THREE.BufferAttribute[]): THREE.BufferAttribute | null {
        let arrayType: any;
        let itemSize: number;
        let normalized: boolean;
        let arrayLength = 0;
        for (let i = 0; i < attributes.length; ++i) {
            const attribute = attributes[i];
            if ((attribute as any).isInterleavedBufferAttribute) {
                throw new Error("mergeBufferAttributes() failed. InterleavedBufferAttributes are not supported.");
            }
            if (arrayType === undefined) {
                arrayType = attribute.array.constructor;
            }
            if (arrayType !== attribute.array.constructor) {
                throw new Error("mergeBufferAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.");
            }
            if (itemSize === undefined) {
                itemSize = attribute.itemSize;
            }
            if (itemSize !== attribute.itemSize) {
                throw new Error("mergeBufferAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.");
            }
            if (normalized === undefined) {
                normalized = attribute.normalized;
            }
            if (normalized !== attribute.normalized) {
                throw new Error("mergeBufferAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.");
            }
            arrayLength += attribute.array.length;
        }
        const mergedArray = new arrayType(arrayLength);
        let offset = 0;
        for (let i = 0; i < attributes.length; ++i) {
            mergedArray.set(attributes[i].array, offset);
            offset += attributes[i].array.length;
        }
        return new THREE.BufferAttribute(mergedArray, itemSize!, normalized!);
    }
}
