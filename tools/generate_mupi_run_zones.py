#!/usr/bin/env python3
"""Create dedicated real MuPi Run gameplay assets: duckable bridges, stepping
stones, wooden paths and woodland trail textures. All files are original.
Dependencies: Pillow and rsvg-convert. SVG masters retained for re-editing.
"""
from pathlib import Path
import importlib.util, subprocess, random, math
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'examples/mupi-run/art'; OUT.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('mupiart',ROOT/'tools/generate_mupi_run_sprites.py')
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)
rng=random.Random(9007)
def save(name,w,h,body):
 p=OUT/(name+'.svg')
 p.write_text(A.wrap(body,w,h),encoding='utf-8')
 subprocess.run(['rsvg-convert','--format','png','-w',str(w),'-h',str(h),'-o',str(OUT/(name+'.png')),str(p)],check=True)
 print(name,(OUT/(name+'.png')).stat().st_size)
def duck_bridge(layer="all"):
 rng.seed(9007)  # exact same leaves across far, near and crossbar layers
 # Wide low-hanging beam with two wooden supports. Characters can crouch
 # beneath the center bar, which is drawn at the precise obstruction height.
 s=''
 s+=A.ellipse(360,272,320,17,'#17393f', 'opacity=".21"')
 for x,sign in ((58,-1),(664,1)):
  s+=A.path(f'M{x-17} 246Q{x-27} 178 {x-14} 96L{x+12} 90Q{x+26} 178 {x+16} 254Z','url(#wood)','#553d32',7)
  s+=A.path(f'M{x-7} 229L{x-3} 110','none','#d3a36c',4)
  for yy in (130,195):
   s+=A.path(f'M{x-20} {yy}q22 -9 43 0','none','#463d36',6)
 if layer=="rear":
  return s
 if layer=="front":
  s=""
 # Low bar across all three lanes at runner's upper-body height.
 s+=A.path('M41 112Q175 86 350 99Q521 86 684 105L688 151Q531 128 352 143Q185 133 42 155Z','url(#wood)','#4c3935',8)
 s+=A.path('M55 108Q198 101 348 117Q535 94 671 112','none','#f5c283',8,'opacity=".72"')
 s+=A.path('M62 143Q203 114 343 132Q541 114 667 145','none','#543d32',4)
 s+=A.path('M51 97Q202 68 363 84Q515 72 683 94Q658 113 613 107Q566 120 515 98Q453 114 383 101Q300 119 255 98Q177 111 107 102Z','url(#moss)')
 for i in range(97):
  x=rng.uniform(65,673); y=rng.uniform(74,118)
  s+=A.leaf(x,y,rng.uniform(5,18),rng.uniform(-155,155),rng.choice(['url(#leaf)','#9ec968','#65ab5e','#bddb77']))
 for i in range(8):
  x=140+i*63
  s+=A.path(f'M{x} 111q{-8+i%3*6} 26 3 {45+i%3*21}','none','#47865a',4)
  for j in range(3):s+=A.leaf(x+2*j,138+j*12,rng.uniform(9,15),rng.randint(-65,65))
 for x,y in [(165,94),(227,106),(475,104),(558,90)]:
  s+=A.path(f'M{x-20} {y}q-9 -25 6 -27q18 -3 17 26Z','#db8856','#805442',2)
  s+=A.path(f'M{x-19} {y-21}q10 -11 19 1','none','#fae0b7',3)
 return s
def stones():
 s=A.ellipse(181,232,166,21,'#133a4b','opacity=".27"')
 for i,(x,y,ww,hh) in enumerate([(94,162,108,83),(183,189,156,98),(287,152,117,85)]):
  s+=f'<g transform="translate({x} {y}) scale({ww/160:.3f} {hh/105:.3f})">'
  s+=A.path('M-78 64Q-78 21 -54 -16Q-16 -47 22 -38Q75 -30 82 42L68 66Q12 76 -57 70Z','url(#stone)','#3d5a60',5)
  s+=A.path('M-54 -16Q-9 -49 22 -38Q52 -32 66 -12Q32 6 -3 -9Q-29 -6 -54 -16Z','#d8cfb0','none',0,'opacity=".6"')
  s+=A.path('M-60 16Q-33 4 -23 11M18 39Q44 26 63 35','none','#3c6167',3)
  s+=A.path('M-51 -22Q-6 -55 28 -42Q61 -33 68 -8Q33 -17 18 -12Q-10 -24 -29 -4Z','url(#moss)')
  for j in range(17):
   sx=rng.randint(-48,51);sy=rng.randint(-22,0)
   s+=A.leaf(sx,sy,rng.uniform(6,15),rng.randint(-130,140),rng.choice(['#7db963','#b0d773','#5e9859']))
  s+='</g>'
 return s
