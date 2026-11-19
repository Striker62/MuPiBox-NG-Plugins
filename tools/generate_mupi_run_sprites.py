#!/usr/bin/env python3
"""Original transparent MuPi Run forest sprites, drawn as detailed SVG artwork.
Every asset is a self-contained alpha PNG, rasterized for 800x480 Chromium/Qt.
No third-party art, fonts, CDNs or runtime SVG decoding required.
"""
from __future__ import annotations
from pathlib import Path
import math
import random
import subprocess
import io
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'examples/mupi-run'
OUT=BASE/'art'
OUT.mkdir(exist_ok=True)
random.seed(6026)

DEFS="""<defs>
<linearGradient id="wood" x1=".12" x2=".94" y1="0" y2=".95"><stop stop-color="#c78d50"/><stop offset=".35" stop-color="#8a5438"/><stop offset=".71" stop-color="#6b483c"/><stop offset="1" stop-color="#412f34"/></linearGradient>
<linearGradient id="bark" x1="0" x2="1" y1="0" y2=".3"><stop stop-color="#d5a56f"/><stop offset=".4" stop-color="#a26b45"/><stop offset=".9" stop-color="#60483a"/></linearGradient>
<linearGradient id="moss" x1="0" x2=".9" y1="0" y2="1"><stop stop-color="#d0e76b"/><stop offset=".33" stop-color="#80be4b"/><stop offset=".85" stop-color="#367f4c"/></linearGradient>
<linearGradient id="leaf" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#c4de71"/><stop offset=".26" stop-color="#71b55d"/><stop offset=".75" stop-color="#2e8554"/><stop offset="1" stop-color="#145c52"/></linearGradient>
<linearGradient id="leaf2" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#a5d971"/><stop offset=".4" stop-color="#3d9569"/><stop offset="1" stop-color="#21685b"/></linearGradient>
<linearGradient id="stone" x1=".18" x2=".88" y1=".08" y2=".98"><stop stop-color="#d4c6a3"/><stop offset=".25" stop-color="#8d9d95"/><stop offset=".72" stop-color="#596e72"/><stop offset="1" stop-color="#354f5c"/></linearGradient>
<linearGradient id="orange" x1=".08" x2=".94" y1="0" y2="1"><stop stop-color="#ffe69e"/><stop offset=".16" stop-color="#ffbf5c"/><stop offset=".53" stop-color="#f58731"/><stop offset=".86" stop-color="#cf5d26"/><stop offset="1" stop-color="#b84f29"/></linearGradient>
<linearGradient id="tail" x1="0" x2=".95" y1="0" y2="1"><stop stop-color="#ffc97f"/><stop offset=".3" stop-color="#f98a43"/><stop offset=".72" stop-color="#ea6930"/><stop offset="1" stop-color="#b74832"/></linearGradient>
<linearGradient id="gill" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ffc6ad"/><stop offset=".4" stop-color="#ff7a75"/><stop offset="1" stop-color="#c73d65"/></linearGradient>
<linearGradient id="fern" x1=".4" x2=".9" y1="0" y2="1"><stop stop-color="#c6dd79"/><stop offset=".5" stop-color="#62ad61"/><stop offset="1" stop-color="#237a61"/></linearGradient>
<radialGradient id="sun"><stop stop-color="#fff4bf" stop-opacity=".95"/><stop offset=".35" stop-color="#e9f1ac" stop-opacity=".45"/><stop offset="1" stop-color="#b6efd5" stop-opacity="0"/></radialGradient>
<filter id="shadow" x="-40%" y="-40%" width="180%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>"""

def path(d, fill, stroke=None, sw=1, extra=''):
    return f'<path d="{d}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '')+f' {extra}/>'
def ellipse(cx,cy,rx,ry,fill,extra=''):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def circles(name):
    return ''
