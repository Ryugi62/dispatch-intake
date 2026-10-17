import sys, os
from PIL import Image
names = sys.argv[2:]
out = sys.argv[1]
w, h = 960, 540
cols = 2
rows = (len(names) + 1) // 2
im = Image.new('RGB', (w * cols, h * rows), 'white')
for i, n in enumerate(names):
    f = Image.open(os.path.join(os.path.dirname(__file__), 'frames', n + '.png')).convert('RGB').resize((w, h))
    im.paste(f, ((i % cols) * w, (i // cols) * h))
im.save(out)
