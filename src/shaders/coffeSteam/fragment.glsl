varying vec2 vUv;
uniform vec2 vUvFrequency;
uniform float uTime;
uniform vec3 uColor;

#pragma glslify: perlin2d = require('../partials/perlin2d.glsl')


void main()
{
    vec2 uv = vUv * vUvFrequency;
    uv.y -= uTime * 0.5;

    float borderAlpha = min(vUv.x * 4.0, (1.0 - vUv.x) * 4.0);
    borderAlpha = borderAlpha *  (1.0 - vUv.y);

    float perlin = perlin2d(uv);
    perlin *= borderAlpha;
    perlin *= 0.8;
    perlin = min(perlin, 1.0);

    gl_FragColor = vec4(uColor, perlin);
}