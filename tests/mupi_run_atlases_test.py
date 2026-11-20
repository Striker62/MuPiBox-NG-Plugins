"""Check every published pose rectangle and its transparent filtering gutter."""
import json
from pathlib import Path
from PIL import Image

app = Path(__file__).resolve().parents[1] / "examples/mupi-run"
layouts = json.loads((app / "tile-layout.js").read_text().split("=",1)[1].strip().removesuffix(";"))
assert len(layouts) == 7
for name, layout in layouts.items():
    with Image.open(app/"art"/(name+".ready.webp")) as page:
        alpha=page.getchannel("A")
        assert len(layout["tiles"]) == (24 if name=="mupi-running-24" else 60)
        assert max(page.size)<=2048
        for dx,dy,sx,sy,width,height in layout["tiles"]:
            assert 0<=dx<dx+width<=layout["w"] and 0<=dy<dy+height<=layout["h"]
            assert 0<sx<sx+width<page.width and 0<sy<sy+height<page.height
            crop=alpha.crop((sx-1,sy-1,sx+width+1,sy+height+1))
            assert crop.getbbox()==(1,1,width+1,height+1)
print("384 packed poses, placement bounds and filtering gutters verified")
