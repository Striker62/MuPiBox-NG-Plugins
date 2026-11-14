#!/usr/bin/env python3
"""Reproducible art for MuPiBox 416x325 coverflow covers.
Uses project-owned original MuPi mascot art, new geometric scenes, no external images."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"examples/chess/web/cover.jpg"
SIZE=(416,325)
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SCENES={
 "mupi-beatbox":("BeatBox",(30,69,109),(79,30,87)),
 "mupi-soundquiz":("Soundquiz",(28,95,144),(87,54,102)),
 "mupi-muehle":("Mühlenmeister",(19,109,104),(82,66,54)),
 "mupi-reversi":("Reversi",(32,93,115),(66,63,100)),
 "mupi-dame":("Dame-Duell",(67,80,131),(134,57,73)),
 "mupi-links":("Links",(25,93,150),(84,55,120)),
 "mupi-homeassistant":("Home Assistant",(31,119,112),(101,71,105)),
 "mupi-rhythm":("RHYTHM",(17,49,110),(96,20,89)),
 "mupi-wuerfelrennen":("Würfelrennen",(15,119,130),(24,65,106)),
 "mupi-hnefatafl":("Hnefatafl",(62,113,146),(158,77,62)),
}
def rounded(d,xy,radius,fill,outline=None,width=1):
 d.rounded_rectangle(xy,radius=radius,fill=fill,outline=outline,width=width)
def title(d,text):
 # Deep wooden title sign and glossy text, echoing the MuPi chess cover.
 rounded(d,(137,11,408,96),19,"#49291c","#e3a94b",5)
 rounded(d,(141,16,404,92),16,"#77411e","#ba7a38",2)
 f=ImageFont.truetype(FONT,43); d.text((270,15),"MuPi",font=f,anchor="mt",
    fill="#ffdf76",stroke_width=3,stroke_fill="#3b1d12")
 size=40
 f=ImageFont.truetype(FONT,size)
 while d.textbbox((0,0),text,font=f)[2]>247 and size>21:
  size-=2
  f=ImageFont.truetype(FONT,size)
 d.text((272,57),text,font=f,anchor="mt",fill="#fff7df",stroke_width=3,stroke_fill="#3e1c13")
def background(top,low):
 im=Image.new("RGB",SIZE);px=im.load()
 for y in range(SIZE[1]):
  t=y/(SIZE[1]-1)
  for x in range(SIZE[0]):
   light=max(0,1-abs(x-300)/350)*12+9*sin(x/25+y/32)
   px[x,y]=tuple(max(0,min(255,int(top[c]*(1-t)+low[c]*t+light))) for c in range(3))
 return im
def scene_rhythm(d):
 # Four descending beat lanes, with glowing tiles. Large shapes, clear on 5-inch.
 colors=["#f64d89","#f6c965","#39e6be","#85a4ff"]
 rounded(d,(177,109,410,309),18,"#081b39","#64b9dc",4)
 for i,color in enumerate(colors):
  left=184+i*55
  d.rectangle((left,119,left+51,296),fill="#183153",outline="#4e789b",width=1)
  for j in range(4):
   y=125+((i*2+j*3)%7)*23
   rounded(d,(left+8,y,left+43,y+15),6,color,"#ffffff",2)
  rounded(d,(left+3,277,left+50,298),7,color,"#fff6ce",2)
 d.line((177,272,410,272),fill="#ffe49a",width=4)
 for x in range(195,400,40):
  d.ellipse((x,105,x+7,112),fill="#a8eeff")
def scene_dice(d):
 colors=["#ec6985","#fbc96b","#56d2ae","#879dff"]
 rounded(d,(180,107,408,312),16,"#0e3445","#cbefb3",4)
 for i in range(52):
  a=-pi/2+2*pi*i/52
  x=295+91*cos(a);y=208+81*sin(a)
  fill=colors[i//13] if i%13<3 else "#e3d5a2"
  rounded(d,(int(x)-9,int(y)-9,int(x)+9,int(y)+9),4,fill,"#385667",1)
 for i in range(4):
  a=pi*i/2-pi/4;x=295+48*cos(a);y=208+48*sin(a)
  d.ellipse((x-13,y-13,x+13,y+13),fill=colors[i],outline="#ffffff",width=3)
 rounded(d,(278,190,310,225),7,"#fff4d1","#9c702d",3)
 for x,y in [(287,199),(300,199),(293,207),(287,216),(300,216)]:
  d.ellipse((x-2,y-2,x+2,y+2),fill="#473825")
def scene_tafl(d):
 rounded(d,(179,111,405,313),10,"#6b432e","#efcb7b",4)
 # 11 x 11 classic tafl geometry, simplified vignette of a king in central danger.
 startx,starty=189,121;tile=18
 for r in range(11):
  for c in range(11):
   color="#ead2a5" if (r+c)%2==0 else "#bf9b66"
   if(r==5 and c==5)or(r in (0,10) and c in (0,10)):color="#e7ad51"
   d.rectangle((startx+c*tile,starty+r*tile,startx+(c+1)*tile-1,starty+(r+1)*tile-1),
               fill=color,outline="#87613a",width=1)
 for r,c in [(0,i) for i in range(3,8)]+[(10,i) for i in range(3,8)]+[(i,0) for i in range(3,8)]+[(i,10) for i in range(3,8)]+[(1,5),(9,5),(5,1),(5,9)]:
  x=startx+c*tile+9;y=starty+r*tile+9
  d.ellipse((x-5,y-5,x+5,y+5),fill="#344760",outline="#eddfc8",width=2)
 for r,c in [(5,3),(5,4),(5,6),(5,7),(3,5),(4,5),(6,5),(7,5),(4,4),(4,6),(6,4),(6,6)]:
  x=startx+c*tile+9;y=starty+r*tile+9
  d.ellipse((x-5,y-5,x+5,y+5),fill="#fbf1d9",outline="#8f683f",width=2)
 x=startx+5*tile+9;y=starty+5*tile+9
 d.ellipse((x-8,y-8,x+8,y+8),fill="#ffd15d",outline="#764c1e",width=2)
 d.polygon([(x-6,y-7),(x-3,y-13),(x,y-7),(x+3,y-13),(x+7,y-7)],fill="#ffe89d")
def scene_sequencer(d):
 rounded(d,(176,112,410,308),16,"#171e50","#97d7e9",4)
 colors=["#f46c95","#f9c562","#4acba9","#7999fa"]
 for r in range(4):
  for c in range(8):
   x=184+c*27;y=132+r*37
   on=(c+r)%3!=0
   rounded(d,(x,y,x+22,y+27),5,colors[r] if on else "#334764","#ffffff" if on else "#546b86",1)
 d.line((191,285,403,285),fill="#ffd96d",width=3)
def scene_quiz(d):
 rounded(d,(185,123,404,295),18,"#1e4062","#f8ce86",4)
 for c in range(6):
  x=196+c*32
  rounded(d,(x,194,x+29,274),4,"#fff6df","#3d5c74",2)
 for c in [1,3,4]:
  x=195+c*32+21
  rounded(d,(x,194,x+17,242),4,"#1c2946")
 f=ImageFont.truetype(FONT,86)
 d.text((290,145),"?",font=f,anchor="mt",fill="#ffca5c",stroke_width=3,stroke_fill="#3d2d4c")
def scene_morris(d):
 rounded(d,(184,107,405,310),16,"#183e46","#d3d59d",4)
 for a in [16,45,73]:
  d.rectangle((190+a,112+a,403-a,308-a),outline="#d6c79c",width=3)
 d.line((297,126,297,285),fill="#d6c79c",width=3)
 d.line((197,208,398,208),fill="#d6c79c",width=3)
 for x,y,color in [(206,125,"#ebca87"),(297,125,"#e5c98a"),(388,208,"#4d88c0"),
                   (297,285,"#e2bb7a"),(226,208,"#4a92c7"),(297,208,"#edc287")]:
  d.ellipse((x-8,y-8,x+8,y+8),fill=color,outline="#ffffff",width=2)
def scene_checkers(d,kind):
 rounded(d,(192,112,396,307),11,"#284c5e","#d9c28e",4)
 c=22;ox=205;oy=123
 for r in range(8):
  for col in range(8):
   x=ox+c*col;y=oy+c*r
   d.rectangle((x,y,x+c-1,y+c-1),fill="#cfb782" if (r+col)%2==0 else "#537387")
   if kind=="reversi" and (r+col)%2==0 and 1<r<6 and 1<col<6:
    d.ellipse((x+4,y+4,x+18,y+18),fill="#f8eee0" if (r+col)%4==0 else "#243549",outline="#fff",width=1)
   if kind=="dame" and (r+col)%2==1 and (r in [1,2,5,6]):
    d.ellipse((x+3,y+3,x+19,y+19),fill="#eaa869" if r<4 else "#1b3152",outline="#e3d8b8",width=2)
def scene_links(d):
 rounded(d,(187,109,408,311),14,"#1b4b6e","#b3e0f1",4)
 for j,color in enumerate(["#d0aaf6","#82d9f5","#fbc779"]):
  y=127+j*52
  rounded(d,(203,y,392,y+40),11,"#326b80","#7fbed4",2)
  d.ellipse((213,y+8,237,y+31),fill=color)
  d.line((251,y+17,358,y+17),fill="#daedf3",width=4)
  d.line((251,y+27,339,y+27),fill="#9bd4d6",width=3)
def scene_home(d):
 rounded(d,(188,114,406,305),15,"#103e55","#93d4ce",4)
 d.polygon([(225,187),(301,130),(379,187)],fill="#f6ab6f")
 rounded(d,(237,187,365,283),8,"#f1d4ac","#fff0ca",3)
 rounded(d,(293,226,326,283),3,"#8d644c")
 d.ellipse((250,204,276,228),fill="#ffe89a",outline="#b38c52",width=2)
 d.ellipse((327,203,354,230),fill="#70e7c4",outline="#167e68",width=3)
 d.line((256,294,351,294),fill="#fdf4c6",width=4)

def mascot(im):
 art=Image.open(SRC).convert("RGBA")
 # The left-hand MuPi mascot is owned by the same community project.
 crop=art.crop((0,99,175,302)).resize((191,222),Image.Resampling.LANCZOS)
 mask=Image.new("L",crop.size,0);m=ImageDraw.Draw(mask)
 m.ellipse((-32,-22,210,238),fill=255)
 mask=mask.filter(ImageFilter.GaussianBlur(12))
 im.paste(crop,(0,100),mask)
def build(slug,title_,top,low):
 im=background(top,low);d=ImageDraw.Draw(im)
 for i in range(25):
  x=(i*131+77)%420;y=(i*79+111)%320
  d.ellipse((x,y,x+2+(i%3),y+2+(i%3)),fill="#d6e9ae")
 if slug=="mupi-rhythm":scene_rhythm(d)
 elif slug=="mupi-wuerfelrennen":scene_dice(d)
 elif slug=="mupi-hnefatafl":scene_tafl(d)
 elif slug=="mupi-beatbox":scene_sequencer(d)
 elif slug=="mupi-soundquiz":scene_quiz(d)
 elif slug=="mupi-muehle":scene_morris(d)
 elif slug=="mupi-reversi":scene_checkers(d,"reversi")
 elif slug=="mupi-dame":scene_checkers(d,"dame")
 elif slug=="mupi-links":scene_links(d)
 elif slug=="mupi-homeassistant":scene_home(d)
 mascot(im);d=ImageDraw.Draw(im)
 title(d,title_)
 im.save(ROOT/"examples"/slug/"cover.png",optimize=True)
 print(slug,im.size)
if __name__=="__main__":
 for slug,(title_,a,b) in SCENES.items():build(slug,title_,a,b)
