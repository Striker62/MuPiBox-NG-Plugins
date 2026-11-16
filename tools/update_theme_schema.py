#!/usr/bin/env python3
"""Keep JSON Schema in step with the Python Theme SDK validator (no dependencies)."""
import json
from pathlib import Path
import mupitheme

ROOT=Path(__file__).resolve().parents[1]
target=ROOT/'schema/theme-v1.schema.json'
schema=json.loads(target.read_text())
all_tokens={}
for name in mupitheme.COLOR_KEYS:
    all_tokens[name]={'type':'string','pattern':'^#[0-9a-fA-F]{6}$'}
for name,high in mupitheme.NUMBERS.items():
    all_tokens[name]={'type':'number','minimum':0,'maximum':high}
for name,(low,high) in mupitheme.BOUNDS.items():
    all_tokens[name]={'type':'number','minimum':low,'maximum':high}
for name in mupitheme.BOOLEANS:all_tokens[name]={'type':'boolean'}
for name in mupitheme.FONTS:all_tokens[name]={'type':'string','minLength':1,'maxLength':80}
for name,values in mupitheme.ENUMS.items():all_tokens[name]={'type':'string','enum':sorted(values)}
schema['properties']['tokens']['properties']=all_tokens
schema['properties']['components']['properties']={
    name:{'type':'object','additionalProperties':False,
          'properties':{key:all_tokens[token] for key,token in properties.items()}}
    for name,properties in mupitheme.COMPONENTS.items()
}
numeric=lambda lo,hi:{'type':'number','minimum':lo,'maximum':hi}
schema['properties']['icons']={
    'type':'object','additionalProperties':False,
    'properties':{
        slot:{'type':'string','pattern':r'^assets/[a-zA-Z0-9_/-]+\.(?:png|webp)$'}
        for slot in sorted(mupitheme.ICONS)
    }
}
style_schema={
    'type':'object','additionalProperties':False,
    'properties':{
      'opacity':numeric(0,1),
      'topLeft':numeric(0,80),'topRight':numeric(0,80),
      'bottomRight':numeric(0,80),'bottomLeft':numeric(0,80),
      'borderWidth':numeric(0,8),
      'borderColor':{'type':'string','pattern':'^#[0-9a-fA-F]{6}$'}
    }
}
simple_style_schema={'type':'object','additionalProperties':False,
                     'properties':{'opacity':numeric(0,1)}}
schema['properties']['visuals']={
  'type':'object','additionalProperties':False,
  'properties':{
    target:style_schema if target in mupitheme.VISUAL_CORNERS else simple_style_schema
    for target in sorted(mupitheme.VISUAL_TARGETS)
  }
}
schema['properties']['decorations']={
 'type':'array','maxItems':32,
 'items':{'type':'object','additionalProperties':False,
  'required':['type','x','y','width','height'],
  'properties':{
   'type':{'enum':['rect','ellipse','image']},
   'x':numeric(-200,800),'y':numeric(-200,480),
   'width':numeric(4,800),'height':numeric(4,480),
   'color':{'type':'string','pattern':'^#[0-9a-fA-F]{6}$'},
   'opacity':numeric(0,0.8),'rotation':numeric(-180,180),
   'asset':{'type':'string','pattern':r'^assets/[a-zA-Z0-9_/-]+\.(?:png|jpg|jpeg|webp)$'}
  },
  'allOf':[
   {'if':{'properties':{'type':{'const':'image'}}},
    'then':{'required':['asset'],'not':{'required':['color']}}},
   {'if':{'properties':{'type':{'enum':['rect','ellipse']}}},
    'then':{'required':['color'],'not':{'required':['asset']}}}
  ]
 }
}
target.write_text(json.dumps(schema,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
print('Updated',target)