def wrap(body,w,h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{DEFS}{body}</svg>'
def save(name,w,h,body):
    svg=OUT/(name+'.svg')
    png=OUT/(name+'.png')
    svg.write_text(wrap(body,w,h),encoding='utf-8')
    subprocess.run(['rsvg-convert','--format','png','-w',str(w),'-h',str(h),'-o',str(png),str(svg)],check=True)
    # Ship raster assets only; SVGs are authoring sources in the repository.
    print(name,png.stat().st_size)

def leaf(x,y,r,angle,col='url(#leaf)',stroke='#2f7952'):
    # Irregular lanceolate leaf with a midrib, natural variation and shading.
    return f'<g transform="translate({x:.1f} {y:.1f}) rotate({angle:.1f}) scale({r/22:.3f})">' + \
        path('M0 20 Q-21 11 -16 -4 Q-12 -19 5 -25 Q17 -10 14 3 Q12 14 0 20Z',col,stroke,1.8)+\
        path('M0 16Q4 -5 5 -19','none','#d6e5a0',1.1, 'opacity=".66"')+'</g>'

def oak():
    random.seed(108)
    b=ellipse(171,327,106,18,'#203c3f', 'opacity=".15"')
    b+=path('M145 337 Q153 287 142 241 Q130 195 121 152 Q118 134 134 114 Q144 126 157 159 L172 217 Q187 159 207 118 Q221 110 222 124 Q198 166 189 219 Q186 280 200 337Z','url(#wood)','#543f35',5)
    b+=path('M164 332 Q176 265 157 178 Q162 151 173 164 Q181 245 181 333Z','#f0b66c',extra='opacity=".28"')
    b+=path('M153 253Q164 242 169 229 M181 276Q177 259 189 243 M153 296Q166 290 170 278','none','#4e392f',3)
    # distinctly shaped branching limbs
    b+=path('M148 218 Q110 164 80 151 Q60 137 33 139','none','#664739',15)
    b+=path('M180 205 Q225 162 264 151 Q290 137 310 119','none','#77503b',15)
    b+=path('M167 157 Q174 105 191 91','none','#6d4836',12)
    # Hundreds of overlapping non-circular individual leaf silhouettes
    for i in range(170):
        x=random.gauss(169,91); y=random.gauss(111,51)
        if not (19<x<332 and 20<y<218):continue
        r=random.uniform(13,27)
        col=random.choice(['url(#leaf)','url(#leaf2)','#5d9e5b','#76b862','#367c5b','#9bbf68'])
        b+=leaf(x,y,r,random.uniform(-105,115),col)
    for i in range(26):
        x=random.uniform(38,293);y=random.uniform(55,142)
        b+=path(f'M{x:.0f} {y:.0f}q5 3 9 -2','none','#daf3ab',random.choice([1,2]),'opacity=".73"')
    return b

def fir():
    random.seed(305)
    b=ellipse(137,305,65,13,'#143e43', 'opacity=".16"')
    b+=path('M127 307Q138 234 133 96 Q132 62 139 52 Q145 158 146 307Z','url(#wood)','#5b4433',4)
    for layer in range(8,-1,-1):
        y=48+layer*26
        size=32+layer*9
        for side in [-1,1]:
            xx=137+side*size*.65
            b+=path(f'M137 {y-49} Q{137+side*size*.32:.1f} {y-16} {137+side*size:.1f} {y+size*.18:.1f} Q{137+side*size*.68:.1f} {y+size*.27:.1f} {137+side*size*.45:.1f} {y+size*.14:.1f} Q{137+side*size*.1:.1f} {y+15} 137 {y-36}Z',
                    random.choice(['#2a7157','#357f60','#388d65','#4f9964','#427f61']), '#1f5a52',1)
            for j in range(4):
                x=137+side*(14+j*size*.19)
                b+=path(f'M137 {y-24} Q{x:.1f} {y-4} {x+side*8:.1f} {y+7}', 'none','#a0cb76',1,'opacity=".52"')
    return b

def willow():
    random.seed(603)
    b=ellipse(157,335,100,19,'#163f43', 'opacity=".14"')
    b+=path('M130 342Q148 304 136 243Q126 194 153 158Q181 134 181 122Q165 159 167 186Q181 217 181 253Q174 305 192 343Z','url(#bark)','#5e4638',5)
    b+=path('M158 171Q103 133 60 151 M166 154Q230 105 297 146 M174 170Q199 127 221 77','none','#795137',12)
    for i in range(80):
        x=random.uniform(40,314); y=random.uniform(66,155)
        if random.random()<.35:continue
        length=random.uniform(88,192)
        b+=path(f'M{x:.1f} {y:.1f}q{random.uniform(-18,18):.1f} {length*.5:.1f} {random.uniform(-26,26):.1f} {length:.1f}', 'none', '#528b61',random.uniform(1.5,3))
        for j in range(4):
            u=j/4;yy=y+length*(u+.18)
            xx=x+random.uniform(-17,15)
            b+=leaf(xx,yy,random.uniform(9,17),random.choice([-40,45,140]),random.choice(['url(#leaf)','#88bf6c','#369468']))
    return b

def fern():
    random.seed(814)
    b=''
    for j in range(9):
        angle=-92+j*23
        length=76+random.randint(-9,25)
        b+=f'<g transform="translate(120 220) rotate({angle})">'
        b+=path(f'M0 0 Q2 -{length*.56:.0f} 0 -{length:.0f}','none','#376a55',3)
        for k in range(11):
            t=k/11
            y=-(10+length*t)
            lr=(17+15*t)*(1-t*.68)
            for side in [-1,1]:
                b+=path(f'M0 {y:.1f} Q{side*lr*.5:.1f} {y-13:.1f} {side*lr:.1f} {y-19:.1f} Q{side*lr*.7:.1f} {y-4:.1f} 0 {y:.1f}Z',
                        random.choice(['url(#fern)','#7aba69','#3f9967','#abd57a']))
        b+='</g>'
    return b

def rock():
    random.seed(771)
    b=ellipse(154,236,133,18,'#153b42', 'opacity=".18"')
    b+=path('M20 215Q23 173 55 137L91 91Q128 58 184 72L237 98Q292 118 300 180L288 227Q184 241 41 230Z','url(#stone)','#3d5a59',5)
    b+=path('M53 151Q77 108 104 92Q131 75 173 83L207 101L166 145Q107 142 53 151Z','#dfd7ac',extra='opacity=".75"')
    b+=path('M166 143L215 99Q258 115 276 164L232 196L164 184Z','#536b6d',extra='opacity=".4"')
    b+=path('M75 188Q115 165 160 182M197 122Q188 149 199 167M222 198Q238 183 258 185','none','#435f63',3,'opacity=".7"')
    # Irregular moss mat and clumps on ridge.
    b+=path('M56 140Q67 109 107 91Q145 65 177 82L209 99Q182 91 168 104Q150 110 141 98Q116 89 109 114Q91 100 76 127Z','url(#moss)')
    for i in range(52):
        x=random.uniform(67,207);y=random.uniform(85,134)
        b+=leaf(x,y,random.uniform(4,10),random.uniform(-160,140),random.choice(['#acd765','#70ab55','#538f4f']))
    return b

def log():
    random.seed(735)
    b=ellipse(167,200,142,18,'#12383c','opacity=".22"')
    b+=path('M35 108Q51 91 75 100Q137 83 195 92L292 104Q316 114 311 150Q314 183 287 190L92 196Q53 192 41 164Z','url(#bark)','#523f34',6)
    b+=path('M47 119Q104 95 181 102Q232 98 292 119M49 166Q109 184 194 164L286 174','none','#efd59b',5,'opacity=".53"')
    b+=path('M85 119Q119 103 146 119M168 139Q206 117 244 141M128 164Q157 146 179 155M220 170Q265 154 291 156','none','#634936',5,'opacity=".69"')
    b+=path('M37 104Q11 115 24 165Q30 191 67 191Q86 173 80 137Q73 103 37 104Z','#8d5e40','#594235',5)
    b+=path('M41 113Q25 126 34 164Q40 183 58 178Q69 166 64 137Q59 119 41 113Z','#c58f5a','#694832',4)
    b+=path('M46 127Q34 141 45 158Q52 169 57 150Q57 140 46 127Z','#805c44')
    b+=path('M74 101Q123 79 191 90Q242 81 291 107Q266 120 235 107Q210 115 180 105Q139 119 110 111Q91 122 74 101Z','url(#moss)')
    for i in range(45):
        x=random.uniform(90,288); y=random.uniform(93,116)
        b+=leaf(x,y,random.uniform(5,10),random.uniform(-160,130),random.choice(['#bbdc6b','#7fbf62','#5b9a51']))
    for x,y in [(192,101),(232,97),(265,106)]:
        b+=path(f'M{x-10} {y}q-7 -17 4 -19q17 -2 13 18Z','#e89d61','#815f4d',1)
        b+=path(f'M{x-10} {y-18}q8 -23 23 -1Z','#e7d5a1')
    return b

def branch():
    random.seed(377)
    b=path('M21 69Q104 35 192 66Q277 70 346 45Q379 34 403 53L406 84Q347 83 283 102Q201 97 133 106L18 93Z','url(#bark)','#4d3c36',5)
    b+=path('M26 72Q117 49 193 83Q267 81 370 57','none','#f0b875',5,'opacity=".44"')
    b+=path('M98 98Q113 121 119 133 M270 87Q271 119 288 143','none','#604a39',10)
    for i in range(53):
        x=random.uniform(30,405);y=random.uniform(45,110)
        if random.random()<.23:continue
        b+=leaf(x,y,random.uniform(12,24),random.uniform(-155,155),random.choice(['url(#leaf)','#8abc5f','#42975f','#a0cb5a']))
    for i in range(6):
        x=65+i*57
        b+=path(f'M{x} 91q-8 40 8 66','none','#6b9957',random.uniform(3,6))
        b+=leaf(x+7,157,14,30,'#6ea756')
    return b

def vine():
    random.seed(112)
    b=path('M20 33Q132 67 221 38Q316 14 418 45','none','#52784d',11)
    for i in range(8):
        x=43+i*50
        length=random.randint(115,227)
        b+=path(f'M{x} 42Q{x+24} {length*.43:.1f} {x-8} {length+40}','none','#39764d',random.uniform(3,6))
        for j in range(8):
            y=58+j*length/9
            b+=leaf(x+random.uniform(-17,18),y,random.uniform(11,21),random.choice([-75,-30,24,65]),random.choice(['url(#leaf)','url(#leaf2)','#9bce74']))
    return b

def flower():
    random.seed(334)
    b=''
    for i in range(15):
        x=30+random.uniform(0,180); y=234-random.uniform(6,35)
        top=y-random.uniform(40,115)
        b+=path(f'M{x:.1f} {y:.1f}Q{x+random.uniform(-30,30):.1f} {y-30:.1f} {x+4:.1f} {top:.1f}','none','#4b925b',3)
        b+=leaf(x-9,y-24,12,-57,'#84ba65')
        c=random.choice(['#f1b4da','#b3a4eb','#f5e6a4','#fff9ea'])
        for angle in range(0,360,72):
            b+=f'<g transform="translate({x+4:.1f} {top:.1f}) rotate({angle})">'+path('M0 0Q-10 -6 -9 -14Q-5 -22 0 -17Q6 -24 10 -14Q10 -5 0 0Z',c)+'</g>'
        b+=ellipse(x+4,top,4.8,4.8,'#ecc264')
    return b

def mushroom():
    b=''
    for x,y,scale in [(57,184,1.0),(117,218,.6),(174,180,.8),(215,232,.52)]:
        b+=f'<g transform="translate({x} {y}) scale({scale})">'
        b+=path('M-12 0Q-17 -26 -10 -55L17 -58Q18 -28 12 0Z','#efd6ac','#9c897b',3)
        b+=path('M-49 -47Q-38 -108 -2 -107Q35 -104 54 -49Q48 -31 -44 -37Z','#db7349','#874b3c',3)
        b+=path('M-36 -63Q-19 -101 4 -94Q23 -94 33 -62','#ffbf78',extra='opacity=".65"')
        for px,py,r in [(-17,-73,5),(14,-72,7),(0,-91,4),(34,-51,5),(-33,-52,4)]:
            b+=ellipse(px,py,r,r*.76,'#fff4d8')
        b+='</g>'
    return b

def reeds():
    random.seed(555)
    b=''
    for i in range(17):
        x=25+i*11; tip=13+random.randint(0,62)
        b+=path(f'M{x} 244Q{x+random.randint(-31,31)} 127 {x+random.randint(-27,27)} {tip}', 'none',random.choice(['#3a865f','#69a962','#8bb96c']),random.uniform(3,5))
        if i%3==0:
            b+=path(f'M{x+8} {tip+2}q-7 -35 11 -39q21 13 8 39Z','#ad9064')
        if i%2==0:
            b+=leaf(x+random.randint(-12,12),random.randint(100,189),random.uniform(15,28),random.choice([-95,95]),'#80b65f')
    return b


def water_splash():
    random.seed(1412)
    b=''
    b+=path('M20 175Q39 142 78 144Q126 128 176 141Q222 133 284 164Q283 203 231 215Q166 226 95 213Q48 212 20 175Z','#4ab0bd','#9df3ec',5)
    b+=path('M32 178Q89 154 144 171Q213 146 274 177Q249 198 174 205Q90 204 32 178Z','#8bdfde',extra='opacity=".72"')
    for i in range(18):
        x=random.uniform(32,264);y=random.uniform(89,165)
        h=random.uniform(8,34)
        b+=path(f'M{x-6:.1f} {y+15:.1f}Q{x-15:.1f} {y:.1f} {x:.1f} {y-h:.1f}Q{x+17:.1f} {y:.1f} {x+6:.1f} {y+15:.1f}Z',
                random.choice(['#ecffea','#aeebeb','#f4fbd6','#7dcfd9']))
    b+=path('M56 189Q92 201 120 188M163 185Q206 198 242 184','none','#effef4',5)
    return b

def stump():
    b=ellipse(158,246,108,14,'#163d43', 'opacity=".18"')
    b+=path('M77 93Q109 79 153 81Q198 75 235 95L245 225Q207 241 160 238L81 225Z','url(#bark)','#654838',6)
    b+=path('M82 120Q71 90 103 70Q162 38 220 77Q252 95 238 117Q195 149 140 146Q99 142 82 120Z','#e8ba7d','#684e3b',5)
    b+=path('M111 114Q122 84 163 84Q203 81 217 102Q219 127 174 130Q130 134 111 114Z','#ba8b5c','#80563e',4)
    b+=path('M138 111Q151 97 178 100Q187 105 174 113Q157 120 138 111Z','#8b664a')
    b+=path('M107 150Q121 190 110 221M189 147Q202 180 207 223M153 160Q159 180 147 212','none','#684a3b',5)
    b+=path('M80 109Q93 84 118 77Q151 54 194 75L223 89Q204 82 182 88Q163 78 149 92Q117 77 102 115Z','url(#moss)')
    for i in range(18):
        x=random.uniform(91,218);y=random.uniform(79,107)
        b+=leaf(x,y,random.uniform(7,16),random.uniform(-140,140),random.choice(['#aed36b','#80b755','#5e9d4b']))
    return b

def basket():
    b=ellipse(168,231,104,16,'#12373d', 'opacity=".2"')
    b+=path('M65 104Q163 94 272 112L254 211Q155 233 80 211Z','#bf865a','#744b3b',6)
    b+=path('M66 114Q160 130 270 112L258 146Q163 155 74 144Z','#efd19c','#a06b4b',4)
    b+=path('M80 118Q90 23 157 25Q241 20 267 120','none','#9d6b44',13)
    b+=path('M83 119Q112 52 157 50Q208 49 254 114','none','#eac68f',5)
    for i in range(8):
        x=93+i*21
        b+=path(f'M{x} 139l{(i%2)*4-2} 66','none','#f5d39b',6)
    for y in (158,178,198):
        b+=path(f'M87 {y}Q165 {y+9} 256 {y-1}','none','#99603c',7)
    b+=path('M68 110Q173 97 272 112','none','#f4dca9',7)
    return b

def boot():
    b=ellipse(153,215,91,12,'#173e46', 'opacity=".2"')
    b+=path('M108 42Q151 21 182 53L181 135Q211 160 258 170Q283 189 270 213L73 214Q40 205 57 174Q103 161 101 119Z','#bf6f63','#744848',6)
    b+=path('M114 51Q146 38 171 60L162 139Q181 169 243 175Q261 179 262 195L84 196Q95 164 101 119Z','#e49979',extra='opacity=".69"')
    b+=path('M79 197Q164 207 263 197L266 219L75 221Q50 218 55 198Z','#f4d3a1','#885c52',4)
    b+=path('M114 79Q144 91 163 79M111 105Q141 118 163 109M113 127Q136 141 154 130','none','#ffdfaa',7)
    b+=path('M104 55Q137 65 178 53','none','#753e42',9)
    return b


def back_mupi(step=0, layer="full", frame=None):
    # Ground-contact reference: planted rear feet end at SVG y≈339.
    # The running game anchors THAT y to the ground, not the canvas bottom.
    # Six external feathery gill stalks remain exactly three per side.
    b=''
    if layer!='body':
        # Curved muscular caudal fin; pulled sideways so it no longer forms
        # a narrow third leg hanging toward the old, wrongly placed shadow.
        b+=path('M179 205Q150 226 149 258Q140 291 108 297Q82 299 64 276Q70 319 113 329Q160 336 192 309Q236 273 224 241Q216 220 207 209Z',
                'url(#tail)','#a84f32',6)
        b+=path('M178 227Q157 253 157 275Q147 298 103 310Q146 321 181 293Q207 274 198 241Z',
                '#ffdb9b',extra='opacity=".68"')
        b+=path('M153 276Q166 285 158 296M130 304Q150 305 164 299M95 313Q113 323 130 320','none','#d46735',4,'opacity=".52"')
    if layer=='tail':
        return b
    # Alternating planted and raised feet give a real walk/run cycle.
    # step is -1/0/1; the planted foot always ends at y≈341.
    for side in [-1,1]:
        # Six frames: the plant-foot always stays on y=339; the lifted foot
        # swings forward before landing. The tail is a separate BEHIND layer.
        lifts=((0,22),(0,12),(4,0),(22,0),(12,0),(0,4))
        lift = lifts[frame%6][0 if side==-1 else 1] if frame is not None else (27 if step!=0 and side==step else 0)
        dy = -lift if lift else 2
        dx = side*(lift*.4 if lift else -2)
        b+=f'<g transform="translate({dx} {dy})">'
        b+=path(f'M{188+side*53} 271Q{188+side*70} 283 {188+side*52} 321Q{188+side*47} 339 {188+side*35} 328Q{188+side*27} 311 {188+side*34} 287Z','url(#orange)','#a95632',5)
        b+=path(f'M{188+side*50} 318l{side*12} 17m{-side*12} -17l{side*1} 20','none','#a95632',3)
        b+='</g>'
    # four-limbed salamander body
    b+=path('M124 198Q113 155 133 122Q153 99 185 111Q229 98 246 129Q267 172 246 217Q254 272 222 293Q184 304 151 285Q121 271 124 198Z',
            'url(#orange)','#a9542f',6)
    b+=path('M132 174Q136 121 175 124Q208 123 230 150Q243 186 219 228Q203 268 181 276Q142 245 132 174Z','#ffd38c',extra='opacity=".26"')
    # slender forearms drawn behind head, fingers at base
    for side in [-1,1]:
        b+=path(f'M{188+side*62} 143Q{188+side*87} 166 {188+side*84} 222Q{188+side*79} 245 {188+side*58} 229Q{188+side*52} 217 {188+side*58} 197L{188+side*45} 177Z',
                'url(#orange)','#a95232',5)
        b+=path(f'M{188+side*72} 221l{side*15} 9m{-side*15} -9l{side*19} 0','none','#ae5636',3)
    # distinctly broad round head from behind, spotted light with no eyes/mouth
    b+=path('M111 149Q92 126 98 90Q108 38 169 35Q224 23 266 62Q284 86 273 129Q266 161 224 172Q164 184 118 161Z',
           'url(#orange)','#b25731',6)
    b+=path('M118 80Q142 42 184 42Q227 41 258 81Q247 59 217 52Q163 35 130 64Z','#ffe2a2',extra='opacity=".57"')
    # head-back freckles
    for x,y,rad in [(144,91,9),(170,76,6),(196,77,10),(229,91,7),(159,114,8),(192,108,6),(215,121,9),(182,137,5)]:
        b+=ellipse(x,y,rad,rad*.72,'#d86b2e','opacity=".56"')
    for x,y,r in [(160,188,5),(206,198,6),(185,218,8),(160,249,5),(214,258,5),(191,268,4)]:
        b+=ellipse(x,y,r,r*.7,'#d36b36','opacity=".48"')
    # gills: exactly three primary branches each side, with smaller feather filaments
    for side in [-1,1]:
        for index,(yy,ang,length) in enumerate([(79, -24,61),(111,6,67),(143,24,56)]):
            base=188+side*84
            ex=188+side*(84+length)
            ey=yy+ang
            b+=path(f'M{base} {yy}Q{base+side*35} {yy+ang*.3:.1f} {ex} {ey}', 'none','#9c4350',17)
            b+=path(f'M{base} {yy-3}Q{base+side*35} {yy+ang*.3-4:.1f} {ex} {ey-5}', 'none','url(#gill)',13)
            for j in range(5):
                u=(j+1)/6
                x=base+side*length*u; y=yy+ang*u
                b+=path(f'M{x:.1f} {y:.1f}q{side*8} -15 {side*6} -20','none','#f49b91',4.5)
                b+=path(f'M{x:.1f} {y+2:.1f}q{side*6} 12 {side*4} 18','none','#dd657b',3.3)
            b+=ellipse(ex,ey-5,8,8,'#fb9e90')
    return b

def background():
    # 800x480 composited forest backdrop, hand-authored organic paths, no game UI.
    random.seed(1482)
    b='''<rect width="800" height="480" fill="#285b72"/>
<path d="M0 0H800V330Q520 250 270 320Q140 250 0 315Z" fill="#69b0aa"/>
<circle cx="604" cy="117" r="208" fill="url(#sun)"/>
<path d="M0 196Q42 134 96 159Q154 104 216 177Q280 118 338 176Q410 124 469 175Q534 124 586 174Q651 126 711 163Q760 121 800 158V314H0Z" fill="#4e9e8b"/>
<path d="M0 226Q88 172 167 216Q238 164 312 205Q404 145 497 219Q589 161 694 221Q770 170 800 195V335H0Z" fill="#26746d"/>
'''
    for layer in range(3):
        for i in range(26):
            x=i*36-40+layer*8
            top=65+layer*38+random.randint(-18,18)
            bottom=290+layer*30
            col=['#245f5b','#317968','#48896c'][layer]
            b+=path(f'M{x} {bottom}q-6 -110 0 -{bottom-top}', 'none','#5c6757',5+layer)
            # organic tree crowns as overlapping pointed-leaf silhouettes
            for j in range(9):
                lx=x+random.randint(-45,45);ly=top+random.randint(-10,60)
                b+=leaf(lx,ly,random.uniform(20,39),random.uniform(-180,180),col,stroke=col)
    # atmospheric mist and hanging ivy
    b+='''<path d="M0 261Q208 225 388 256Q590 226 800 253V318Q550 270 360 298Q159 264 0 299Z" fill="#c0e7b7" opacity=".2"/>'''
    for i in range(17):
        x=random.choice([random.uniform(-20,175),random.uniform(645,830)])
        b+=path(f'M{x:.1f} 0q{random.randint(-15,15)} 53 {random.randint(-15,15)} {random.randint(70,160)}','none','#2a6757',random.randint(2,4))
        for k in range(5):
            b+=leaf(x+random.randint(-18,18),20+k*20,random.uniform(12,19),random.uniform(-150,150),'#4d9761')
    return b

def make_cover():
    # Use the same assets seen at runtime to keep catalog and Qt tile visually consistent.
    bg=Image.open(OUT/'backdrop.png').convert('RGBA').resize((1024,800),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(1024,1024),(22,65,74,255))
    canvas.alpha_composite(bg,(0,60))
    d=ImageDraw.Draw(canvas,'RGBA')
    d.polygon([(410,380),(614,380),(975,1040),(25,1040)],fill=(42,144,163,255))
    for i in range(45):
        y=390+i*14;spread=(y-390)*.57
        x=512+random.uniform(-spread,spread)
        d.arc((x-31,y-6,x+37,y+7),0,165,fill=(197,250,234,int(100+i*2)),width=3)
    for name,pos,size in [
        ('tree-oak',(-165,120),(570,770)),('tree-willow',(675,115),(520,730)),
        ('rock',(80,680),(250,180)),('rock',(720,740),(285,200)),
        ('flower',(0,720),(235,260)),('fern',(820,650),(200,290))
    ]:
        img=Image.open(OUT/(name+'.png')).convert('RGBA').resize(size,Image.Resampling.LANCZOS)
        canvas.alpha_composite(img,pos)
    m=Image.open(OUT/'mupi-back.png').convert('RGBA');m.thumbnail((390,545),Image.Resampling.LANCZOS)
    canvas.alpha_composite(m,((1024-m.width)//2,490))
    # contrasted dark banner with log-like frame, crisp UI text
    td=ImageDraw.Draw(canvas,'RGBA')
    td.rounded_rectangle((138,38,886,305),radius=65,fill=(17,48,64,240),outline=(195,237,165,245),width=9)
    try:
        font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
        f1=ImageFont.truetype(font,141);f2=ImageFont.truetype(font,128)
    except OSError:
        f1=ImageFont.load_default();f2=f1
    td.text((512,75),'MuPi',font=f1,anchor='mt',fill=(255,183,82),stroke_width=6,stroke_fill=(62,64,50))
    td.text((512,199),'RUN',font=f2,anchor='mt',fill=(240,255,238),stroke_width=4,stroke_fill=(34,74,68))
    canvas.convert('RGB').resize((512,512),Image.Resampling.LANCZOS).save(BASE/'cover.png',optimize=True)
    canvas.convert('RGB').resize((256,256),Image.Resampling.LANCZOS).save(BASE/'icon.png',optimize=True)

def main():
    sprites=[
      ('mupi-back',375,455,back_mupi()),
      ('mupi-back-run-left',375,455,back_mupi(-1)),
      ('mupi-back-run-right',375,455,back_mupi(1)),
      ('mupi-tail',375,455,back_mupi(layer='tail')),
      ('mupi-body',375,455,back_mupi(layer='body')),
      *[(f'mupi-body-run-{i}',375,455,back_mupi(layer='body',frame=i)) for i in range(6)],
      ('tree-oak',345,350,oak()),
      ('tree-fir',275,330,fir()),
      ('tree-willow',360,350,willow()),
      ('fern',250,255,fern()),
      ('rock',320,260,rock()),
      ('log',340,220,log()),
      ('branch',440,215,branch()),
      ('vine',440,320,vine()),
      ('flower',255,260,flower()),
      ('mushroom',270,252,mushroom()),
      ('reeds',220,260,reeds()),
      ('splash',300,245,water_splash()),
      ('stump',320,255,stump()),
      ('basket',340,250,basket()),
      ('boot',315,240,boot()),
      ('backdrop',800,480,background()),
    ]
    for name,w,h,body in sprites:save(name,w,h,body)
    make_cover()
    print('Generated original 2D illustrated forest/river art and matching cover.')
if __name__=='__main__':
    main()