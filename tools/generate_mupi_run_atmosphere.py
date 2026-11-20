#!/usr/bin/env python3
"""Render layered atmospheric forest elements and subtle painterly textures for MuPi Run.

Own artwork only. Requires Pillow and rsvg-convert (already required by the
SVG sprite generator). Generates raster images consumed by the running game,
with reproducible deterministic seeds and no online assets.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance
import importlib.util, math, random, subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'examples/mupi-run/art'
R = random.Random(2403)
W,H=800,480
OUT.mkdir(exist_ok=True)

def image(name):
    return Image.open(OUT/(name+'.png')).convert('RGBA')

def gradient(w,h,stops):
    # A gentle multistop atmospheric gradient, tinted toward golden sunbeams.
    im=Image.new('RGBA',(w,h))
    d=ImageDraw.Draw(im)
    for y in range(h):
        t=y/max(1,h-1)
        for n in range(1,len(stops)):
            if t <= stops[n][0]:
                t0,c0=stops[n-1]
                t1,c1=stops[n]
                k=(t-t0)/max(1e-6,t1-t0)
                col=tuple(round(c0[i]*(1-k)+c1[i]*k) for i in range(4))
                break
        else:col=stops[-1][1]
        d.line((0,y,w,y),fill=col)
    return im

def paste_center(layer, sprite, x,y, w,h,opacity=1):
    src=image(sprite).resize((max(1,int(w)),max(1,int(h))),Image.Resampling.LANCZOS)
    if opacity<1:
        src.putalpha(src.getchannel('A').point(lambda v: int(v*opacity)))
    layer.alpha_composite(src,(round(x-w/2),round(y-h)))

def mist(layer,box,rgba,blur):
    mask=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(mask,'RGBA')
    d.ellipse(box,fill=rgba)
    mask=mask.filter(ImageFilter.GaussianBlur(blur))
    layer.alpha_composite(mask)

def bark_noise(w,h,r):
    layer=Image.new('RGBA',(w,h),(0,0,0,0))
    d=ImageDraw.Draw(layer,'RGBA')
    for _ in range(170):
        x=r.randint(0,w);y=r.randint(0,h)
        d.line((x,y,x+r.randint(-2,2),y+r.randint(1,25)),fill=(232,197,126,r.randint(8,31)),width=r.randint(1,2))
    return layer

def make_background():
    # Multiple tree silhouettes at different focal depths avoid the flat "row of triangles".
    layer=gradient(W,H,[(0,(17,49,58,255)),(.27,(75,127,112,255)),
                        (.48,(137,174,135,255)),(1,(65,115,94,255))])
    canopy=image('backdrop').resize((800,480))
    layer=Image.blend(layer,canopy,.21).convert('RGBA')
    # Sunlight behind the trees, not a solid yellow sun disc.
    light=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(light,'RGBA')
    for radius in range(220,15,-3):
        alpha=max(0,round(46*(1-radius/235)**1.7))
        d.ellipse((525-radius,-12-radius,525+radius,-12+radius),fill=(253,242,173,alpha))
    light=light.filter(ImageFilter.GaussianBlur(12))
    layer.alpha_composite(light)
    # Strong near-forest silhouettes. A fuzzy depth of field differentiates layers.
    for depth in range(3):
        temp=Image.new('RGBA',(W,H),(0,0,0,0))
        count=[17,12,7][depth]
        for i in range(count):
            x=(i+.43)*W/count+R.uniform(-22,22)
            y=[209,232,265][depth]+R.randint(-18,16)
            size=([62,91,137][depth])*R.uniform(.82,1.26)
            name=R.choice(['tree-fir','tree-oak','tree-willow'] if depth>0 else ['tree-fir','tree-willow'])
            paste_center(temp,name,x,y,size,size*1.36,opacity=[.25,.35,.43][depth])
        temp=temp.filter(ImageFilter.GaussianBlur([7,3,1.1][depth]))
        layer.alpha_composite(temp)
    # Dappled ground on both banks; free-center is reserved for the game river.
    trees=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(trees,'RGBA')
    d.polygon([(0,206),(295,204),(130,480),(0,480)],fill=(60,101,70,240))
    d.polygon([(800,206),(522,204),(660,480),(800,480)],fill=(64,111,70,244))
    for i in range(260):
        y=R.randint(170,477);spread=max(0,(y-150)*.45)
        left=R.random()<.5
        x=R.uniform(-20,200) if left else R.uniform(605,822)
        r=R.uniform(2,13)*(.3+(y/480))
        d.ellipse((x-r,y-r*.4,x+r,y+r*.34),
                  fill=R.choice([(126,154,76,33),(168,186,102,23),(22,71,57,28),(227,207,138,21)]))
    layer.alpha_composite(trees)
    # Soft volumetric beams, each semitransparent and wider toward the water.
    beams=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(beams,'RGBA')
    for i,(start,end,width) in enumerate([(460,245,66),(518,400,83),(570,610,110),(612,754,80)]):
        d.polygon([(start,25),(start+12,20),(end+width,475),(end,475)],fill=(255,244,177,[28,20,22,13][i]))
    beams=beams.filter(ImageFilter.GaussianBlur(25));layer.alpha_composite(beams)
    # Haze toward vanishing point, including subtle backlighting.
    mist(layer,(171,88,678,292),(208,240,184,32),32)
    mist(layer,(280,115,590,230),(252,247,191,38),26)
    layer.convert('RGB').save(OUT/'backdrop.png',optimize=True)

def make_foreground():
    f=Image.new('RGBA',(W,H),(0,0,0,0))
    # Massive trees at the image edge, trimmed by canvas; depth-framing, no HUD obstruction.
    paste_center(f,'tree-oak',-25,442,307,463,.98)
    paste_center(f,'tree-willow',830,430,293,442,.97)
    # Rocks and lush ferns around the camera, but keep three lanes clear.
    for side in [-1,1]:
        for i,(y,sc) in enumerate([(302,.56),(365,.95),(448,1.47)]):
            x=(43 if side==-1 else 757)+side*R.randint(-24,14)
            paste_center(f,'rock',x,y,92*sc,72*sc,.9)
            paste_center(f,'fern',x-side*52*sc,y+14,82*sc,97*sc,.99)
            if i%2==0:
                paste_center(f,'mushroom',x+side*32*sc,y-13,69*sc,68*sc,.98)
            else:
                paste_center(f,'flower',x+side*45*sc,y,63*sc,68*sc,.96)
    # Far front canopy and leaf clusters (do not obstruct play center)
    for i in range(8):
        x=(-15+37*i) if i<4 else (685+36*(i-4))
        paste_center(f,'fern',x,R.randint(45,104),R.randint(62,94),R.randint(85,129),.88)
    f.save(OUT/'foreground.png',optimize=True)

def make_water():
    # Transparent randomized caustic glints over an independently modeled riverbed.
    r=random.Random(8186)
    w,h=768,592
    sharp=Image.new('RGBA',(w,h),(0,0,0,0))
    d=ImageDraw.Draw(sharp,'RGBA')
    for i in range(510):
        y=r.randint(0,h-1);x=r.randint(0,w-1)
        sx=r.uniform(8,66);sy=r.uniform(1,7)
        alpha=r.randint(17,67)
        choice=r.random()
        if choice<.15:col=(251,226,154,alpha)
        elif choice<.38:col=(21,80,94,alpha)
        else:col=(214,249,226,alpha)
        d.arc((x-sx/2,y-sy,x+sx/2,y+sy),8,157,fill=col,width=r.randint(1,3))
        if i%4==0:
            d.arc((x-1.1*sx,y-2*sy,x+1.1*sx,y+1.5*sy),22,114,fill=(236,255,232,alpha//2),width=1)
    # Sparkling rivulets sparkle without making repeated straight road markings.
    for i in range(190):
        x=r.randint(0,w);y=r.randint(0,h)
        d.line([(x,y),(x+r.randint(-12,-2),y+4),(x+r.randint(5,24),y+4)],
               fill=(211,248,231,r.randint(15,51)),width=r.randint(1,2),joint='curve')
    soft=sharp.filter(ImageFilter.GaussianBlur(4))
    soft.putalpha(soft.getchannel('A').point(lambda x:min(160,x)))
    soft=ImageEnhance.Color(soft).enhance(1.22)
    soft.alpha_composite(sharp)
    soft.save(OUT/'water-caustics.png',optimize=True)

def svg_path(d,fill,stroke=None,width=1):
    return '<path d="'+d+'" fill="'+fill+'"'+(
      f' stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"' if stroke else '')+'/>'

def render_svg(name,w,h,parts):
    # Same SVG source, gradients and alpha source policy as original sprites.
    spec=importlib.util.spec_from_file_location('mupi_vector',ROOT/'tools/generate_mupi_run_sprites.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    body=module.wrap(parts,w,h)
    (OUT/(name+'.svg')).write_text(body,encoding='utf-8')
    subprocess.run(['rsvg-convert','-f','png','-w',str(w),'-h',str(h),
                    '-o',str(OUT/(name+'.png')),str(OUT/(name+'.svg'))],check=True)

def make_fallen_arch():
    # Ancient moss-covered tree bent into a natural bridge, mushroom shelves and hanging ivy.
    from_import=importlib.util.spec_from_file_location('mupi_art',ROOT/'tools/generate_mupi_run_sprites.py')
    base=importlib.util.module_from_spec(from_import);from_import.loader.exec_module(base)
    b=''
    b+=svg_path('M23 262 Q43 211 84 165 Q178 45 321 65 Q463 59 579 124 Q641 167 713 251 L716 278 Q671 267 625 220 Q528 123 406 115 Q214 57 139 161 Q100 204 74 276Z','url(#wood)','#513f31',10)
    b+=svg_path('M47 241Q155 73 326 83Q503 72 675 237','none','#d6a46c',9)
    b+=svg_path('M55 215Q179 61 344 73Q536 78 679 229Q600 166 519 134Q392 91 300 100Q171 93 100 183Z','url(#moss)')
    b+=svg_path('M115 192Q229 76 325 99M382 110Q508 117 582 173','none','#afcf69',6)
    rr=random.Random(221)
    for i in range(155):
        a=rr.uniform(0,math.pi)
        x=rr.uniform(72,674);y=85+62*((x-365)/365)**2+rr.uniform(-19,25)
        b+=base.leaf(x,y,rr.uniform(7,19),rr.uniform(-120,120),
                     rr.choice(['url(#leaf)','#a3d66b','#4d9962','#bddf7d']))
    for i in range(19):
        x=rr.randint(141,624)
        y=90+55*((x-365)/365)**2
        length=rr.randint(34,113)
        b+=svg_path(f'M{x} {y}q{rr.randint(-25,25)} {length/2:.1f} {rr.randint(-15,15)} {length}','none','#557e49',rr.randint(2,4))
        for j in range(4):
            b+=base.leaf(x+rr.uniform(-19,19),y+17+j*length/5,rr.uniform(7,15),rr.randint(-80,80))
    for i in range(12):
        x=rr.uniform(90,640);y=120+33*((x-365)/365)**2
        b+=svg_path(f'M{x-17:.1f} {y:.1f}q10 -37 28 -4q-1 13 -28 4Z','#e99c55','#a86243',2)
        b+=svg_path(f'M{x-8:.1f} {y-6:.1f}q12 -14 17 2','none','#fff0cc',2)
    render_svg('fallen-arch',740,316,b)

def make_dragonfly():
    # Freestanding whimsical turquoise dragonfly, translucent four-wing layout.
    b=''
    b+='<defs><linearGradient id="wing" x1=".1" y1=".1" x2=".9" y2="1"><stop stop-color="#e7fff3" stop-opacity=".94"/><stop offset=".55" stop-color="#a1f1ed" stop-opacity=".62"/><stop offset="1" stop-color="#4bbdcc" stop-opacity=".18"/></linearGradient></defs>'
    b+=svg_path('M94 61Q32 2 17 13Q2 35 80 74Q47 105 49 119Q72 129 93 84Z','url(#wing)','#7bd4d1',3)
    b+=svg_path('M101 60Q151 4 166 15Q185 31 118 77Q153 116 136 121Q109 129 98 82Z','url(#wing)','#7bd4d1',3)
    b+=svg_path('M86 57Q44 23 31 31M78 74Q56 92 57 109M112 56Q151 27 158 31M122 76Q142 102 136 112','none','#e6fff1',2)
    b+=svg_path('M97 77Q104 105 100 129','none','#167e89',12)
    for y,r in [(88,7),(100,7),(111,6),(123,5)]:
        b+='<ellipse cx="100" cy="'+str(y)+'" rx="'+str(r)+'" ry="5" fill="#6ecdb6" stroke="#167887" stroke-width="2"/>'
    b+='<ellipse cx="99" cy="62" rx="18" ry="25" fill="#28a6a6" stroke="#196b77" stroke-width="3"/>'
    b+='<ellipse cx="94" cy="53" rx="6" ry="12" fill="#b6efd3"/>'
    b+='<ellipse cx="91" cy="49" rx="3" ry="4" fill="#193e55"/><ellipse cx="107" cy="49" rx="3" ry="4" fill="#193e55"/>'
    render_svg('dragonfly',188,140,b)

def make_waterfall():
    # Bank waterfall carved into grey rocks, foam and turquoise glints.
    from_import=importlib.util.spec_from_file_location('mupi_art',ROOT/'tools/generate_mupi_run_sprites.py')
    base=importlib.util.module_from_spec(from_import);from_import.loader.exec_module(base)
    b=base.ellipse(211,277,197,23,'#286b77','opacity=".6"')
    b+=svg_path('M0 276Q29 183 42 125Q65 40 129 36Q236 21 284 72Q319 111 374 123L421 279Z','url(#stone)','#365360',9)
    b+=svg_path('M13 246Q44 180 58 129Q64 78 111 54Q131 53 146 82Q105 130 94 197Q73 265 53 279Z','#99aaa0',extra=None) if False else ''
    b+=svg_path('M45 268L89 124Q106 82 156 83Q200 91 204 126L194 278Z','#4b7880')
    b+=svg_path('M190 272L217 113Q247 76 286 105Q319 132 365 150L402 281Z','#667e7a')
    # Wide waterfall with naturally distinct water ribbons.
    b+=svg_path('M129 68Q171 78 219 65Q248 85 280 106Q267 168 291 219Q296 266 307 284L111 289Q126 229 117 194Q132 135 129 68Z','#c4f6eb','#9bdbde',3)
    for i in range(33):
        x=134+i*4.9
        y=79+rrange(i,11)
        b+=svg_path(f'M{x:.1f} {y:.1f}Q{x+rrange(i+2,10):.1f} 145 {x+rrange(i*3,13):.1f} 210Q{x-rrange(i*5,8):.1f} 259 {x+rrange(i*6,12):.1f} 281','none',
                    ['#eaffef','#8de9e5','#39acc4','#defdf5'][i%4],[2,3,4][i%3])
    for i in range(17):
        x=75+i*15
        b+=svg_path(f'M{x} 281q7 -{10+i%3*3} 18 -7q-7 8 -1 13','none','#f3fff4',5)
    for i in range(43):
        x=rrange(i*4,322)+57;y=rrange(i*9,35)+258
        b+=base.ellipse(x,y,2+i%3,1+i%2,'#e9fff2','opacity=".8"')
    for i in range(45):
        x=rrange(i*3,380)+15;y=rrange(i+13,81)+11
        if x<119 or x>284:
            b+=base.leaf(x,y,rrange(i+43,13)+6,rrange(i*7,360)-180,
                         ['url(#moss)','url(#leaf)','#81b965'][i%3])
    render_svg('waterfall',430,320,b)
def rrange(seed,maximum):
    return int((seed*41+17)%max(1,maximum))

def make_cover():
    """A richly layered game-matching 512-square Qt/Admin tile."""
    from PIL import ImageFont
    w=1024
    canvas=Image.new('RGBA',(w,w),(22,51,50,255))
    backdrop=image('backdrop').resize((1024,775),Image.Resampling.LANCZOS)
    canvas.alpha_composite(backdrop,(0,90))
    d=ImageDraw.Draw(canvas,'RGBA')
    # River opening toward camera; the top of the river stays beneath the title.
    shore=[(480,365),(542,365),(956,1024),(65,1024)]
    d.polygon(shore,fill=(101,137,109,255))
    d.polygon([(490,370),(529,370),(917,1024),(104,1024)],fill=(36,135,150,255))
    d.polygon([(500,372),(520,372),(876,1024),(135,1024)],fill=(21,104,136,255))
    # Soft, masked caustics in the foreground stream.
    water=image('water-caustics').resize((1024,790),Image.Resampling.LANCZOS)
    mask=Image.new('L',(w,w));md=ImageDraw.Draw(mask)
    md.polygon([(498,368),(521,368),(866,1024),(144,1024)],fill=190)
    tile=Image.new('RGBA',(w,w),(0,0,0,0))
    tile.alpha_composite(water,(0,250))
    tile.putalpha(ImageChops.multiply(tile.getchannel('A'),mask))
    canvas.alpha_composite(tile)
    # Cliffs and waterfall, a natural mossy wood arch and edge plants.
    def decal(sprite,x,y,sw,sh,opacity=1):
        layer=image(sprite).resize((sw,sh),Image.Resampling.LANCZOS)
        if opacity<1:layer.putalpha(layer.getchannel('A').point(lambda a:int(a*opacity)))
        canvas.alpha_composite(layer,(x,y))
    decal('fallen-arch',145,360,730,350)
    decal('waterfall',711,445,320,274,.95)
    for x,y,sc in [(4,640,1.15),(845,685,1.25),(50,812,1),(840,855,1.08)]:
        decal('rock',x,y,int(170*sc),int(130*sc))
        decal('fern',x-30,y+53,int(146*sc),int(163*sc))
    decal('flower',5,670,230,275)
    decal('mushroom',842,718,195,196)
    # Running orange Axolotl, rear camera view, crisp and central.
    shadow=Image.new('RGBA',(w,w),(0,0,0,0))
    shd=ImageDraw.Draw(shadow,'RGBA')
    shd.ellipse((343,951,701,1012),fill=(4,29,43,160))
    shadow=shadow.filter(ImageFilter.GaussianBlur(23));canvas.alpha_composite(shadow)
    decal('mupi-back',330,550,360,445)
    # Contrast a dimensional dark-wood title plaque against leafy background.
    txt=Image.new('RGBA',(w,w),(0,0,0,0));dt=ImageDraw.Draw(txt,'RGBA')
    dt.rounded_rectangle((124,45,910,329),radius=62,
                         fill=(23,45,49,241),outline=(190,222,150,248),width=10)
    dt.rounded_rectangle((139,60,895,315),radius=50,
                         outline=(99,146,107,142),width=4)
    font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    try:
        large=ImageFont.truetype(font,148);medium=ImageFont.truetype(font,135)
    except OSError:large=ImageFont.load_default();medium=large
    dt.text((512,82),'MuPi',anchor='mt',font=large,fill=(255,187,89),
            stroke_width=6,stroke_fill=(87,56,43))
    dt.text((512,211),'RUN',anchor='mt',font=medium,fill=(239,255,236),
            stroke_width=5,stroke_fill=(32,82,78))
    canvas.alpha_composite(txt)
    rgb=canvas.convert('RGB')
    rgb.resize((512,512),Image.Resampling.LANCZOS).save(ROOT/'examples/mupi-run/cover.png',optimize=True)
    rgb.resize((256,256),Image.Resampling.LANCZOS).save(ROOT/'examples/mupi-run/icon.png',optimize=True)

def texture_sprites():
    # Multiscale low-amplitude canvas paper texture, slightly stronger in bright highlights.
    names=['mupi-back','mupi-back-run-left','mupi-back-run-right',
           'tree-oak','tree-fir','tree-willow','fern','rock','log','branch',
           'vine','flower','mushroom','reeds','splash','stump','basket','boot']
    rr=random.Random(806)
    for name in names:
        # Rasterize the clean SVG on every run: prevents cumulative grain.
        source=OUT/(name+'.svg')
        subprocess.run(['rsvg-convert','-f','png','-o',str(OUT/(name+'.png')),
                        str(source)],check=True)
        src=image(name)
        w,h=src.size
        grain=Image.new('L',(max(3,w//17),max(3,h//17)))
        grain.putdata([rr.randint(100,156) for _ in range(grain.width*grain.height)])
        grain=grain.resize((w,h),Image.Resampling.BICUBIC)
        grain=ImageEnhance.Contrast(grain).enhance(.7)
        # Screen/multiply approx via brightness modulation on base channels.
        base=src.convert('RGB')
        modifier=Image.blend(Image.new('RGB',(w,h),(128,128,128)),Image.merge('RGB',(grain,)*3),.25)
        enhanced=ImageChops.multiply(base,modifier).point(lambda v: min(255,round(v*1.995)))
        enhanced.putalpha(src.getchannel('A'))
        enhanced.save(OUT/(name+'.png'),optimize=True)

def main():
    # Run after generate_mupi_run_sprites.py; never touch SVG source files of old assets.
    make_background()
    make_water()
    make_fallen_arch()
    make_waterfall()
    make_dragonfly()
    make_foreground()
    texture_sprites()
    make_cover()
    for name in ('backdrop','foreground','water-caustics','fallen-arch','waterfall','dragonfly'):
        p=OUT/(name+'.png')
        print(name,round(p.stat().st_size/1024),'KiB')
if __name__=='__main__':
    main()