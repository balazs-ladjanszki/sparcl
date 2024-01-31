/*
  (c) 2021 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)

  (c) 2024 Nokia
  Licensed under the MIT License
  SPDX-License-Identifier: MIT
*/

// code from OGL example https://github.com/oframe/ogl/blob/master/examples/load-gltf.html

import { Mesh, Program, TextureLoader, Transform, Vec3 } from 'ogl';

const complex_shader = {
    vertex: /* glsl */ `
        attribute vec3 position;
        #ifdef UV
            attribute vec2 uv;
        #else
            const vec2 uv = vec2(0);
        #endif
        #ifdef NORMAL
            attribute vec3 normal;
        #else
            const vec3 normal = vec3(0);
        #endif
        #ifdef INSTANCED
            attribute mat4 instanceMatrix;
        #endif
        #ifdef SKINNING
            attribute vec4 skinIndex;
            attribute vec4 skinWeight;
        #endif
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat4 modelMatrix;
        uniform mat3 normalMatrix;
        #ifdef SKINNING
            uniform sampler2D boneTexture;
            uniform int boneTextureSize;
        #endif
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vMPos;
        varying vec4 vMVPos;
        #ifdef SKINNING
            mat4 getBoneMatrix(const in float i) ${`{`}
                float j = i * 4.0;
                float x = mod(j, float(boneTextureSize));
                float y = floor(j / float(boneTextureSize));
                float dx = 1.0 / float(boneTextureSize);
                float dy = 1.0 / float(boneTextureSize);
                y = dy * (y + 0.5);
                vec4 v1 = texture2D(boneTexture, vec2(dx * (x + 0.5), y));
                vec4 v2 = texture2D(boneTexture, vec2(dx * (x + 1.5), y));
                vec4 v3 = texture2D(boneTexture, vec2(dx * (x + 2.5), y));
                vec4 v4 = texture2D(boneTexture, vec2(dx * (x + 3.5), y));
                return mat4(v1, v2, v3, v4);
            }
            void skin(inout vec4 pos, inout vec3 nml) ${`{`}
                mat4 boneMatX = getBoneMatrix(skinIndex.x);
                mat4 boneMatY = getBoneMatrix(skinIndex.y);
                mat4 boneMatZ = getBoneMatrix(skinIndex.z);
                mat4 boneMatW = getBoneMatrix(skinIndex.w);
                // update normal
                mat4 skinMatrix = mat4(0.0);
                skinMatrix += skinWeight.x * boneMatX;
                skinMatrix += skinWeight.y * boneMatY;
                skinMatrix += skinWeight.z * boneMatZ;
                skinMatrix += skinWeight.w * boneMatW;
                nml = vec4(skinMatrix * vec4(nml, 0.0)).xyz;
                // Update position
                vec4 transformed = vec4(0.0);
                transformed += boneMatX * pos * skinWeight.x;
                transformed += boneMatY * pos * skinWeight.y;
                transformed += boneMatZ * pos * skinWeight.z;
                transformed += boneMatW * pos * skinWeight.w;
                pos = transformed;
            }
        #endif
        void main() ${`{`}
            vec4 pos = vec4(position, 1);
            vec3 nml = normal;
            #ifdef SKINNING
                skin(pos, nml);
            #endif
            #ifdef INSTANCED
                pos = instanceMatrix * pos;
                mat3 m = mat3(instanceMatrix);
                nml /= vec3(dot(m[0], m[0]), dot(m[1], m[1]), dot(m[2], m[2]));
                nml = m * nml;
            #endif
            vUv = uv;
            vNormal = normalize(nml);
            vec4 mPos = modelMatrix * pos;
            vMPos = mPos.xyz / mPos.w;
            vMVPos = modelViewMatrix * pos;
            gl_Position = projectionMatrix * vMVPos;
        }
        `,

    fragment: /* glsl */ `
        uniform mat4 viewMatrix;
        uniform vec3 cameraPosition;
        uniform vec4 uBaseColorFactor;
        uniform sampler2D tBaseColor;
        uniform sampler2D tRM;
        uniform float uRoughness;
        uniform float uMetallic;
        uniform sampler2D tNormal;
        uniform float uNormalScale;
        uniform sampler2D tEmissive;
        uniform vec3 uEmissive;
        uniform sampler2D tOcclusion;
        uniform sampler2D tLUT;
        uniform sampler2D tEnvDiffuse;
        uniform sampler2D tEnvSpecular;
        uniform float uEnvDiffuse;
        uniform float uEnvSpecular;
        uniform vec3 uLightDirection;
        uniform vec3 uLightColor;
        uniform float uAlpha;
        uniform float uAlphaCutoff;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vMPos;
        varying vec4 vMVPos;
        const float PI = 3.14159265359;
        const float RECIPROCAL_PI = 0.31830988618;
        const float RECIPROCAL_PI2 = 0.15915494;
        const float LN2 = 0.6931472;
        const float ENV_LODS = 6.0;
        vec4 SRGBtoLinear(vec4 srgb) ${`{`}
            vec3 linOut = pow(srgb.xyz, vec3(2.2));
            return vec4(linOut, srgb.w);
        }
        vec4 RGBMToLinear(in vec4 value) ${`{`}
            float maxRange = 6.0;
            return vec4(value.xyz * value.w * maxRange, 1.0);
        }
        vec3 linearToSRGB(vec3 color) ${`{`}
            return pow(color, vec3(1.0 / 2.2));
        }
        vec3 getNormal() ${`{`}
            #ifdef NORMAL_MAP
                vec3 pos_dx = dFdx(vMPos.xyz);
                vec3 pos_dy = dFdy(vMPos.xyz);
                vec2 tex_dx = dFdx(vUv);
                vec2 tex_dy = dFdy(vUv);
                // Tangent, Bitangent
                vec3 t = normalize(pos_dx * tex_dy.t - pos_dy * tex_dx.t);
                vec3 b = normalize(-pos_dx * tex_dy.s + pos_dy * tex_dx.s);
                mat3 tbn = mat3(t, b, normalize(vNormal));
                vec3 n = texture2D(tNormal, vUv).rgb * 2.0 - 1.0;
                n.xy *= uNormalScale;
                vec3 normal = normalize(tbn * n);
                // Get world normal from view normal (normalMatrix * normal)
                // return normalize((vec4(normal, 0.0) * viewMatrix).xyz);
                return normalize(normal);
            #else
                return normalize(vNormal);
            #endif
        }
        vec3 specularReflection(vec3 specularEnvR0, vec3 specularEnvR90, float VdH) ${`{`}
            return specularEnvR0 + (specularEnvR90 - specularEnvR0) * pow(clamp(1.0 - VdH, 0.0, 1.0), 5.0);
        }
        float geometricOcclusion(float NdL, float NdV, float roughness) ${`{`}
            float r = roughness;
            float attenuationL = 2.0 * NdL / (NdL + sqrt(r * r + (1.0 - r * r) * (NdL * NdL)));
            float attenuationV = 2.0 * NdV / (NdV + sqrt(r * r + (1.0 - r * r) * (NdV * NdV)));
            return attenuationL * attenuationV;
        }
        float microfacetDistribution(float roughness, float NdH) ${`{`}
            float roughnessSq = roughness * roughness;
            float f = (NdH * roughnessSq - NdH) * NdH + 1.0;
            return roughnessSq / (PI * f * f);
        }
        vec2 cartesianToPolar(vec3 n) ${`{`}
            vec2 uv;
            uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
            uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
            return uv;
        }
        void getIBLContribution(inout vec3 diffuse, inout vec3 specular, float NdV, float roughness, vec3 n, vec3 reflection, vec3 diffuseColor, vec3 specularColor) ${`{`}
            vec3 brdf = SRGBtoLinear(texture2D(tLUT, vec2(NdV, roughness))).rgb;
            vec3 diffuseLight = RGBMToLinear(texture2D(tEnvDiffuse, cartesianToPolar(n))).rgb;
            diffuseLight = mix(vec3(1), diffuseLight, uEnvDiffuse);
            // Sample 2 levels and mix between to get smoother degradation
            float blend = roughness * ENV_LODS;
            float level0 = floor(blend);
            float level1 = min(ENV_LODS, level0 + 1.0);
            blend -= level0;

            // Sample the specular env map atlas depending on the roughness value
            vec2 uvSpec = cartesianToPolar(reflection);
            uvSpec.y /= 2.0;
            vec2 uv0 = uvSpec;
            vec2 uv1 = uvSpec;
            uv0 /= pow(2.0, level0);
            uv0.y += 1.0 - exp(-LN2 * level0);
            uv1 /= pow(2.0, level1);
            uv1.y += 1.0 - exp(-LN2 * level1);
            vec3 specular0 = RGBMToLinear(texture2D(tEnvSpecular, uv0)).rgb;
            vec3 specular1 = RGBMToLinear(texture2D(tEnvSpecular, uv1)).rgb;
            vec3 specularLight = mix(specular0, specular1, blend);
            diffuse = diffuseLight * diffuseColor;

            // Bit of extra reflection for smooth materials
            float reflectivity = pow((1.0 - roughness), 2.0) * 0.05;
            specular = specularLight * (specularColor * brdf.x + brdf.y + reflectivity);
            specular *= uEnvSpecular;
        }
        void main() ${`{`}
            vec4 baseColor = uBaseColorFactor;
            #ifdef COLOR_MAP
                baseColor *= SRGBtoLinear(texture2D(tBaseColor, vUv));
            #endif
            // Get base alpha
            float alpha = baseColor.a;
            #ifdef ALPHA_MASK
                if (alpha < uAlphaCutoff) discard;
            #endif
            // RM map packed as gb = [nothing, roughness, metallic, nothing]
            vec4 rmSample = vec4(1);
            #ifdef RM_MAP
                rmSample *= texture2D(tRM, vUv);
            #endif
            float roughness = clamp(rmSample.g * uRoughness, 0.04, 1.0);
            float metallic = clamp(rmSample.b * uMetallic, 0.04, 1.0);
            vec3 f0 = vec3(0.04);
            vec3 diffuseColor = baseColor.rgb * (vec3(1.0) - f0) * (1.0 - metallic);
            vec3 specularColor = mix(f0, baseColor.rgb, metallic);
            vec3 specularEnvR0 = specularColor;
            vec3 specularEnvR90 = vec3(clamp(max(max(specularColor.r, specularColor.g), specularColor.b) * 25.0, 0.0, 1.0));
            vec3 N = getNormal();
            vec3 V = normalize(cameraPosition - vMPos);
            vec3 L = normalize(uLightDirection);
            vec3 H = normalize(L + V);
            vec3 reflection = normalize(reflect(-V, N));
            float NdL = clamp(dot(N, L), 0.001, 1.0);
            float NdV = clamp(abs(dot(N, V)), 0.001, 1.0);
            float NdH = clamp(dot(N, H), 0.0, 1.0);
            float LdH = clamp(dot(L, H), 0.0, 1.0);
            float VdH = clamp(dot(V, H), 0.0, 1.0);
            vec3 F = specularReflection(specularEnvR0, specularEnvR90, VdH);
            float G = geometricOcclusion(NdL, NdV, roughness);
            float D = microfacetDistribution(roughness, NdH);
            vec3 diffuseContrib = (1.0 - F) * (diffuseColor / PI);
            vec3 specContrib = F * G * D / (4.0 * NdL * NdV);

            // Shading based off lights
            vec3 color = NdL * uLightColor * (diffuseContrib + specContrib);
            // Add lights spec to alpha for reflections on transparent surfaces (glass)
            alpha = max(alpha, max(max(specContrib.r, specContrib.g), specContrib.b));
            // Calculate IBL lighting
            vec3 diffuseIBL;
            vec3 specularIBL;
            getIBLContribution(diffuseIBL, specularIBL, NdV, roughness, N, reflection, diffuseColor, specularColor);
            // Add IBL on top of color
            color += diffuseIBL + specularIBL;
            // Add IBL spec to alpha for reflections on transparent surfaces (glass)
            alpha = max(alpha, max(max(specularIBL.r, specularIBL.g), specularIBL.b));
            #ifdef OCC_MAP
                // TODO: figure out how to apply occlusion
                // color *= SRGBtoLinear(texture2D(tOcclusion, vUv)).rgb;
            #endif
            #ifdef EMISSIVE_MAP
                vec3 emissive = SRGBtoLinear(texture2D(tEmissive, vUv)).rgb * uEmissive;
                color += emissive;
            #endif
            // Convert to sRGB to display
            gl_FragColor.rgb = linearToSRGB(color);

            // Apply uAlpha uniform at the end to overwrite any specular additions on transparent surfaces
            gl_FragColor.a = alpha * uAlpha;
        }
    `,
};

export function createGltfProgram(node: any) {
    const gltf = node.program.gltfMaterial || {};
    let { vertex, fragment } = complex_shader;

    // luckily these are passed along with the node
    let gl = node.gl;
    let renderer = node.gl.renderer;

    // Common textures for uber shader
    const lutTexture = TextureLoader.load(gl, {
        src: 'media/ogl/pbr/lut.png',
    });
    const envDiffuseTexture = TextureLoader.load(gl, {
        src: 'media/ogl/sunset-diffuse-RGBM.png',
    });
    const envSpecularTexture = TextureLoader.load(gl, {
        src: 'media/ogl/sunset-specular-RGBM.png',
    });

    const vertexPrefix = renderer.isWebgl2
        ? /* glsl */ `#version 300 es
        #define attribute in
        #define varying out
        #define texture2D texture
    `
        : ``;

    const fragmentPrefix = renderer.isWebgl2
        ? /* glsl */ `#version 300 es
        precision highp float;
        #define varying in
        #define texture2D texture
        #define gl_FragColor FragColor
        out vec4 FragColor;
    `
        : /* glsl */ `#extension GL_OES_standard_derivatives : enable
        precision highp float;
    `;

    let defines = `
        ${node.geometry.attributes.uv ? `#define UV` : ``}
        ${node.geometry.attributes.normal ? `#define NORMAL` : ``}
        ${node.geometry.isInstanced ? `#define INSTANCED` : ``}
        ${node.boneTexture ? `#define SKINNING` : ``}
        ${gltf.alphaMode === 'MASK' ? `#define ALPHA_MASK` : ``}
        ${gltf.baseColorTexture ? `#define COLOR_MAP` : ``}
        ${gltf.normalTexture ? `#define NORMAL_MAP` : ``}
        ${gltf.metallicRoughnessTexture ? `#define RM_MAP` : ``}
        ${gltf.occlusionTexture ? `#define OCC_MAP` : ``}
        ${gltf.emissiveTexture ? `#define EMISSIVE_MAP` : ``}
    `;

    vertex = vertexPrefix + defines + vertex;
    fragment = fragmentPrefix + defines + fragment;

    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
            uBaseColorFactor: { value: gltf.baseColorFactor || [1, 1, 1, 1] },
            tBaseColor: { value: gltf.baseColorTexture ? gltf.baseColorTexture.texture : null },

            tRM: { value: gltf.metallicRoughnessTexture ? gltf.metallicRoughnessTexture.texture : null },
            uRoughness: { value: gltf.roughnessFactor !== undefined ? gltf.roughnessFactor : 1 },
            uMetallic: { value: gltf.metallicFactor !== undefined ? gltf.metallicFactor : 1 },

            tNormal: { value: gltf.normalTexture ? gltf.normalTexture.texture : null },
            uNormalScale: { value: gltf.normalTexture ? gltf.normalTexture.scale || 1 : 1 },

            tOcclusion: { value: gltf.occlusionTexture ? gltf.occlusionTexture.texture : null },

            tEmissive: { value: gltf.emissiveTexture ? gltf.emissiveTexture.texture : null },
            uEmissive: { value: gltf.emissiveFactor || [0, 0, 0] },

            tLUT: { value: lutTexture },
            tEnvDiffuse: { value: envDiffuseTexture },
            tEnvSpecular: { value: envSpecularTexture },
            uEnvDiffuse: { value: 0.5 },
            uEnvSpecular: { value: 0.5 },

            uLightDirection: { value: new Vec3(0, 1, 1) },
            uLightColor: { value: new Vec3(2.5) },

            uAlpha: { value: 1 },
            uAlphaCutoff: { value: gltf.alphaCutoff },
        },
        transparent: gltf.alphaMode === 'BLEND',
        cullFace: gltf.doubleSided ? gl.NONE : gl.BACK,
    });

    return program;
}

const simple_shader = {
    vertex: /* glsl */ `
        attribute vec3 position;
        #ifdef UV
            attribute vec2 uv;
        #else
            const vec2 uv = vec2(0);
        #endif
        #ifdef NORMAL
            attribute vec3 normal;
        #else
            const vec3 normal = vec3(0);
        #endif
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        varying vec2 vUv;

        void main() ${`{`}
            vec4 pos = vec4(position, 1);
            vUv = uv;
            vec4 vMVPos = modelViewMatrix * pos;
            gl_Position = projectionMatrix * vMVPos;
        }
        `,

    fragment: /* glsl */ `
        precision highp float;
        uniform vec4 uBaseColorFactor;
        uniform sampler2D tBaseColor;

        varying vec2 vUv;

        void main() ${`{`}
            vec4 baseColor = uBaseColorFactor;
            #ifdef COLOR_MAP
                baseColor *= texture2D(tBaseColor, vUv);
            #endif
            gl_FragColor.rgb = baseColor.rgb;
            gl_FragColor.a = baseColor.a;
        }
    `,
};

export function createSimpleGltfProgram(node: Mesh) {
    // TODO: gltfMaterial does not exist on program
    const gltf = (node.program as any).gltfMaterial || {};
    let { vertex, fragment } = simple_shader;

    let defines = `
        ${node.geometry.attributes.uv ? `#define UV` : ``}
        ${node.geometry.attributes.normal ? `#define NORMAL` : ``}
        ${gltf.baseColorTexture ? `#define COLOR_MAP` : ``}
    `;

    vertex = defines + vertex;
    fragment = defines + fragment;

    let gl = node.gl;
    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
            uBaseColorFactor: { value: gltf.baseColorFactor || [1, 1, 1, 1] },
            tBaseColor: { value: gltf.baseColorTexture ? gltf.baseColorTexture.texture : null },
        },
        transparent: gltf.alphaMode === 'BLEND',
        cullFace: gltf.doubleSided ? gl.NONE : gl.BACK,
    });

    return program;
}