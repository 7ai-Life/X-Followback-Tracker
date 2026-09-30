const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');
const root = path.resolve(__dirname, '..');
(async () => {
  await fs.mkdir(path.join(root, 'extension/icons'), { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    await sharp(path.join(root, 'assets/logo.svg')).resize(size, size).png().toFile(path.join(root, `extension/icons/icon-${size}.png`));
  }
  await sharp(path.join(root, 'assets/logo.svg')).resize(512, 512).png().toFile(path.join(root, 'assets/logo-512.png'));
  // Keep HTML image entry points embedded for portable delivery.
  const htmlPath = path.join(root, 'extension/popup.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  const icon = (await fs.readFile(path.join(root, 'extension/icons/icon-128.png'))).toString('base64');
  await fs.writeFile(htmlPath, html.replace(/src="(?:LOGO_DATA|data:image\/png;base64,[^"]+)"/, `src="data:image/png;base64,${icon}"`));
  console.log('Generated 16/32/48/128 PNG icons, 512px logo, embedded popup logo.');
})();
