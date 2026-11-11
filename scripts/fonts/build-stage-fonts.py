"""Build renamed WOFF2 subsets from official Source Han Serif / LXGW WenKai files.
Usage: python build-stage-fonts.py serif.otf wenkai.ttf
Requires fonttools + brotli; inputs/licenses/versions recorded in docs/STAGE-STUDIO.md.
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[2]
chars=set(''.join(p.read_text() for p in [root/'index.html',*root.glob('src/*.js')]))
chars.update(chr(n) for n in range(32,127))
for first in range(0xA1,0xF8):
    for second in range(0xA1,0xFF):
        try: chars.update(bytes([first,second]).decode('gb2312'))
        except UnicodeDecodeError: pass
for source,family in zip(sys.argv[1:],['StudioSong','StudioWenKai']):
    font=TTFont(source)
    for record in font['name'].names:
        if record.nameID in [1,4,6,16]:
            record.string=(family+'-Regular' if record.nameID==6 else family).encode(record.getEncoding(),errors='replace')
    options=subset.Options();options.flavor='woff2';options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
    builder=subset.Subsetter(options=options);builder.populate(text=''.join(chars));builder.subset(font)
    font.flavor='woff2';font.save(root/'assets'/'fonts'/(family+'-Regular.woff2'))
