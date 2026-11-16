"""Standalone Theme SDK contract tests; no NG source or third-party libraries."""
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "tools" / "mupitheme.py"
spec = importlib.util.spec_from_file_location("mupitheme", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SAMPLE = Path(__file__).resolve().parents[1] / "examples" / "themes" / "starfield"

class ThemePackTests(unittest.TestCase):
    def test_example_package(self):
        with tempfile.TemporaryDirectory() as tmp:
            output=Path(tmp)/"out.mupitheme"
            self.assertEqual(module.pack(SAMPLE, output)["id"],"community.sternenreise")
            self.assertEqual(module.validate(output)["id"],"community.sternenreise")

    def test_bad_token(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        theme["tokens"]["bg"]=";danger"
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,theme,set(["assets/preview.png","assets/background.png"]))

    def test_bad_components_and_paths(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        theme["components"]["player.progress"]["another"]="bad"
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,theme,{"assets/preview.png","assets/background.png"})
        theme["components"]["player.progress"].pop("another")
        theme["assets"]["background"]="assets/../../root.json"
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,theme,{"assets/preview.png","assets/background.png"})

    def test_example_uses_advanced_components_and_decorations(self):
        theme=json.loads((SAMPLE/"theme.json").read_text())
        self.assertEqual(theme["components"]["media.coverflow"]["tiltDegrees"],48)
        self.assertEqual(len(theme["decorations"]),3)
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        module.verify(manifest,theme,{str(p.relative_to(SAMPLE)) for p in SAMPLE.rglob("*") if p.is_file()})

    def test_out_of_range_advanced_tokens_rejected(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        files={str(p.relative_to(SAMPLE)) for p in SAMPLE.rglob("*") if p.is_file()}
        for key,value in [('tiltDegrees',80),('overlap',.8),('snapMs',10),('cardRatio',.2)]:
            with self.subTest(key=key):
                bad=json.loads(json.dumps(theme))
                bad['components']['media.coverflow'][key]=value
                with self.assertRaises(module.ThemeError):module.verify(manifest,bad,files)

    def test_unsafe_decorations_rejected(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        files={str(p.relative_to(SAMPLE)) for p in SAMPLE.rglob("*") if p.is_file()}
        cases=[
            {'type':'image','x':1,'y':1,'width':20,'height':20,'asset':'../../etc/shadow'},
            {'type':'image','x':1,'y':1,'width':20,'height':20,'asset':'assets/nope.png'},
            {'type':'rect','x':1,'y':1,'width':20,'height':20,'color':'#AABBCC','opacity':1},
            {'type':'qml','x':1,'y':1,'width':20,'height':20,'color':'#AABBCC'},
            {'type':'ellipse','x':1,'y':1,'width':999,'height':20,'color':'#AABBCC'},
        ]
        for bad_decoration in cases:
            with self.subTest(kind=bad_decoration['type']):
                bad=json.loads(json.dumps(theme))
                bad['decorations']=[bad_decoration]
                with self.assertRaises(module.ThemeError):module.verify(manifest,bad,files)
        too_many=json.loads(json.dumps(theme))
        too_many['decorations']=theme['decorations']*11
        with self.assertRaises(module.ThemeError):module.verify(manifest,too_many,files)

    def test_action_icon_contract(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        files={str(p.relative_to(SAMPLE)) for p in SAMPLE.rglob("*") if p.is_file()}
        self.assertEqual(len(theme['icons']),4)
        self.assertEqual(theme['components']['navigation.bar']['titleSize'],21)
        self.assertEqual(theme['components']['media.list']['rowHeight'],94)
        for slot in theme['icons']:
            self.assertIn(slot,module.ICONS)
        module.verify(manifest,theme,files)
        for key in ('navigation.bar','navigation.back','media.list'):
            self.assertIn(key,module.COMPONENTS)
        for name,badPath in [
            ('arbitrary QML','assets/icons/icon.qml'),
            ('SVG unsupported','assets/icons/icon.svg'),
            ('path traversal','../../test.png'),
            ('missing file','assets/icons/absent.png')]:
            with self.subTest(name=name):
                changed=json.loads(json.dumps(theme))
                changed['icons']['player.play']=badPath
                with self.assertRaises(module.ThemeError):
                    module.verify(manifest,changed,files)
        changed=json.loads(json.dumps(theme))
        changed['icons']['system.battery']='assets/icons/play.png'
        with self.assertRaises(module.ThemeError):
            module.verify(manifest,changed,files)

    def test_bad_navigation_and_list_geometry(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        files={str(p.relative_to(SAMPLE)) for p in SAMPLE.rglob("*") if p.is_file()}
        badValues=[
            ('navigation.bar','gap',30),('navigation.bar','titleSize',9),
            ('navigation.back','radius',3),('media.list','spacing',1),
            ('media.list','rowHeight',56),('media.list','titleSize',39)
        ]
        for component,key,value in badValues:
            with self.subTest(component=component,key=key):
                altered=json.loads(json.dumps(theme))
                altered['components'][component][key]=value
                with self.assertRaises(module.ThemeError):module.verify(manifest,altered,files)

    def test_element_visual_style_validation(self):
        manifest=json.loads((SAMPLE/"manifest.json").read_text())
        theme=json.loads((SAMPLE/"theme.json").read_text())
        files={str(p.relative_to(SAMPLE)) for p in SAMPLE.rglob("*") if p.is_file()}
        self.assertEqual(theme['visuals']['home.card']['topLeft'],0)
        module.verify(manifest,theme,files)
        invalid=[
            ('home.card','opacity',1.1),
            ('home.card','topLeft',88),
            ('home.card','borderWidth',9),
            ('home.card','borderColor','red'),
            ('icons','topLeft',3),
            ('system.battery','opacity',0),
        ]
        for target,key,value in invalid:
            with self.subTest(target=target,key=key):
                t=json.loads(json.dumps(theme))
                t['visuals'].setdefault(target,{})[key]=value
                with self.assertRaises(module.ThemeError):
                    module.verify(manifest,t,files)
        schema=json.loads((MODULE.parent.parent/"schema"/"theme-v1.schema.json").read_text())
        self.assertEqual(set(schema['properties']['visuals']['properties']),module.VISUAL_TARGETS)

    def test_json_schema_matches_validator_component_registry(self):
        schema=json.loads((MODULE.parent.parent/"schema"/"theme-v1.schema.json").read_text())
        self.assertEqual(set(schema['properties']['tokens']['properties']),
                         module.COLOR_KEYS | set(module.NUMBERS) | set(module.BOUNDS)
                         | module.BOOLEANS | module.FONTS | set(module.ENUMS))
        self.assertEqual(set(schema['properties']['components']['properties']),set(module.COMPONENTS))
        self.assertIn('decorations',schema['properties'])
        self.assertEqual(set(schema['properties']['icons']['properties']),module.ICONS)
        for name,mapping in module.COMPONENTS.items():
            self.assertEqual(set(schema['properties']['components']['properties'][name]['properties']),set(mapping))

    def test_duplicate_archive_filename_and_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            target=Path(tmp)/"bad.mupitheme"
            with zipfile.ZipFile(target,'w') as z:
                z.writestr('manifest.json','{}')
                z.writestr('theme.json','{}')
                z.writestr('assets/other.js','alert("no");')
            with self.assertRaises(module.ThemeError):
                module.validate(target)
            with zipfile.ZipFile(target,'w') as z:
                z.writestr('manifest.json','{}')
                z.writestr('Manifest.json','{}')
                z.writestr('theme.json','{}')
            with self.assertRaises(module.ThemeError):
                module.validate(target)
if __name__=="__main__":unittest.main()
