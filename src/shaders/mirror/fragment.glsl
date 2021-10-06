#ifdef GL_ES
precision highp float;
#endif

#define PI2 6.28318530718
#define MAX_ITER 5

uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform float uTime;
uniform float spectrum;
varying vec2 vUv;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float uTime = uTime * 0.04; 

    vec2 p = mod(vUv * PI2, PI2) - 100.0;
    vec2 i = vec2(p);
    float c = 0.5;
    float inten =  0.0094;

    for (int n = 0; n < MAX_ITER; n++) {
        float t = uTime * (4.5 - (2.2 / float(n + 122)));
        i = p + vec2(sin((t - i.x) + cos(t + i.y)) * 4.0, cos((t - i.y) + sin(t + i.x)) * 5.0);
        c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten + spectrum), p.y / (cos(i.y + t) / inten)));
    }

    c /= float(MAX_ITER);
    c = 1.10 - pow(c, 1.26);
    vec3 color = mix(uColorStart * 0.2, uColorEnd / 1.2, pow(abs(c), 4.1));

    fragColor = vec4(color, 1.3);
}


void main( void ) {
    mainImage(gl_FragColor, gl_FragCoord.xy);}