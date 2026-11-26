"""Regression for the real opaque-origin admin iframe (no modals/forms)."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BROWSER = shutil.which("chromium") or shutil.which("chromium-browser")


@unittest.skipUnless(BROWSER and os.environ.get("MUPIBOX_RUN_BROWSER_SMOKE") == "1",
                     "requires explicitly enabled Chromium")
class BookAdminBrowserTest(unittest.TestCase):
    def test_create_and_confirm_trash_in_sandbox(self):
        app = ROOT / "examples/Buecherkiste/admin"
        html = (app / "index.html").read_text().replace('<link rel="stylesheet" href="style.css">', "")
        script = (app / "app.js").read_text()
        mock = """
const db = new Map();
let fail = true, writes = 0, trashes = 0;
window.MuPiBoxAdminSDK = {files:{
 list: async path => ({entries:path==='books' ? [...db.keys()].map(p=>({
  isDir:true,name:p.split('/')[1]})) : []}),
 read: async path => {if(!db.has(path)) throw Error('not found');
  return {blob:new Blob([db.get(path)]),revision:'r1'};},
 write: async (path,blob,opts) => {
  if(fail) {fail=false;throw Error('read-only file system');}
  if(opts.expectedRevision!==''||path!=='books/uber-mupi/book.json')throw Error('bad write');
  db.set(path,await blob.text());writes++;return {revision:'r1'};
 },
 trash: async (path,opts) => {
  if(path!=='books/uber-mupi'||opts.confirmName!=='uber-mupi')throw Error('bad trash');
  db.clear();trashes++;
 }
}};
const el=id=>document.getElementById(id);
const assert=(v,msg)=>{if(!v)throw Error(msg)};
const wait=async predicate=>{for(let i=0;i<100;i++){
 if(predicate())return;await new Promise(r=>setTimeout(r,20));
}throw Error('timeout: '+el('state').textContent)};
"""
        probe = """
(async()=>{
 try{
  await wait(()=>el('state').textContent.includes('vorhanden'));
  el('create').click();assert(!el('new-book').hidden,'new book form missing');
  el('new-title').value='Über MuPi';el('new-title').dispatchEvent(new Event('input'));
  assert(el('new-slug').value==='uber-mupi','slug');
  el('new-submit').click();
  await wait(()=>el('state').textContent.includes('read-only')&&!el('new-submit').disabled);
  assert(!el('new-book').hidden&&writes===0,'failure loses form');
  el('new-submit').click();
  await wait(()=>el('state').textContent.includes('Neues Buch angelegt'));
  assert(writes===1&&!el('editor').hidden&&el('new-book').hidden,'create');
  assert(JSON.parse(db.values().next().value).title==='Über MuPi','metadata');
  el('trash').click();assert(el('confirm-dialog').open,'trash dialog missing');
  assert(el('confirm-submit').disabled,'unsafe confirmation');
  el('confirm-cancel').click();
  await wait(()=>el('state').textContent.includes('abgebrochen'));
  assert(trashes===0,'cancel deleted');
  el('trash').click();el('confirm-id').value='uber-mupi';
  el('confirm-id').dispatchEvent(new Event('input'));
  assert(!el('confirm-submit').disabled,'valid confirmation disabled');
  el('confirm-submit').click();
  await wait(()=>el('state').textContent.includes('in den Papierkorb verschoben'));
  assert(trashes===1&&!el('empty').hidden,'trash');
  parent.postMessage('PASS','*');
 }catch(e){parent.postMessage('FAIL: '+e.message,'*')}
})();
"""
        html = html.replace('<script src="app.js"></script>',
                            "<script>" + mock + script + "\n" + probe + "</script>")
        outer = ("<!doctype html><body data-result='pending'>"
                 "<iframe sandbox='allow-scripts' id='app'></iframe><script>"
                 "window.addEventListener('message',e=>{if(e.source===document.getElementById('app').contentWindow)"
                 "document.body.dataset.result=e.data});"
                 "document.getElementById('app').srcdoc=" +
                 json.dumps(html).replace("</", "<\\/") + ";</script>")
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "probe.html"
            p.write_text(outer)
            run = subprocess.run([BROWSER, "--headless", "--no-sandbox", "--disable-gpu",
                                  "--disable-dev-shm-usage", "--disable-background-networking",
                                  "--disable-site-isolation-trials",
                                  "--virtual-time-budget=8000", "--dump-dom", p.as_uri()],
                                 capture_output=True, text=True, timeout=25)
        self.assertEqual(run.returncode, 0, run.stderr[-1000:])
        self.assertIn('data-result="PASS"', run.stdout[:500], run.stdout[:500] + "\n" + run.stderr[-2500:])


if __name__ == "__main__":
    unittest.main()
