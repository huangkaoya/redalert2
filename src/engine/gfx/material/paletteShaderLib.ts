import * as THREE from 'three';

export const paletteShaderLib = {
  uniforms: {
    palette: { type: "t", value: null },
    paletteOffsetCount: { value: [0, 1] },
    extraLight: { value: new THREE.Vector3(0, 0, 0) },
  },
  instanceParsVertex: `
#ifdef INSTANCE_TRANSFORM
    attribute float instancePaletteOffset;
    varying float vInstancePaletteOffset;
    attribute vec3 instanceExtraLight;
    varying vec3 vInstanceExtraLight;
#endif
`,
  instanceVertex: `
  #ifdef INSTANCE_TRANSFORM
    vInstancePaletteOffset = instancePaletteOffset;
    vInstanceExtraLight = instanceExtraLight;
  #endif
`,
  paletteColorParsVertex: `
#ifdef VERTEX_PALETTE_OFFSET
    attribute float vertexPaletteOffset;
    varying float vVertexPaletteOffset;
#endif
`,
  paletteColorVertex: `
  #ifdef VERTEX_PALETTE_OFFSET
    vVertexPaletteOffset = vertexPaletteOffset;
  #endif
`,
  paletteColorParsFrag: `
uniform sampler2D palette;
#ifdef VERTEX_PALETTE_OFFSET
    varying float vVertexPaletteOffset;
#endif
uniform vec2 paletteOffsetCount;
uniform vec3 extraLight;

#ifdef INSTANCE_TRANSFORM
varying float vInstancePaletteOffset;
varying vec3 vInstanceExtraLight;
#endif
`,
  paletteColorFrag: `
  float paletteColorIndex;

  #ifdef USE_MAP
  paletteColorIndex = texelColor.a;
  #endif

  #ifdef USE_COLOR
  paletteColorIndex = vColor.r;
  #endif

  #ifdef INSTANCE_TRANSFORM
  diffuseColor = texture2D(palette, vec2(paletteColorIndex, (vInstancePaletteOffset + 0.5) / paletteOffsetCount.y));
  #elif defined(VERTEX_PALETTE_OFFSET)
  diffuseColor = texture2D(palette, vec2(paletteColorIndex, (vVertexPaletteOffset + 0.5) / paletteOffsetCount.y));
  #else
  diffuseColor = texture2D(palette, vec2(paletteColorIndex, (paletteOffsetCount.x + 0.5) / paletteOffsetCount.y));
  #endif

  #ifdef INSTANCE_OPACITY
  diffuseColor.a *= vInstanceOpacity * opacity;
  #else
  diffuseColor.a *= opacity;
  #endif
  diffuseColor = clamp(diffuseColor, 0.0, 1.0);
`,
  paletteBasicLightFragment: `
  #ifdef INSTANCE_TRANSFORM
  diffuseColor.rgb += vInstanceExtraLight.rgb * diffuseColor.rgb;
  #else
  diffuseColor.rgb += extraLight.rgb * diffuseColor.rgb;
  #endif

  diffuseColor = clamp(diffuseColor, 0.0, 1.0);
`,
  paletteFullLightFragment: `
  #ifdef INSTANCE_TRANSFORM
  vec3 extraIrradiance = vInstanceExtraLight.rgb;
  #else
  vec3 extraIrradiance = extraLight.rgb;
  #endif

  // 修改现有的光照计算，添加额外的光照
  #if ( NUM_DIR_LIGHTS > 0 )
    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
      // directionalLight 已经在 Three.js 着色器中定义
      vec3 lightDirection = normalize( directionalLights[ i ].direction );
      float dotNL = saturate( dot( geometryNormal, lightDirection ) );
      vec3 customIrradiance = dotNL * directionalLights[ i ].color * extraIrradiance;
      
      reflectedLight.directDiffuse += customIrradiance * BRDF_Lambert( material.diffuseColor );
      #ifdef USE_PHONG
        reflectedLight.directSpecular += customIrradiance * BRDF_BlinnPhong( lightDirection, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
      #endif
    }
    #pragma unroll_loop_end
  #endif

  // 环境光
  vec3 ambientIrradiance = getAmbientLightIrradiance( ambientLightColor );
  ambientIrradiance *= extraIrradiance;
  reflectedLight.indirectDiffuse += ambientIrradiance * BRDF_Lambert( material.diffuseColor );
`,
  vertexColorMultParsVertex: `
#ifdef USE_VERTEX_COLOR_MULT
attribute vec4 vertexColorMult;
varying vec4 vVertexColorMult;
#endif
`,
  vertexColorMultVertex: `
  #ifdef USE_VERTEX_COLOR_MULT
  vVertexColorMult = vertexColorMult;
  #endif
`,
  vertexColorMultParsFrag: `
#ifdef USE_VERTEX_COLOR_MULT
varying vec4 vVertexColorMult;
#endif
`,
  vertexColorMultFrag: `
  #ifdef USE_VERTEX_COLOR_MULT
  diffuseColor.rgba *= vVertexColorMult.rgba;
  #endif
`,
};