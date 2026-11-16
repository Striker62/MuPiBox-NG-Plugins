#!/usr/bin/env python3
"""Offline validator and packer for MuPiBox-NG data-only theme packages."""
import argparse
import math
import json
import os
import re
import stat
import zipfile
from pathlib import Path

MAX_ARCHIVE = 24 << 20
MAX_TOTAL = 40 << 20
MAX_FILE = 16 << 20
MAX_FILES = 128
PATH = re.compile(r'^[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+$')
ID = re.compile(r'^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$')
SEMVER = re.compile(r'^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$')
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
BUILTINS = set('modern-dark pulse arcade-8bit block-world mupi-kids ark-storybook space magic dino neon-arcade neon-grid neon-grid-red lcars dreamy-pastel kawaii-pop fairy-garden moonwalk web-hero night-guardian classic football ocean vinyl rainbow'.split())
COLOR_KEYS = set('bg status panel card text muted accent accentPressed accentText accent2 line focus success warning error heading player playerEdge statusEdge statusAccent statusText statusMuted control controlPressed controlText playAccent playAccentPressed playAccentText progressTrack progressFill progressThumb queueCard queueActive queueActiveText'.split())
NUMBERS = {'radius': 2, 'statusAlpha': 1, 'cardBorder': 4, 'statusBorderWidth': 4}
BOUNDS = {
    'homeHeadingSize': (16, 30), 'homeHeadingGap': (4, 20),
    'homeCardSpacing': (8, 32), 'playerCoverRadius': (0, 2), 'navigationBackRadius': (0, 2),
    'navigationBarGap': (4, 18), 'navigationTitleSize': (14, 29),
    'mediaListSpacing': (4, 24), 'mediaListRowHeight': (78, 125),
    'mediaListTitleSize': (12, 26),
    'coverflowTiltDegrees': (0, 70), 'coverflowOverlap': (0, .65),
    'coverflowSideScale': (.7, 1), 'coverflowSideOpacity': (.55, 1),
    'coverflowSnapMs': (50, 450), 'coverflowCardRatio': (.65, 1),
}
BOOLEANS = {'light', 'pixel', 'stripe'}
FONTS = {'font', 'fallback'}
ENUMS = {
    'statusShape': {'edge','floating','icons'},
    'statusShadow': {'none','soft','deep','glow'},
    'cardBorderStyle': {'line','alternating'},
    'chromeStyle': {'glass','lcars','storybook','default'}
}
COMPONENTS = {
    'status.bar': dict(zip('background border text muted accent opacity borderWidth shape shadow'.split(),'status statusEdge statusText statusMuted statusAccent statusAlpha statusBorderWidth statusShape statusShadow'.split())),
    'media.card': dict(zip('background borderWidth borderStyle'.split(),'card cardBorder cardBorderStyle'.split())),
    'player.surface': dict(zip('background border heading'.split(),'player playerEdge heading'.split())),
    'player.progress': dict(zip('track fill thumb'.split(),'progressTrack progressFill progressThumb'.split())),
    'player.transport': dict(zip('background pressed text primary primaryPressed primaryText'.split(),'control controlPressed controlText playAccent playAccentPressed playAccentText'.split())),
    'player.queue': dict(zip('background active activeText'.split(),'queueCard queueActive queueActiveText'.split())),
    'navigation.bar': {'gap':'navigationBarGap','titleSize':'navigationTitleSize'},
    'navigation.back': {'radius':'navigationBackRadius'},
    'media.list': {'spacing':'mediaListSpacing','rowHeight':'mediaListRowHeight','titleSize':'mediaListTitleSize'},
    'player.cover': {'radius': 'playerCoverRadius'},
    'home.heading': {'size':'homeHeadingSize','gap':'homeHeadingGap'},
    'home.card': {'spacing':'homeCardSpacing'},
    'media.coverflow': dict(zip(
        'tiltDegrees overlap sideScale sideOpacity snapMs cardRatio'.split(),
        'coverflowTiltDegrees coverflowOverlap coverflowSideScale coverflowSideOpacity coverflowSnapMs coverflowCardRatio'.split()
    ))
}

class ThemeError(ValueError): pass

def check(condition, reason):
    if not condition: raise ThemeError(reason)

def asset(name, extensions):
    if not name: return
    check(isinstance(name,str) and len(name)<=200 and name.startswith('assets/') and PATH.fullmatch(name) and
          '..' not in name and not any(x.startswith('.') for x in name.split('/')) and
          Path(name).suffix.lower() in extensions, f'bad asset path: {name}')

