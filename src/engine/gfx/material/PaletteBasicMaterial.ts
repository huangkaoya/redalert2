import { paletteShaderLib } from "./paletteShaderLib";
import * as THREE from 'three';

// 定义材质参数接口
interface PaletteBasicMaterialParameters extends THREE.MeshBasicMaterialParameters {
  palette?: THREE.Texture;
  paletteCount?: number;
  paletteOffset?: number;
  extraLight?: THREE.Vector3;
  useVertexColorMult?: boolean;
  flatShading?: boolean; // 注释掉的不支持属性，但保留在类型中以防需要
}

// 定义shader对象的类型
interface ShaderObject {
  uniforms: { [uniform: string]: THREE.IUniform };
  vertexShader: string;
  fragmentShader: string;
}

const PaletteBasicShader: ShaderObject = {
  uniforms: THREE.UniformsUtils.merge([
    THREE.ShaderLib.basic.uniforms,
    paletteShaderLib.uniforms,
  ]),
  vertexShader: THREE.ShaderChunk.meshbasic_vert
    .replace(
      "#include <common>",
      "#include <common>\n" +
        [
          paletteShaderLib.instanceParsVertex,
          paletteShaderLib.paletteColorParsVertex,
          paletteShaderLib.vertexColorMultParsVertex,
        ].join("\n"),
    )
    .replace(
      "void main() {",
      "void main() {\n" +
        [
          paletteShaderLib.instanceVertex,
          paletteShaderLib.paletteColorVertex,
          paletteShaderLib.vertexColorMultVertex,
        ].join("\n"),
    ),
  fragmentShader: THREE.ShaderChunk.meshbasic_frag
    .replace(
      "#include <common>",
      "#include <common>\n" +
        [
          paletteShaderLib.paletteColorParsFrag,
          paletteShaderLib.vertexColorMultParsFrag,
        ].join("\n"),
    )
    .replace(
      "#include <map_fragment>",
      "#include <map_fragment>\n" +
        "vec4 texelColor = sampledDiffuseColor;\n" +
        [
          paletteShaderLib.paletteColorFrag,
          paletteShaderLib.paletteBasicLightFragment,
          paletteShaderLib.vertexColorMultFrag,
        ].join("\n"),
    ),
};

export class PaletteBasicMaterial extends THREE.MeshBasicMaterial {
  public uniforms: { [uniform: string]: THREE.IUniform };
  public vertexShader: string;
  public fragmentShader: string;

  get palette(): THREE.Texture {
    return this.uniforms.palette.value;
  }

  set palette(value: THREE.Texture) {
    this.uniforms.palette.value = value;
  }

  get paletteOffset(): number {
    return this.uniforms.paletteOffsetCount.value[0];
  }

  set paletteOffset(value: number) {
    this.uniforms.paletteOffsetCount.value[0] = value;
  }

  get paletteCount(): number {
    return this.uniforms.paletteOffsetCount.value[1];
  }

  set paletteCount(value: number) {
    this.uniforms.paletteOffsetCount.value[1] = value;
  }

  get extraLight(): THREE.Vector3 {
    return this.uniforms.extraLight.value;
  }

  set extraLight(value: THREE.Vector3) {
    this.uniforms.extraLight.value = value;
  }

  set useVertexColorMult(value: boolean) {
    if (value) {
      this.defines = this.defines || {};
      this.defines.USE_VERTEX_COLOR_MULT = "";
    } else if (this.defines) {
      delete this.defines.USE_VERTEX_COLOR_MULT;
    }
  }

  constructor(parameters: PaletteBasicMaterialParameters = {}) {
    const {
      palette,
      paletteCount,
      paletteOffset,
      extraLight,
      useVertexColorMult,
      flatShading, // Remove this unsupported property
      ...options
    } = parameters;

    super(options);
    
    this.uniforms = THREE.UniformsUtils.clone(PaletteBasicShader.uniforms);
    
    if (palette) {
      this.palette = palette;
    }
    if (paletteCount !== undefined) {
      this.paletteCount = paletteCount;
    }
    if (paletteOffset !== undefined) {
      this.paletteOffset = paletteOffset;
    }
    if (extraLight) {
      this.extraLight.copy(extraLight);
    }
    if (useVertexColorMult !== undefined) {
      this.useVertexColorMult = useVertexColorMult;
    }
    
    this.vertexShader = PaletteBasicShader.vertexShader;
    this.fragmentShader = PaletteBasicShader.fragmentShader;
    this.type = "PaletteBasicMaterial";
  }

  copy(source: PaletteBasicMaterial): this {
    super.copy(source);
    this.fragmentShader = source.fragmentShader;
    this.vertexShader = source.vertexShader;
    this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
    this.palette = source.palette;
    return this;
  }
}