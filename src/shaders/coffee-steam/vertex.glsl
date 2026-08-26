varying vec2 vUv;
uniform float uTime;
#pragma glslify: perlin2d = require('../partials/perlin2d.glsl')

/**
 * The steam plane stands upright over the mug: uv.y runs from the cup lip (0)
 * up to where the plume has faded out (1), uv.x runs across it. Local x is
 * across the plane and local z is its normal, so pushing those two around bends
 * the column instead of stretching it.
 */
void main() {
    vec3 newPosition = position;
    float rise = uv.y;

    // Everything grows with height: at the lip the steam is still a tight
    // column, higher up it has had time to be pushed around by the room.
    float spread = pow(rise, 1.5);

    // Two turbulence samples at different scales, scrolling up at different
    // rates, so the plume never settles into a repeating shape.
    vec2 swayUv = vec2(uv.x * 1.5, rise * 2.2 - uTime * 0.22);
    float sway = perlin2d(swayUv) + perlin2d(swayUv * 2.7 + 11.3) * 0.5;
    float puff = perlin2d(vec2(uv.x * 1.5 + 4.7, rise * 3.1 - uTime * 0.31));

    // Drift across the plane, and a bulge out of it: the plane is flat, and
    // without the off-plane push the steam reads as a sheet of paper.
    newPosition.x += sway * 0.11 * spread;
    newPosition.z += puff * 0.09 * spread;

    // A slow lean, like a draught in the room, on top of the turbulence.
    newPosition.x += sin(uTime * 0.35 + rise * 2.0) * 0.04 * spread;

    // The vertical breathing from before, so the column also stretches and
    // bunches as it climbs.
    float breathe = perlin2d(vec2(uv.x * 2.8, uv.y * 2.8 - uTime * 0.2));
    newPosition.y += breathe * 0.05 * pow(rise * 2.0, 1.2);

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    vUv = uv;
}
