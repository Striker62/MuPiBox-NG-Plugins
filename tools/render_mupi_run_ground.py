"""Render tileable overhead materials; the game projects these from world space."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

ART = Path(__file__).resolve().parents[1] / "examples/mupi-run/art"
rng = np.random.default_rng(1471)
H, W = 512, 1024
yy, xx = np.indices((H, W))
u = (xx + .5 - W / 2) / (W / 4.8)
theta = yy * (2 * np.pi / H)


def noise(sigma):
    n = gaussian_filter(rng.normal(size=(H, W)), sigma, mode="wrap")
    return n / n.std()


def material(color, relief, tint=(1, .9, .65)):
    return np.array(color) + relief[:, :, None] * np.array(tint)


def overlay(a, b, weight):
    w = np.clip(weight, 0, 1)[:, :, None]
    return a * (1 - w) + b * w


def main():
    gravel = noise(.65) * 7 + noise(2.4) * 5 + noise(14) * 5
    dapple = np.maximum(0, noise(33) * 9 + noise(10) * 3)
    moss = material((60, 81, 48), gravel + noise(7) * 8 + dapple)
    dirt = material((148, 115, 76), gravel + dapple + noise(40) * 6)
    water = material((63, 135, 132), gravel * .42 + noise(19) * 5 + dapple * .85)
    # Submerged cobbles remain visible through shallow green water.
    bed = Image.fromarray(np.uint8(np.clip(water, 0, 255)))
    brush = ImageDraw.Draw(bed, "RGBA")
    for _ in range(1500):
        x, y = int(rng.integers(W)), int(rng.integers(H))
        radius = int(rng.integers(2, 13))
        aspect = rng.uniform(.44, .80)
        light = int(rng.integers(-18, 20))
        box = (x-radius, y-radius*aspect, x+radius, y+radius*aspect)
        brush.ellipse(box, fill=(69+light, 102+light, 82+light, int(rng.integers(50, 122))))
        brush.arc(box, 198, 290, fill=(201, 209, 153, 85), width=max(1,radius//4))
    water = np.asarray(bed).astype(float)
    for i in range(3):
        ripples = np.cos(theta * (8 + i * 3) + np.sin(xx / (23 + i * 8) + i) * 2.4 + noise(14) * .5)
        water += (np.maximum(0, ripples - .78) * 45)[:, :, None] * [1.15, 1, .78]
    width = 1 + .033 * np.sin(theta * 2) + .013 * np.sin(theta * 5 + u * 2)
    bank = np.abs(u) - width
    edge = noise(3) * .023
    shore = material((151, 155, 104), gravel + noise(8) * 9)
    forest = overlay(dirt, moss, (bank + edge + .14) * 8)
    river = overlay(water, overlay(shore, moss, (bank + edge - .045) * 8),
                    (bank + edge + .028) * 31)
    grain = noise((1, 28)) * 6 + noise((.4, 7)) * 5 + gravel * .4
    planks = material((150, 107, 65), grain + dapple)
    row = yy % 32
    planks += ((yy // 32 * 37 % 19) - 9)[:, :, None]
    planks[row < 2] *= .34
    planks[row == 2] *= 1.28
    bridge = overlay(river, planks, (1.01 - np.abs(u)) * 100)
    for name, array in (("river", river), ("forest", forest), ("boardwalk", bridge)):
        im = Image.fromarray(np.uint8(np.clip(array, 0, 255)))
        draw = ImageDraw.Draw(im, "RGBA")
        for i in range(1600):
            x, y = int(rng.integers(W)), int(rng.integers(H))
            if name == "boardwalk" and abs(u[y,x]) < 1.01:
                continue
            r = int(rng.choice([1, 2, 2, 3, 4]))
            deep = name != "forest" and abs(u[y,x]) < .99
            draw.ellipse((x-r,y-r*.55,x+r,y+r*.55+1), fill=(34,49,37,48 if deep else 85))
            draw.line((x-r,y-r*.55,x+1,y-r*.55), fill=(224,213,160,65 if deep else 110))
        im.save(ART / f"ground-{name}.webp", quality=86, method=5)


if __name__ == "__main__":
    main()