def rail():
 s=A.ellipse(100,226,83,13,'#17363f','opacity=".22"')
 s+=A.path('M57 222Q48 155 62 76Q73 50 95 53Q117 54 126 78Q134 148 130 223Z','url(#wood)','#4b3b32',6)
 s+=A.path('M72 204Q70 130 78 78','none','#f2bd77',5,'opacity=".62"')
 s+=A.ellipse(95,67,41,15,'url(#bark)', 'stroke="#6b4936" stroke-width="4"')
 for yy in [115,172]:
  s+=A.path(f'M55 {yy}Q89 {yy-16} 129 {yy+4}','none','#cfb17b',8)
  s+=A.path(f'M55 {yy+5}Q92 {yy-6} 132 {yy+9}','none','#735a43',4)
 for i in range(16):
  x=rng.uniform(56,137);y=rng.uniform(65,121)
  if rng.random()<.5:s+=A.leaf(x,y,rng.uniform(6,14),rng.uniform(-150,150))
 return s
def plank_texture():
 size=512
 im=Image.new('RGB',(size,size),(100,66,47));d=ImageDraw.Draw(im)
 rr=random.Random(40115)
 # hand-patina on horizontal hardwood boards
 for n in range(8):
  y0=n*64
  c=rr.choice([(143,94,52),(152,102,57),(164,113,66),(130,82,49),(173,120,74)])
  for y in range(y0,y0+63):
   grain=(y%64)
   shading=-19 if grain<4 or grain>59 else (10 if 9<grain<17 else rr.randint(-9,9))
   r=max(0,min(255,c[0]+shading))
   g=max(0,min(255,c[1]+shading))
   b=max(0,min(255,c[2]+shading))
   d.line((0,y,size,y),fill=(r,g,b))
  d.line((0,y0,511,y0),fill=(47,38,38),width=4)
  d.line((0,y0+6,511,y0+6),fill=(223,164,100),width=1)
  d.line((0,y0+62,511,y0+62),fill=(52,36,32),width=3)
  for j in range(25):
   x=rr.randint(3,492); y=rr.randint(y0+8,y0+55)
   w=rr.randint(10,74)
   col=rr.choice([(89,60,48),(196,138,87),(123,82,55),(101,66,49)])
   d.arc((x,y,x+w,y+rr.randint(3,9)),rr.randint(0,60),rr.randint(120,180),fill=col,width=rr.randint(1,2))
  for x in (35,470):
   for dy in (18,48):
    d.ellipse((x-3,y0+dy-3,x+3,y0+dy+3),fill=(42,51,51))
    d.ellipse((x-1,y0+dy-2,x+1,y0+dy),fill=(169,167,136))
  # moss seams
  for j in range(52):
   x=rr.randint(0,512); y=y0+rr.choice([3,59])+rr.randint(-2,2)
   d.line((x,y,x+rr.randint(4,20),y+rr.choice([-1,0,1])),fill=rr.choice([(75,108,45),(105,137,52),(43,88,54)]),width=rr.choice([1,2,3]))
 im.save(OUT/'wood-deck.png',optimize=True)
def earth_texture():
 size=512; rr=random.Random(2405)
 im=Image.new('RGB',(size,size),(115,101,67));d=ImageDraw.Draw(im)
 # earthen footpath with pebble grain, dead leaves and scattered grasses
 for i in range(26000):
  x=rr.randrange(size);y=rr.randrange(size)
  w=rr.randint(1,5);h=rr.randint(1,3)
  col=rr.choice([(146,122,87),(89,82,61),(187,157,105),(102,104,71),(167,143,94),(69,91,62)])
  d.ellipse((x,y,x+w,y+h),fill=col)
 for i in range(260):
  x=rr.randint(0,size);y=rr.randint(0,size)
  rx=rr.randint(2,8);ry=rr.randint(1,6)
  d.ellipse((x-rx,y-ry,x+rx,y+ry),fill=rr.choice([(115,116,96),(174,170,135),(88,95,86)]))
  d.arc((x-rx,y-ry,x+rx,y+ry),190,305,fill=(218,204,147),width=1)
 for i in range(150):
  x=rr.randint(0,size);y=rr.randint(0,size)
  length=rr.randint(5,20)
  col=rr.choice([(171,104,48),(196,146,54),(103,123,64)])
  d.polygon([(x,y),(x+length,y-rr.randint(0,5)),(x+rr.randint(4,8),y+rr.randint(2,5))],fill=col)
 im.save(OUT/'forest-earth.png',optimize=True)
def main():
 save('duck-bridge',724,286,duck_bridge())
 save('duck-bridge-rear',724,286,duck_bridge('rear'))
 save('duck-bridge-front',724,286,duck_bridge('front'))
 save('stepping-stones',375,260,stones())
 save('rail-post',205,251,rail())
 plank_texture();earth_texture()
if __name__=='__main__':main()