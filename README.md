# X Followback Tracker

**看清每一次关注。** 在自己的 X「正在关注 / Following」列表中，给未显示「关注了你 / Follows you」的账号添加浅红背景和「未回关」标签。

由 [七乂 · 7AI Life（@7ai_Life）](https://x.com/7ai_Life) 制作。

**[下载 v1.1.3 安装包](https://github.com/7ai-Life/X-Followback-Tracker/releases/download/v1.1.3/X-Followback-Tracker-%E5%AE%89%E8%A3%85%E5%8C%85-v1.1.3.zip)** · **[完整安装教程](docs/INSTALL.md)** · [所有版本](https://github.com/7ai-Life/X-Followback-Tracker/releases) · [反馈问题](https://github.com/7ai-Life/X-Followback-Tracker/issues)

## 效果预览

以下为作者提供的真实 X 页面截图，保留上传时的原始像素，点击图片或下方链接可查看原图。截图中的扩展版本为 v1.1.0；v1.1.3 的功能与布局相同。

[![真实 X 正在关注列表中的未回关标记](docs/screenshots/x-following-markers.png)](docs/screenshots/x-following-markers.png)

[查看关注列表原图（1752 × 1288）](docs/screenshots/x-following-markers.png)

[![真实 X 页面中的扩展弹窗与统计](docs/screenshots/x-followback-popup.png)](docs/screenshots/x-followback-popup.png)

[查看扩展弹窗原图（2438 × 1360）](docs/screenshots/x-followback-popup.png)

## 3 步安装

适用于电脑上的 Chrome / Edge。普通用户不需要编程、Node.js 或 API Key。

1. **下载并解压**上面的 ZIP，将文件夹放在长期保留的位置。
2. **打开扩展管理页**：Chrome 输入 `chrome://extensions`；Edge 输入 `edge://extensions`。开启「开发者模式」，点击「加载已解压的扩展程序 / Load unpacked」。
3. **选择解压得到的 `X-Followback-Tracker 安装包` 文件夹**：直接加载这个文件夹，无需再进入子目录。安装后刷新 X，进入自己的「正在关注 / Following」列表。

浅红底和「未回关」标签出现即表示已开始工作。向下滚动会继续识别。

普通用户只下载安装包；开发者可下载 [v1.1.3 对应源码](https://github.com/7ai-Life/X-Followback-Tracker/releases/download/v1.1.3/X-Followback-Tracker-Source-v1.1.3.zip)。

遇到目录选择、权限或更新问题，请看 [详细教程与常见问题](docs/INSTALL.md)。本项目通过 GitHub 分发，尚未上架浏览器扩展商店。

## 功能

- 在自己的关注列表中标记未显示回关标识的已关注账号。
- 滚动加载、页面切换和卡片更新后自动刷新标记。
- 弹窗开关与「未回关 / 互相关注 / 已渲染关注」计数。
- 自动识别当前账号，失败时可手动填写用户名。
- 作者主页入口：[七乂 · 7AI Life](https://x.com/7ai_Life)。

## 判断范围与隐私

根据 X 页面关系标识判断，不通过官方 API 核验完整关注关系。页面加载延迟、语言或结构变化可能影响结果。计数只代表当前页面已渲染的账号，不是累计扫描或账号全部关注人数。

数据处理在本地完成；不读取 Cookie、密码或 Token；不发起关系 API 请求或上传数据；不自动关注或取关。仅保存开关和可选用户名。点击作者链接时正常打开 X 网站。权限详情见 [隐私说明](docs/PRIVACY.md)。

本工具为独立项目，与 X 官方无隶属关系。

## 开发与打包

```sh
git clone https://github.com/7ai-Life/X-Followback-Tracker.git
cd X-Followback-Tracker
npm ci
npm test
npm run check
npm run build:icons
npm run package
```

建议使用 Node.js 22.12+；打包需要 Python 3。扩展本体没有运行依赖。`dist/` 分别生成安装包和 `Source` 源码包。开发仓库仍使用 `extension/` 目录；只有安装 ZIP 中的文件夹命名为 `X-Followback-Tracker 安装包`。

| 目录 | 内容 |
| --- | --- |
| `extension/` | 可以直接安装的 Manifest V3 扩展 |
| `assets/` | SVG Logo 源文件与 PNG |
| `scripts/` | 图标生成和打包脚本 |
| `tests/` | 关系识别、动态更新与弹窗回归测试 |
| `docs/` | 安装教程、隐私说明、预览和验证记录 |

## 版本与反馈

- **v1.1.3**：安装包与源码包分开，解压安装包后直接加载唯一文件夹。
- **v1.1.2**：说明和安装教程换为作者提供的原始清晰截图。
- **v1.1.1**：采用 GPL-3.0-only，安装包包含许可证和对应源码。
- **v1.1.0**：新增 Logo、浏览器图标、品牌弹窗、作者链接和安装教程。
- **v1.0.0**：基础标记、开关、动态识别和计数。

反馈时请提供浏览器版本、扩展版本、页面语言和复现步骤。截图请先遮挡不希望公开的信息，勿提交密码、Cookie 或 Token。

## 许可证

Copyright (c) 2026 7ai-Life。

本项目自 v1.1.1 起采用 **GNU General Public License v3.0 only（GPL-3.0-only）**，完整条款见 [LICENSE](LICENSE)。允许使用、修改和商用；分发本项目或其修改版本时，应按 GPLv3 履行提供对应源码、保留版权及许可证声明等义务。仅私人修改使用不要求公开发布源码。

软件按现状提供，不提供担保；具体权利和义务以许可证正文为准。作者链接不是额外的强制展示条款。

安装包仅包含可直接加载的扩展和许可证。同一 Release 另附对应版本的 `Source` 源码包，包含 Logo 源文件、构建与打包脚本、依赖锁文件及测试源码；开发依赖使用各自的许可证，不随安装包分发。
