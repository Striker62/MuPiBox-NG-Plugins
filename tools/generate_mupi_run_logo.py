#!/usr/bin/env python3
"""Generate a polished original transparent MuPi RUN logo for Qt and browser."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'examples/mupi-run'
ART=APP/'art'
W,H=680,222
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def titlemask(text,size,anchor):
  im=Image.new('L',(W,H),0)
  d=ImageDraw.Draw(im)
  f=ImageFont.truetype(font,size)
  d.text(anchor,text,font=f,anchor='lt',fill=255,stroke_width=1)
  return im
def fillmask(bg,mask,top,bottom):
  grad=Image.new('RGBA',(W,H),(0,0,0,0))
  d=ImageDraw.Draw(grad)
  for y in range(H):
    t=y/H;c=tuple(round(top[i]*(1-t)+bottom[i]*t) for i in range(3))
    d.line((0,y,W,y),fill=(*c,255))
  grad.putalpha(mask)
  bg.alpha_composite(grad)
def draw():
  canvas=Image.new('RGBA',(W,H),(0,0,0,0))
  d=ImageDraw.Draw(canvas)
  # Curved wooden plaque, with watery curl around letters.
  d.rounded_rectangle((140,26,673,196),radius=66,fill=(63,49,41,215),outline=(214,156,74,245),width=9)
  d.rounded_rectangle((154,40,659,182),radius=54,outline=(242,197,113,130),width=3)
  d.arc((181,167,525,232),15,173,fill=(17,156,196,234),width=17)
  d.arc((175,167,542,219),0,165,fill=(128,235,240,220),width=7)
  for x,y,r in [(543,155,14),(571,176,8),(602,161,10),(125,158,10)]:
    d.ellipse((x-r,y-r,x+r,y+r),fill=(35,172,213,220))
    d.arc((x-r+3,y-r+3,x+r-3,y+r-3),200,323,fill=(234,255,248,190),width=3)
  # Original project mascot in small, readable icon badge.
  mascot=Image.open(ROOT/'examples/funny-mupi/assets/mupi-laugh-refined.png').convert('RGBA')
  mascot.thumbnail((200,193),Image.Resampling.LANCZOS)
  glow=Image.new('RGBA',(218,210)); gd=ImageDraw.Draw(glow)
  gd.ellipse((9,9,209,199),fill=(250,182,77,62))
  glow=glow.filter(ImageFilter.GaussianBlur(16));canvas.alpha_composite(glow,(0,8))
  canvas.alpha_composite(mascot,(max(0,(199-mascot.width)//2),max(0,(218-mascot.height)//2)))
  texts=[('MuPi',86,(209,5),(255,216,99),(246,116,30)),
         ('RUN',84,(232,99),(110,239,254),(24,137,233))]
  for word,size,(x,y),top,bottom in texts:
    mask=titlemask(word,size,(x,y))
    outline=mask.filter(ImageFilter.MaxFilter(13))
    dark=Image.new('RGBA',(W,H),(38,33,35,0));dark.putalpha(outline)
    canvas.alpha_composite(dark)
    inner=mask.filter(ImageFilter.MaxFilter(5))
    stroke=Image.new('RGBA',(W,H),(115,61,43,0));stroke.putalpha(inner)
    canvas.alpha_composite(stroke)
    shadow=Image.new('RGBA',(W,H),(0,0,0,0))
    black=Image.new('RGBA',(W,H),(31,39,49,0));black.putalpha(mask)
    shadow.alpha_composite(black,(5,7))
    canvas.alpha_composite(shadow)
    fillmask(canvas,mask,top,bottom)
    # horizontal glossy highlight just inside letters
    gloss=Image.new('RGBA',(W,H),(255,255,255,0))
    glossalpha=Image.new('L',(W,H),0)
    pd=ImageDraw.Draw(glossalpha)
    pd.rectangle((x,y+8,W,y+size*.33),fill=92)
    gloss.putalpha(ImageChops.multiply(mask,glossalpha))
    canvas.alpha_composite(gloss)
  # Frosted little decorative leaves
  d=ImageDraw.Draw(canvas)
  d.ellipse((618,12,667,65),fill=(72,164,81,235),outline=(205,246,132,220),width=4)
  d.arc((610,6,664,67),12,136,fill=(207,247,169,236),width=4)
  canvas.save(ART/'logo-ui.png',optimize=True)
  print('logo-ui.png',canvas.size,(ART/'logo-ui.png').stat().st_size)
if __name__=='__main__':draw()
