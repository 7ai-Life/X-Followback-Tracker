# -*- coding: utf-8 -*-
"""Package the already-built extension without runtime dependencies."""
from pathlib import Path
import json
import zipfile
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'extension/manifest.json').read_text())
paths = list(manifest['icons'].values()) + [manifest['action']['default_popup'], 'popup.js', 'popup.css']
for entry in manifest['content_scripts']:
    paths += entry['js'] + entry['css']
for item in paths:
    assert (root / 'extension' / item).is_file(), item
output = root / 'dist' / ('X-Followback-Tracker-v' + manifest['version'] + '.zip')
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file():
            archive.write(file, str(Path('X-Followback-Tracker') / file.relative_to(root)))
    for name in ['README.md', 'docs/INSTALL.md', 'docs/PRIVACY.md', 'docs/following-demo.png', 'docs/popup-preview.png']:
        archive.write(root / name, 'X-Followback-Tracker/' + name)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
print(output)