ICONS={'navigation.back','player.play','player.pause','player.previous','player.next','player.volume','player.microphone'}
VISUAL_TARGETS = {
    'background','status.bar','navigation.bar','navigation.back','home.heading',
    'home.card','media.list','media.coverflow','player.surface',
    'player.cover','player.transport','dialog','icons',
}
VISUAL_CORNERS = {
    'status.bar','navigation.back','home.card','media.list','media.coverflow',
    'player.surface','player.cover','player.transport','dialog',
}
VISUAL_CORNER_PROPERTIES = {'topLeft','topRight','bottomRight','bottomLeft'}


def verify(manifest, theme, files):
    check(set(manifest) <= {'apiVersion','kind','id','name','version','author','description','license','extends','theme','preview'}, 'unknown manifest field')
    check(manifest.get('apiVersion')=='1' and manifest.get('kind')=='theme','wrong API version or kind')
    theme_id=manifest.get('id','')
    check(isinstance(theme_id,str) and len(theme_id)<=100 and ID.fullmatch(theme_id) and theme_id not in BUILTINS,'invalid theme id')
    check(isinstance(manifest.get('name'),str) and 0<len(manifest['name'])<=100,'invalid theme name')
    check(isinstance(manifest.get('version'),str) and SEMVER.fullmatch(manifest['version']),'invalid version')
    check(manifest.get('extends') in BUILTINS and manifest.get('theme')=='theme.json','invalid base theme or theme path')
    for field,maxlen in [('author',100),('description',500),('license',100)]:
        check(isinstance(manifest.get(field,''),str) and len(manifest.get(field,''))<=maxlen,field+' invalid')
    preview=manifest.get('preview','')
    asset(preview, {'.png','.jpg','.jpeg','.webp'})
    if preview: check(preview in files,'missing preview')
    check(set(theme)<={'tokens','components','assets','decorations','icons','visuals'},'unknown theme.json field')
    tokens=theme.get('tokens') or {}
    components=theme.get('components') or {}
    assets=theme.get('assets') or {}
    check(isinstance(tokens,dict) and isinstance(components,dict) and isinstance(assets,dict),'theme structure invalid')
    check(set(assets)<={'background','font','splash'},'unknown theme asset')
    for key,extensions in [('background',{'.png','.jpg','.jpeg','.webp'}),('splash',{'.png','.jpg','.jpeg','.webp'}),('font',{'.ttf','.otf'})]:
        val=assets.get(key,'')
        asset(val,extensions)
        if val: check(val in files,'missing asset '+val)
    resolved=dict(tokens)
    for component,properties in components.items():
        check(component in COMPONENTS and isinstance(properties,dict),'unsupported component '+component)
        for key,value in properties.items():
            token=COMPONENTS[component].get(key)
            check(token is not None, 'unsupported component property '+component+'.'+key)
            check(token not in resolved, 'duplicate theme token '+token)
            resolved[token]=value
    for key,value in resolved.items():
        if key in COLOR_KEYS:
            check(isinstance(value,str) and HEX.fullmatch(value),'invalid color '+key)
        elif key in NUMBERS:
            check(type(value) in (int,float) and 0<=value<=NUMBERS[key],'invalid numeric '+key)
        elif key in BOUNDS:
            lo, hi = BOUNDS[key]
            check(type(value) in (int,float) and lo<=value<=hi,'invalid geometry token '+key)
        elif key in BOOLEANS:
            check(type(value) is bool,'invalid boolean '+key)
        elif key in FONTS:
            check(isinstance(value,str) and 0<len(value)<=80 and not any(c in value for c in '<>\\\r\n'), 'invalid font '+key)
        elif key in ENUMS:
            check(isinstance(value,str) and value in ENUMS[key],'invalid enum '+key)
        else: raise ThemeError('unknown theme token '+key)
    decorations=theme.get('decorations',[])
    check(isinstance(decorations,list) and len(decorations)<=32,'too many decorations')
    num_images=0
    for i,d in enumerate(decorations):
        check(isinstance(d,dict) and set(d)<={'type','x','y','width','height','color','opacity','rotation','asset'},
              'unknown decoration properties')
        kind=d.get('type')
        check(kind in ('rect','ellipse','image'),'invalid decoration type')
        for key,lo,hi in (('x',-200,800),('y',-200,480),
                          ('width',4,800),('height',4,480),('rotation',-180,180),
                          ('opacity',0,.8)):
            if key not in d and key in ('rotation','opacity'):continue
            val=d.get(key)
            check(type(val) in (int,float) and lo<=val<=hi,
                  f'invalid decoration {i}.{key}')
        if kind=='image':
            num_images+=1
            check(num_images<=6 and not d.get('color'),'too many images or image has color')
            image=d.get('asset')
            asset(image,{'.png','.jpg','.jpeg','.webp'})
            check(bool(image) and image in files,'missing decoration image')
        else:
            check(not d.get('asset') and isinstance(d.get('color'),str) and HEX.fullmatch(d['color']),
                  'geometric decoration requires a color and no image asset')
    icons=theme.get('icons',{})
    check(isinstance(icons,dict) and len(icons)<=len(ICONS),'invalid icons map')
    for slot,image in icons.items():
        check(slot in ICONS,'unknown icon slot '+slot)
        asset(image,{'.png','.webp'})
        check(bool(image) and image in files,'missing icon image for '+slot)
    visuals=theme.get('visuals',{})
    check(isinstance(visuals,dict) and len(visuals)<=len(VISUAL_TARGETS),'invalid visual styles map')
    for target,style in visuals.items():
        check(target in VISUAL_TARGETS and isinstance(style,dict),
              'unsupported visual target '+target)
        allowed={'opacity'}
        if target in VISUAL_CORNERS:
            allowed|=VISUAL_CORNER_PROPERTIES|{'borderWidth','borderColor'}
        check(set(style)<=allowed,'unsupported visual style property '+target)
        for key,value in style.items():
            if key=='borderColor':
                check(isinstance(value,str) and HEX.fullmatch(value),'invalid border color')
            else:
                high=1 if key=='opacity' else 8 if key=='borderWidth' else 80
                check(type(value) in (int,float) and math.isfinite(value) and 0<=value<=high,
                      'visual style outside bounds: '+target+'.'+key)
    return manifest

