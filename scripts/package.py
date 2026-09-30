# -*- coding: utf-8 -*-
"""Build separate install and corresponding-source archives."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'extension/manifest.json').read_text())
version = manifest['version']
paths = list(manifest['icons'].values()) + [manifest['action']['default_popup'], 'popup.js', 'popup.css', 'LICENSE']
for entry in manifest['content_scripts']:
    paths += entry['js'] + entry['css']
for item in paths:
    assert (root / 'extension' / item).is_file(), item

output_dir = root / 'dist'
output_dir.mkdir(exist_ok=True)
install_output = output_dir / f'X-Followback-Tracker-Install-v{version}.zip'
source_output = output_dir / f'X-Followback-Tracker-Source-v{version}.zip'


def add_file(archive, file, name):
    # Fixed ZIP metadata makes re-running a release byte-for-byte reproducible.
    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    archive.writestr(info, file.read_bytes())


with zipfile.ZipFile(install_output, 'w') as archive:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file() and '__pycache__' not in file.parts:
            name = Path('X-Followback-Tracker 安装包') / file.relative_to(root / 'extension')
            add_file(archive, file, name.as_posix())

with zipfile.ZipFile(source_output, 'w') as archive:
    for directory in ['extension', 'assets', 'scripts', 'tests', 'docs']:
        for file in sorted((root / directory).rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts:
                name = Path('X-Followback-Tracker-Source') / file.relative_to(root)
                add_file(archive, file, name.as_posix())
    for name in ['README.md', 'LICENSE', 'package.json', 'package-lock.json', '.gitignore']:
        add_file(archive, root / name, 'X-Followback-Tracker-Source/' + name)

for output in [install_output, source_output]:
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
    print(output)
