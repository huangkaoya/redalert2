import * as THREE from 'three';

const bufferGeometryProto = THREE.BufferGeometry.prototype as THREE.BufferGeometry & {
  addAttribute?: (name: string, attribute: THREE.BufferAttribute) => THREE.BufferGeometry;
};

if (!bufferGeometryProto.addAttribute) {
  bufferGeometryProto.addAttribute = function addAttribute(
    this: THREE.BufferGeometry,
    name: string,
    attribute: THREE.BufferAttribute,
  ): THREE.BufferGeometry {
    this.setAttribute(name, attribute);
    return this;
  };
}

const bufferAttributeProto = THREE.BufferAttribute.prototype as THREE.BufferAttribute & {
  setDynamic?: (dynamic: boolean) => THREE.BufferAttribute;
  updateRange?: { offset: number; count: number };
};

if (!bufferAttributeProto.setDynamic) {
  bufferAttributeProto.setDynamic = function setDynamic(
    this: THREE.BufferAttribute,
    dynamic: boolean,
  ): THREE.BufferAttribute {
    this.setUsage(dynamic ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);
    return this;
  };
}

if (!Object.getOwnPropertyDescriptor(bufferAttributeProto, 'updateRange')) {
  Object.defineProperty(bufferAttributeProto, 'updateRange', {
    configurable: true,
    enumerable: false,
    get(this: THREE.BufferAttribute & { __legacyUpdateRange?: { offset: number; count: number } }) {
      this.__legacyUpdateRange ??= { offset: 0, count: -1 };
      return this.__legacyUpdateRange;
    },
    set(
      this: THREE.BufferAttribute & { __legacyUpdateRange?: { offset: number; count: number } },
      value: { offset: number; count: number },
    ) {
      this.__legacyUpdateRange = value;
    },
  });
}

// Attach THREE to the global window object so that libraries like
// shader-particle-engine (which expects a global THREE) can access it.
// Doing this in a dedicated module ensures it executes **before** any
// other imports that might rely on this side-effect.
const legacyThree = Object.assign({}, THREE, {
  Math: {
    generateUUID: THREE.MathUtils.generateUUID,
  },
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.THREE = legacyThree;

export { THREE }; 
