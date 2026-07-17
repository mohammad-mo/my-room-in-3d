varying vec2 vUv;
uniform float uTimeFrequency;
uniform vec2 vUvFrequency;
uniform float uTime;
uniform vec3 uColor;
#pragma glslify: perlin2d = require('../partials/perlin2d.glsl')

void main() {
    vec2 uv = vUv * vUvFrequency;
    uv.y -= uTime * uTimeFrequency;

    float borderAlpha = min(vUv.x * 8.0, (1.5 - vUv.x) * 4.0);
    borderAlpha = borderAlpha * (0.9 - vUv.y);

    float perlin = perlin2d(uv);
    perlin *= borderAlpha;
    perlin = min(perlin, 1.0);

    gl_FragColor = vec4(uColor, perlin);
}