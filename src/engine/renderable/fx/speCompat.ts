import SPE from 'shader-particle-engine';
import type * as THREE from 'three';
let shaderPatched = false;
function patchShaderSource(source: string): string {
    return source
        .replace(/uniform sampler2D texture;/g, 'uniform sampler2D particleTexture;')
        .replace(/texture2D\(\s*texture\s*,/g, 'texture2D( particleTexture,');
}
function patchShaders(): void {
    if (shaderPatched) {
        return;
    }
    shaderPatched = true;
    const speAny = SPE as any;
    if (typeof speAny.shaderChunks?.uniforms === 'string') {
        speAny.shaderChunks.uniforms = patchShaderSource(speAny.shaderChunks.uniforms);
    }
    if (typeof speAny.shaders?.vertex === 'string') {
        speAny.shaders.vertex = patchShaderSource(speAny.shaders.vertex);
    }
    if (typeof speAny.shaders?.fragment === 'string') {
        speAny.shaders.fragment = patchShaderSource(speAny.shaders.fragment);
    }
}
export function patchSpeGroup(group: any): any {
    patchShaders();
    const material = group?.material ?? group?.mesh?.material;
    if (material) {
        if (typeof material.vertexShader === 'string') {
            material.vertexShader = patchShaderSource(material.vertexShader);
        }
        if (typeof material.fragmentShader === 'string') {
            material.fragmentShader = patchShaderSource(material.fragmentShader);
        }
        if (material.uniforms?.texture && !material.uniforms.particleTexture) {
            material.uniforms.particleTexture = material.uniforms.texture;
            delete material.uniforms.texture;
        }
        material.needsUpdate = true;
    }
    const attributes = group?.attributes;
    if (attributes) {
        for (const attribute of Object.values(attributes) as Array<{
            bufferAttribute?: THREE.BufferAttribute;
        }>) {
            if (attribute.bufferAttribute && !(attribute.bufferAttribute as any).updateRange) {
                (attribute.bufferAttribute as any).updateRange = { offset: 0, count: -1 };
            }
        }
    }
    return group;
}
