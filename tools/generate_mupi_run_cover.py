#!/usr/bin/env python3
"""Compose the actual MuPi Run catalog cover from in-game sprites and logo."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance,ImageChops
import random,math
R=Path(__file__).resolve().parents[1]; APP=R/'examples/mupi-run'; ART=APP/'art'
random.seed(3219)
W=H=1024
def art(name):return Image.open(ART/(name+'.png')).convert('RGBA')
def paste(base,name,x,y,w,h,opacity=1):
    im=art(name).resize((int(w),int(h)),Image.Resampling.LANCZOS)
    if opacity<1:im.putalpha(im.getchannel('A').point(lambda c:int(c*opacity)))
    base.alpha_composite(im,(int(x),int(y)))
def make():
    bg=Image.new('RGBA',(W,H),(24,60,56,255))
    upper=art('backdrop').resize((1024,920),Image.Resampling.LANCZOS)
    bg.alpha_composite(upper,(0,75))
    d=ImageDraw.Draw(bg,'RGBA')
    # River and luminous shore, using the same terrain and caustics as the game.
    d.polygon([(440,414),(584,414),(998,1050),(18,1050)],fill=(110,144,98,255))
    d.polygon([(463,418),(564,418),(936,1050),(86,1050)],fill=(203,196,134,255))
    d.polygon([(474,421),(551,421),(909,1050),(117,1050)],fill=(26,134,160,255))
    for i in range(80):
        y=420+i*7.9;t=i/80
        spread=30+370*t
        x=512+random.uniform(-spread,spread)
        length=random.uniform(8,48)*(t+.15)
        d.arc((x-length,y-7*t,x+length,y+11*t),5,168,
              fill=random.choice([(216,253,233,102),(245,245,174,67),(163,234,246,77)]),
              width=max(1,int(4*t)))
    water=art('water-caustics').resize((1024,880),Image.Resampling.LANCZOS)
    mask=Image.new('L',(W,H),0)
    md=ImageDraw.Draw(mask)
    md.polygon([(475,420),(548,420),(908,1024),(118,1024)],fill=182)
    layer=Image.new('RGBA',(W,H),(0,0,0,0))
    layer.alpha_composite(water,(0,144))
    layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask))
    bg.alpha_composite(layer)
    # Cinematic sunbeams from top left.
    beams=Image.new('RGBA',(W,H),(0,0,0,0));be=ImageDraw.Draw(beams,'RGBA')
    for i in range(7):
        sx=84+i*20
        be.polygon([(sx,-20),(sx+12,-20),(420+i*79,800),(325+i*79,800)],
                   fill=(255,228,144,random.randint(10,35)))
    beams=beams.filter(ImageFilter.GaussianBlur(30));bg.alpha_composite(beams)
    # Riverbank vegetation and natural wooden arch.
    paste(bg,'fallen-arch',72,336,866,375)
    paste(bg,'waterfall',799,374,300,325)
    for name,x,y,w,h in [
        ('rock',5,585,265,220),('fern',30,692,230,260),
        ('rock',770,705,305,236),('flower',750,690,275,312),
        ('fern',830,787,250,273),('flower',0,637,234,275),
        ('mushroom',80,637,186,175),('mushroom',836,601,175,167),
        ('rock',176,876,252,185),('rock',674,905,255,191)]:
        paste(bg,name,x,y,w,h)
    # Moving water splashes and mist around the running character.
    splashes=Image.new('RGBA',(W,H),(0,0,0,0));sd=ImageDraw.Draw(splashes,'RGBA')
    for i in range(95):
        x=random.gauss(518,135);y=random.gauss(855,74)
        if not 205<x<815 or not 610<y<1010:continue
        rr=random.uniform(2,12)
        col=random.choice([(231,255,251,165),(167,239,252,145),(248,252,217,180)])
        sd.ellipse((x-rr,y-rr,x+rr,y+rr),fill=col)
    splashes=splashes.filter(ImageFilter.GaussianBlur(1.2));bg.alpha_composite(splashes)
    # Near camera character rear, its six filaments and tail must remain legible.
    sheet=Image.open(APP/'source/mupi-run-24-source.png').convert('RGBA')
    character=sheet.crop((0,0,512,512)).resize((440,440),Image.Resampling.LANCZOS)
    shadow=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(shadow,'RGBA')
    d.ellipse((333,940,703,1008),fill=(1,36,50,176))
    shadow=shadow.filter(ImageFilter.GaussianBlur(18));bg.alpha_composite(shadow)
    bg.alpha_composite(character,(292,553))
    # Sparkling natural particles and bright vignette near the title.
    shine=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(shine,'RGBA')
    for i in range(110):
        x=random.uniform(50,990);y=random.uniform(310,970)
        rr=random.uniform(.8,4.8)
        d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=(255,244,168,random.randint(60,200)))
    bg.alpha_composite(shine)
    # This transparent logo is also used by the PLAYING GAME, not a separate mock-up.
    paste(bg,'logo-ui',62,19,900,292)
    rgb=bg.convert('RGB')
    rgb=ImageEnhance.Color(rgb).enhance(1.22)
    rgb=ImageEnhance.Contrast(rgb).enhance(1.10)
    rgb.resize((512,512),Image.Resampling.LANCZOS).save(APP/'cover.png',optimize=True)
    rgb.resize((256,256),Image.Resampling.LANCZOS).save(APP/'icon.png',optimize=True)
    print('Cover and icon rebuilt from actual gameplay sprites.')
if __name__=='__main__':make()