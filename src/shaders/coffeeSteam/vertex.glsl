varying vec2 vUv;
uniform float uTime;
#pragma glslify: perlin2d = require('../partials/perlin2d.glsl')

void main() {
    vec3 newPosition = position;
    vec2 displacementUv = uv;
    displacementUv *= 2.8;
    displacementUv.y -= uTime * 0.2;

    float displacementStrength = pow(uv.y * 2.0, 1.2);
    float perlin = perlin2d(displacementUv) * displacementStrength;
    newPosition.y += perlin * 0.1;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    vUv = uv;
}