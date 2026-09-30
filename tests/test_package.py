"""Verify the installation path and separate corresponding-source delivery."""
from pathlib import Path
import json
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'extension/manifest.json').read_text())['version']


class ReleasePackages(unittest.TestCase):
    def test_install_extracts_to_one_directly_loadable_folder(self):
        file = ROOT / 'dist' / f'X-Followback-Tracker-Install-v{VERSION}.zip'
        self.assertTrue(file.name.isascii(), 'Release asset names must use ASCII')
        with zipfile.ZipFile(file) as archive, tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(archive.testzip())
            self.assertEqual({Path(name).parts[0] for name in archive.namelist()}, {'X-Followback-Tracker 安装包'})
            archive.extractall(directory)
            folder = Path(directory) / 'X-Followback-Tracker 安装包'
            manifest = json.loads((folder / 'manifest.json').read_text())
            self.assertEqual(manifest['version'], VERSION)
            required = ['LICENSE', 'popup.js', 'popup.css', manifest['action']['default_popup']]
            required += list(manifest['icons'].values())
            for script in manifest['content_scripts']:
                required += script['js'] + script['css']
            for name in required:
                self.assertTrue((folder / name).is_file(), name)
            for excluded in ['extension', 'docs', 'assets', 'scripts', 'tests', 'node_modules', '.git', 'README.md', 'package.json']:
                self.assertFalse((folder / excluded).exists(), excluded)

    def test_corresponding_source_contains_build_inputs_and_matching_extension(self):
        file = ROOT / 'dist' / f'X-Followback-Tracker-Source-v{VERSION}.zip'
        with zipfile.ZipFile(file) as archive:
            self.assertIsNone(archive.testzip())
            prefix = 'X-Followback-Tracker-Source/'
            for name in ['LICENSE', 'assets/logo.svg', 'scripts/package.py', 'scripts/build-icons.cjs', 'package.json', 'package-lock.json', 'tests/regression.cjs', 'README.md']:
                self.assertIn(prefix + name, archive.namelist())
            for local in (ROOT / 'extension').rglob('*'):
                if local.is_file():
                    name = local.relative_to(ROOT).as_posix()
                    self.assertEqual(archive.read(prefix + name), local.read_bytes())
            for name in archive.namelist():
                self.assertNotIn('node_modules', Path(name).parts)
                self.assertNotIn('.git', Path(name).parts)
                self.assertNotIn('dist', Path(name).parts)


if __name__ == '__main__':
    unittest.main()
