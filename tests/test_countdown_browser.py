"""Real browser smoke tests in the same opaque iframe as app administration.

Run explicitly: python tests/test_countdown_browser.py --run
Set MUPIBOX_BROWSER for a nonstandard Chromium/Edge executable.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'examples/countdown'
BROWSER = os.environ.get('MUPIBOX_BROWSER') or shutil.which('chromium') or shutil.which('msedge')
if not BROWSER and Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe').exists():
    BROWSER = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
ENABLED = '--run' in sys.argv
if ENABLED:
    sys.argv.remove('--run')


@unittest.skipUnless(ENABLED and BROWSER, 'requires explicitly enabled Chromium/Edge')
class CountdownBrowserTests(unittest.TestCase):
    def run_page(self, admin, bootstrap, probe, width, height, name):
        folder = APP / 'admin' if admin else APP
        html = (folder / 'index.html').read_text(encoding='utf-8')
        html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (folder / 'style.css').read_text(encoding='utf-8') + '</style>')
        scripts = ['model.js', 'app.js'] if admin else ['mupibox-sdk.js', 'model.js', 'app.js']
        html = html.replace('<script src="' + scripts[0] + '"></script>', '<script>' + bootstrap + '</script><script src="' + scripts[0] + '"></script>')
        for script in scripts:
            html = html.replace('<script src="' + script + '"></script>', '<script>' + (folder / script).read_text(encoding='utf-8') + '</script>')
        common = """
const el=id=>document.getElementById(id);
const assert=(value,message)=>{if(!value)throw Error(message)};
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('timeout')};
"""
        html = html.replace('</body>', '<script>' + common + '\n(async()=>{try{' + probe + ";parent.postMessage('PASS','*');}catch(e){parent.postMessage('FAIL: '+e.message,'*')}})();</script></body>")
        outer = '<!doctype html><meta charset="utf-8"><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><body data-result="pending"><iframe sandbox="allow-scripts" id="app"></iframe><script>window.addEventListener("message",e=>{if(e.source===document.getElementById("app").contentWindow)document.body.dataset.result=e.data});document.getElementById("app").srcdoc=' + json.dumps(html).replace('</', '<\\/') + ';</script>'
        outputs = ROOT.parent.parent / 'outputs'
        outputs.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=outputs, ignore_cleanup_errors=True) as tmp:
            page = Path(tmp) / 'probe.html'
            page.write_text(outer, encoding='utf-8')
            result = subprocess.run([BROWSER, '--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-extensions', '--force-device-scale-factor=1', '--hide-scrollbars', '--user-data-dir=' + str(Path(tmp) / 'profile'), '--window-size=' + str(width) + ',' + str(height), '--virtual-time-budget=6000', '--dump-dom', '--screenshot=' + str(outputs / name), page.as_uri()], capture_output=True, encoding='utf-8', errors='replace', timeout=35)
            self.assertEqual(result.returncode, 0, result.stderr[-1500:])
            self.assertIn('data-result="PASS"', result.stdout[:700], result.stdout[:700] + '\n' + result.stderr[-1000:])

    def test_child_navigation_clock_pause_and_display(self):
        bootstrap = """
const events=[{id:'geburtstag',title:'Emmas Geburtstag',target:new Date(Date.now()+9*86400000).toISOString(),zone:'Europe/Berlin',theme:'birthday',mode:'sleeps',image:'',animation:true},{id:'urlaub',title:'Unser Urlaub am Meer',target:new Date(Date.now()+2*86400000+3600000).toISOString(),zone:'Europe/Berlin',theme:'travel',mode:'clock',image:'',animation:true}];
let receive;window.__MUPIBOX_BRIDGE__={invoke:async method=>{if(method==='config.get')return {value:{countdowns:events}};return {};},subscribe:fn=>{receive=fn;return ()=>{}}};
"""
        probe = """
await wait(()=>el('title').textContent==='Emmas Geburtstag');
assert(el('prev').disabled,'previous');el('next').click();await wait(()=>el('title').textContent==='Unser Urlaub am Meer');assert(el('next').disabled,'next');
assert(el('numbers').children.length===3,'clock units');
assert(document.documentElement.scrollWidth<=innerWidth,'horizontal overflow');
assert(document.body.scrollHeight<=innerHeight,'page overflow');
const content=document.querySelector('.content');assert(content.scrollHeight<=content.clientHeight,'card overflow');
el('prev').click();await wait(()=>el('title').textContent==='Emmas Geburtstag');
"""
        self.run_page(False, bootstrap, probe, 800, 480, 'Countdown-Kinderansicht.png')

    def test_admin_save_conflict_confirmation_and_upload(self):
        bootstrap = """
let stored={unrelated:'erhalten',countdowns:[]},revision='1',writes=0,fail=false;
window.MuPiBoxAdminSDK={settings:{get:async()=>({value:structuredClone(stored),revision}),set:async(value,options)=>{if(options.expectedRevision!==revision)throw Error('Konflikt');stored=structuredClone(value);revision=String(Number(revision)+1);writes++;}},files:{write:async(path,blob,options)=>{assert(path.startsWith('bilder/'),'scoped image');assert(options.expectedRevision==='','create only');if(fail)throw Error('read-only file system');return {revision:'image1'};}}};
"""
        probe = """
await wait(()=>!el('add').disabled);el('add').click();
el('title').value='Emmas Geburtstag';el('title').dispatchEvent(new Event('input'));
el('save').click();await wait(()=>writes===1&&!el('reload').disabled);assert(stored.unrelated==='erhalten','settings lost');assert(stored.countdowns.length===1,'save');
el('title').value='Geändert';el('title').dispatchEvent(new Event('input'));revision='9';el('save').click();await wait(()=>el('status').textContent.includes('anderer Stelle'));
assert(writes===1&&el('title').value==='Geändert','conflict overwrites or loses input');
el('reload').click();await wait(()=>!el('confirm').hidden);el('confirm-no').click();assert(el('title').value==='Geändert','cancel loses input');
el('reload').click();await wait(()=>!el('confirm').hidden);el('confirm-yes').click();await wait(()=>el('title').value==='Emmas Geburtstag');
el('delete').click();await wait(()=>!el('confirm').hidden);el('confirm-no').click();assert(!el('editor').hidden,'cancel deletes');
const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
const files=new DataTransfer();files.items.add(new File([blob],'test.png',{type:'image/png'}));el('image').files=files.files;el('image').dispatchEvent(new Event('change'));
fail=true;el('save').click();await wait(()=>el('status').textContent.includes('read-only'));assert(!el('save').disabled,'cannot retry failed upload');
fail=false;el('save').click();await wait(()=>writes===2&&!el('reload').disabled);assert(stored.countdowns[0].image.startsWith('bilder/'),'image not assigned');
assert(el('save').disabled,'saved still dirty');
"""
        self.run_page(True, bootstrap, probe, 1280, 1000, 'Countdown-Adminseite.png')


if __name__ == '__main__':
    unittest.main()
