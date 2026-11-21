#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float distanceMeters;
} ub;
layout(binding=1) uniform sampler2D ground;
void main() {
    // Match the authored 560 x 336 software world's scanline sampling.
    float y = (floor((157.0 + qt_TexCoord0.y * 323.0) * 0.7) + 0.5) / 0.7;
    float x = (floor(qt_TexCoord0.x * 560.0) + 0.5) / 0.7;
    float s = (y - 113.0) / 322.0;
    float z = 1.9 + 17.0 * (1.0/s - 1.0);
    float travel = ub.distanceMeters * 0.012;
    float center = 400.0 + 108.0 * (sin(travel + z*0.022) - sin(travel)) * (1.0 - min(1.0,s));
    float u = 0.5 + (x - center)/(4.8 * 333.0 * s);
    if (u < 0.0 || u >= 1.0) { fragColor=vec4(0.0); return; }
    float depthPerPixel = 17.0 * 322.0 / (0.7 * (y-113.0)*(y-113.0));
    float level = clamp(floor(log2(24.0/depthPerPixel)+0.5)-2.0,0.0,6.0);
    float h = 4.0 * exp2(level);
    float w = level < 1.0 ? 128.0 : level < 2.0 ? 192.0 : level < 3.0 ? 256.0 : level < 4.0 ? 384.0 : 512.0;
    float world = ub.distanceMeters+z;
    float zone = mod(world,650.0);
    float layer = zone<195.0 || zone>=530.0 ? 0.0 : zone<360.0 ? 1.0 : 2.0;
    vec2 texel = vec2(floor(u*w),layer*508.0 + h-4.0 + floor(fract(-world/24.0)*h));
    vec3 color = texture(ground,(texel+0.5)/vec2(512.0,1524.0)).rgb;
    float haze = 0.7 * max(0.0,(213.0-y)/57.0);
    float alpha = clamp((y-155.0)/25.0,0.0,1.0)*ub.qt_Opacity;
    fragColor = vec4(mix(color, vec3(219,203,155)/255.0,haze)*alpha,alpha);
}