def validate(archive):
    with zipfile.ZipFile(archive) as z:
        entries=z.infolist()
        check(len(entries)<=MAX_FILES,'too many files')
        names=set()
        total=0
        for entry in entries:
            name=entry.filename
            check(PATH.fullmatch(name) and '..' not in name and name.lower() not in names,'invalid or duplicate path '+name)
            check(Path(name).suffix.lower() in {'.json','.png','.jpg','.jpeg','.webp','.ttf','.otf','.txt','.md'},'unsupported extension')
            check(not (entry.flag_bits & 1),'encrypted archive')
            check((entry.external_attr >> 16) & 0o170000 in (0,stat.S_IFREG),'nonregular file')
            check(entry.file_size<=MAX_FILE,'file too large')
            total+=entry.file_size
            check(total<=MAX_TOTAL,'archive uncompressed size exceeded')
            check(entry.compress_size==0 or entry.file_size//entry.compress_size<=200,'suspicious compression ratio')
            names.add(name.lower())
        check({'manifest.json','theme.json'} <= set(e.filename for e in entries),'missing metadata')
        manifest=json.loads(z.read('manifest.json'))
        theme=json.loads(z.read('theme.json'))
        result=verify(manifest,theme,set(e.filename for e in entries))
        for decoration in theme.get('decorations',[]):
            if decoration['type']=='image':
                check(z.getinfo(decoration['asset']).file_size<=3<<20,'decoration image exceeds 3 MiB')
        for slot,image in theme.get('icons',{}).items():
            check(z.getinfo(image).file_size<=512<<10,'icon file exceeds 512 KiB')
        return result

def pack(folder,output):
    folder=Path(folder)
    paths=sorted(x for x in folder.rglob('*') if x.is_file())
    check(not any(x.is_symlink() for x in folder.rglob('*')),'symlinks forbidden')
    output=Path(output)
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in paths:
            z.write(path,path.relative_to(folder).as_posix())
    try: return validate(output)
    except Exception:
        output.unlink(missing_ok=True)
        raise

def main():
    cli=argparse.ArgumentParser(description=__doc__)
    sub=cli.add_subparsers(dest='command',required=True)
    for name in ('validate','pack'):sub.add_parser(name)
    sub.choices['validate'].add_argument('archive')
    sub.choices['pack'].add_argument('source')
    sub.choices['pack'].add_argument('output')
    args=cli.parse_args()
    try:
        item=validate(args.archive) if args.command=='validate' else pack(args.source,args.output)
        print('Valid .mupitheme:',item['id'],'v'+item['version'])
    except (ThemeError,ValueError,zipfile.BadZipFile,OSError) as e:
        cli.exit(1,'INVALID THEME: '+str(e)+'\n')

if __name__=='__main__':main()
