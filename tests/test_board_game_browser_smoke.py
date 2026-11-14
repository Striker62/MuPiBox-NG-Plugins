"""Optional headless Chromium smoke tests (only when Chromium is installed).

Loads each new .mupiapp's HTML source via a loopback-only local server and
checks that its 800x480 board is initialized by the actual DOM runtime.
"""
import re
import shutil
import socket
import subprocess
import time
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BROWSER=shutil.which("chromium") or shutil.which("chromium-browser")
APPS={
    "mupi-muehle":("circles",48),
    "mupi-reversi":("cells",64),
    "mupi-dame":("cells",64),
    "mupi-wuerfelrennen":("circles",77),
}


@unittest.skipUnless(BROWSER,"chromium is not installed")
class BoardGamesBrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as s:
            s.bind(("127.0.0.1",0))
            port=s.getsockname()[1]
        cls.url=f"http://127.0.0.1:{port}"
        cls.server=subprocess.Popen(
            ["python3","-m","http.server",str(port),"--bind","127.0.0.1"],
            cwd=str(ROOT/"examples"),stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(.3)

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def test_board_bootstrap(self):
        for name,(kind,required) in APPS.items():
            with self.subTest(name=name):
                args=[
                    BROWSER,"--headless","--no-sandbox","--disable-gpu",
                    "--disable-dev-shm-usage","--disable-background-networking",
                    "--disable-extensions","--virtual-time-budget=700",
                    "--window-size=800,480","--dump-dom",self.url+"/"+name+"/",
                ]
                result=subprocess.run(args,capture_output=True,text=True,timeout=22)
                self.assertEqual(result.returncode,0,result.stderr[-400:])
                self.assertNotIn("Uncaught",result.stderr)
                self.assertIn('id="status"',result.stdout)
                if kind=="cells":
                    self.assertEqual(len(re.findall(r'class="cell"',result.stdout)),required)
                else:
                    self.assertGreaterEqual(result.stdout.count("<circle"),required)


if __name__=="__main__":
    unittest.main()
