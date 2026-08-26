varying vec2 vUv;
uniform float uTimeFrequency;
uniform vec2 vUvFrequency;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
#pragma glslify: perlin2d = require('../partials/perlin2d.glsl')

/**
 * The plume is shaped here rather than in the geometry: a stack of noise
 * octaves scrolling upwards, cut into wisps by a threshold that climbs with
 * height, so the steam thickens just above the cup and dissolves as it rises.
 */
void main() {
    float rise = vUv.y;
    float across = abs(vUv.x - 0.5) * 2.0;
    float scroll = uTime * uTimeFrequency;

    // Shear: the higher the steam gets, the further sideways it has drifted.
    vec2 uv = vUv * vUvFrequency;
    uv.x += sin(rise * 2.6 + scroll * 0.7) * 0.6 * rise;

    // Three octaves, each scrolling faster than the last: big slow billows
    // carrying finer detail that smears out as it climbs.
    float density = perlin2d(vec2(uv.x, uv.y - scroll)) * 0.6;
    density += perlin2d(vec2(uv.x * 2.1 + 3.2, uv.y * 2.1 - scroll * 1.6)) * 0.3;
    density += perlin2d(vec2(uv.x * 4.3 + 7.9, uv.y * 4.3 - scroll * 2.4)) * 0.15;
    density = density * 0.5 + 0.5;

    // Wisps: a rising cut-off eats away at the plume, and a widening soft edge
    // blurs what is left, so the top thins out into strands instead of ending.
    float threshold = mix(0.30, 0.66, rise);
    float softness = mix(0.16, 0.50, rise);
    float wisps = smoothstep(threshold, threshold + softness, density);

    // Column profile: about the width of the mug at the lip, spilling outwards
    // higher up, with soft sides either way.
    float width = mix(0.55, 1.0, pow(rise, 0.7));
    float body = 1.0 - smoothstep(width * 0.4, width, across);

    // Ends: never a hard edge at the cup lip, and gone by the top of the plane.
    float base = smoothstep(0.0, 0.06, rise);
    float fade = 1.0 - smoothstep(0.35, 1.0, rise);

    float alpha = wisps * body * base * fade * uOpacity;

    // Denser steam catches more light; the thin tail at the top reads cooler.
    vec3 color = mix(uColor, vec3(1.0), wisps * 0.3 * (1.0 - rise));

    gl_FragColor = vec4(color, alpha);
}
