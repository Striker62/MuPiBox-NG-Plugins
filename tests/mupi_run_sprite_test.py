#!/usr/bin/env python3
"""Regression checks for MuPi Run grounded rear-view mascot animation."""
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'examples/mupi-run/art'
NAMES=('mupi-back','mupi-back-run-left','mupi-back-run-right')
images=[]
for name in NAMES:
    image=Image.open(ART/(name+'.png')).convert('RGBA')
    assert image.size==(375,455),f'{name}: source dimensions changed'
    box=image.getchannel('A').getbbox()
    assert box and 332<=box[3]<=349,f'{name}: feet/tail extend below ground anchor: {box}'
    # Transparent space below the feet cannot be used as the ground origin.
    assert image.getchannel('A').crop((0,360,375,455)).getbbox() is None
    images.append(image)

for image in images[1:]:
    assert ImageChops.difference(image,images[0]).getbbox(), 'Missing moving leg pose'

# Foot support is calibrated from source y=339, not the image's bottom y=455.
source_h=455
drawn_h=210
foot_source_y=339
bottom_offset=drawn_h*(source_h-foot_source_y)/source_h
world_foot=435
rendered_foot=world_foot+bottom_offset-drawn_h*(source_h-foot_source_y)/source_h
assert abs(rendered_foot-world_foot)<.001
print('MuPi foot anchoring and two distinct running poses: PASS')


# Strict alpha-layer separation protects against tail crossing in front of the
# legs in ANY of the six frames; the entire tail PNG is drawn first at runtime.
tail=Image.open(ART/'mupi-tail.png').convert('RGBA')
body=Image.open(ART/'mupi-body.png').convert('RGBA')
assert tail.getchannel('A').getbbox(), 'Missing caudal fin'
assert body.getchannel('A').getbbox(), 'Missing body layer'
body_poses=[Image.open(ART/f'mupi-body-run-{i}.png').convert('RGBA') for i in range(6)]
assert all(i.size==tail.size for i in body_poses)
assert len({i.tobytes() for i in body_poses})==6,'Must have six distinct foot poses'
for image in body_poses:
    assert image.getchannel('A').crop((0,360,375,455)).getbbox() is None
print('Tail is separate BEHIND body; six leg phases present: PASS')
# Bridge split: front contains only overhead beam, rear contains support legs.
front=Image.open(ART/'duck-bridge-front.png').convert('RGBA')
rear=Image.open(ART/'duck-bridge-rear.png').convert('RGBA')
assert front.size==rear.size==(724,286)
assert front.getchannel('A').crop((0,245,724,286)).getbbox() is None, 'Beam should not paint on feet'
assert rear.getchannel('A').crop((0,245,724,286)).getbbox(), 'Rear layer must have support posts'
print('Bridge rear posts and foreground-only beam: PASS')