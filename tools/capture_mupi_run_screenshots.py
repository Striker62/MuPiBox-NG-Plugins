#!/usr/bin/env python3
"""Capture 800x480 local-browser MuPi Run screenshots using Chromium CDP.
Usage: python3 tools/capture_mupi_run_screenshots.py
Requirements: chromium, Python requests, websockets, Pillow.
"""
import asyncio
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.request
from PIL import Image
from io import BytesIO
import websockets

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'examples/mupi-run'
PORT=9482

async def main():
    chrome=shutil.which('chromium') or shutil.which('chromium-browser')
    if not chrome:
        raise SystemExit('Chromium missing')
    profile=tempfile.mkdtemp(prefix='mupi-run-cdp-')
    proc=subprocess.Popen([
        chrome,'--headless','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--hide-scrollbars',
        '--remote-allow-origins=*',f'--remote-debugging-port={PORT}',
        f'--user-data-dir={profile}','--window-size=800,480',
        '--disable-features=Translate',f'file://{APP}/index.html'
    ],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        tabs=None
        for _ in range(80):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json',timeout=1) as response:
                    tabs=json.load(response)
                if tabs:break
            except Exception:
                await asyncio.sleep(.12)
        if not tabs: raise RuntimeError('Chromium CDP unavailable')
        tab=next((x for x in tabs if x.get('type')=='page'),None)
        if not tab:raise RuntimeError('No browser page')
        async with websockets.connect(tab['webSocketDebuggerUrl'],max_size=12_000_000) as ws:
            seq=0
            async def call(method,params=None):
                nonlocal seq
                seq+=1; current=seq
                await ws.send(json.dumps({'id':current,'method':method,'params':params or {}}))
                while True:
                    response=json.loads(await ws.recv())
                    if response.get('id')==current:
                        if 'error' in response:raise RuntimeError(response['error'])
                        return response.get('result',{})
            await call('Page.enable')
            await call('Runtime.enable')
            await call('Emulation.setDeviceMetricsOverride',{'width':800,'height':480,'deviceScaleFactor':1,'mobile':False})
            # Use deterministic German labels in screenshots without changing
            # the actual MuPiBox locale handling or the game's SDK.
            await call('Page.addScriptToEvaluateOnNewDocument', {
                'source': "Object.defineProperty(navigator, 'language', {configurable:true,get:()=> 'de-DE'});"
            })
            await call('Page.navigate', {'url':f'file://{APP}/index.html'})
            await asyncio.sleep(1)
            assets=await call('Runtime.evaluate', {
                'expression':"JSON.stringify(Array.from(document.images).filter(x=>!x.complete || !x.naturalWidth).map(x=>x.src))",
                'returnByValue':True
            })
            missing=json.loads(assets['result']['value'])
            if missing:
                raise RuntimeError('Missing images: '+str(missing))
            async def capture(filename):
                response=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
                raw=base64.b64decode(response['data'])
                im=Image.open(BytesIO(raw)).convert('RGB')
                im.save(APP/filename,format='WEBP',quality=83,method=5)
                print(filename,im.size,len(raw),'->', (APP/filename).stat().st_size)
            await capture('screenshot-start.webp')
            await call('Runtime.evaluate',{'expression':'document.getElementById("primary").click();'})
            await asyncio.sleep(3.4)
            await capture('screenshot-game.webp')
            # Prove the browser actually renders the new 24-frame sprite sheet.
            before=await call('Runtime.evaluate',{
                'expression':'JSON.stringify(window.__MuPiRunPreview.snapshot())',
                'returnByValue':True
            })
            snap_a=json.loads(before['result']['value'])
            assert snap_a['usingUserSheet'], 'Game fell back instead of displaying the uploaded sheet'
            await asyncio.sleep(.22)
            after=await call('Runtime.evaluate',{
                'expression':'JSON.stringify(window.__MuPiRunPreview.snapshot())',
                'returnByValue':True
            })
            snap_b=json.loads(after['result']['value'])
            assert snap_a['sheetFrame'] != snap_b['sheetFrame'], '24-frame sheet never advances'
            print('Real 24-frame sprite sheet in Chrome:',snap_a['sheetFrame'],'to',snap_b['sheetFrame'])
            await call('Runtime.evaluate',{'expression':"document.dispatchEvent(new KeyboardEvent('keydown', {code:'ArrowUp', key:'ArrowUp', bubbles:true}));"})
            await asyncio.sleep(.24)
            await capture('screenshot-jump.webp')
            # These are real Canvas renders of deterministic playable scenes,
            # not AI concept imagery or composited screenshots.
            async def scene(distance, obstacles, lane=0, mode='running'):
                source="window.__MuPiRunPreview.setScene(" + json.dumps(distance) + "," + json.dumps(obstacles) + "," + json.dumps(lane) + "," + json.dumps(mode) + ")"
                check=await call('Runtime.evaluate', {'expression':source,'returnByValue':True})
                assert check.get('result',{}).get('value') is True, check
                await asyncio.sleep(.1)
            await scene(122,[{'lane':None,'item':'low-bridge','kind':'duck','z':17}],0,'duck')
            await capture('screenshot-duck-bridge.webp')
            await scene(122,[{'lane':None,'item':'low-bridge','kind':'duck','z':1.2}],0,'duck')
            await capture('screenshot-bridge-passing.webp')
            await scene(260,[{'lane':0,'item':'stump','kind':'avoid','z':25}],1,'running')
            await capture('screenshot-boardwalk.webp')
            await scene(248,[],0,'running')
            await capture('screenshot-ground-contact.webp')
            await scene(418,[{'lane':0,'item':'stepping-stones','kind':'jump','z':26}],0,'jump')
            await capture('screenshot-forest.webp')
            result=await call('Runtime.evaluate',{'expression':'JSON.stringify({phase:window.MuPiRun && document.querySelector("#overlay").classList.contains("hidden"),score:document.querySelector("#distance").textContent,loaded:document.querySelector("#world").width})','returnByValue':True})
            print('Browser state:',result.get('result',{}).get('value','unknown'))
    finally:
        proc.terminate()
        try:proc.wait(timeout=3)
        except subprocess.TimeoutExpired:proc.kill()
        shutil.rmtree(profile,ignore_errors=True)

if __name__=='__main__':
    asyncio.run(main())