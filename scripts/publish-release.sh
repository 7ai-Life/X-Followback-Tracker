#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
repo='7ai-Life/X-Followback-Tracker'
expected_remote="https://github.com/${repo}.git"
version="$(python3 -c 'import json; print(json.load(open("extension/manifest.json"))["version"])')"
tag="v${version}"
install_asset="dist/X-Followback-Tracker-安装包-${tag}.zip"
source_asset="dist/X-Followback-Tracker-Source-${tag}.zip"
notes="docs/RELEASE-${tag}.md"

login="$(gh api user --jq .login)"
if [ "$login" != '7ai-Life' ]; then
  echo "当前 GitHub 账号为 ${login}，请切换至 7ai-Life 后重试。" >&2
  exit 1
fi
if [ "$(gh repo view "$repo" --json isPrivate --jq .isPrivate)" != 'false' ]; then
  echo '目标仓库不是公开仓库，停止发布；请先确认仓库可见性。' >&2
  exit 1
fi
if [ "$(git remote get-url origin)" != "$expected_remote" ]; then
  echo 'origin 与指定仓库不一致，停止发布。' >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo '工作区存在未提交修改，停止发布。请先审阅并提交。' >&2
  exit 1
fi
if [ "$(git branch --show-current)" != 'main' ]; then
  echo '请在 main 分支发布。' >&2
  exit 1
fi
[ -f "$notes" ]
python3 scripts/package.py
commit="$(git rev-parse HEAD)"
# Use the authenticated CLI for this push only; do not rewrite global Git settings.
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin main
if git rev-parse --verify --quiet "refs/tags/${tag}" >/dev/null; then
  if [ "$(git rev-list -n 1 "$tag")" != "$commit" ]; then
    echo "已有 ${tag} 指向不同提交，停止发布，不覆盖版本。" >&2
    exit 1
  fi
else
  git tag "$tag" "$commit"
fi
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin "refs/tags/${tag}"
# Verify access before distinguishing an existing release from a new release.
gh repo view "$repo" --json nameWithOwner --jq .nameWithOwner >/dev/null
if gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
  echo "${tag} Release 已存在，保留现有发行内容。"
else
  gh release create "$tag" "$install_asset" "$source_asset" --repo "$repo" --verify-tag \
    --title "X Followback Tracker ${tag}" --notes-file "$notes" --latest
fi
# Verify the public download and compare it with the local release package.
verify_dir="$(mktemp -d)"
trap 'rm -rf "$verify_dir"' EXIT
for asset in "$install_asset" "$source_asset"; do
  gh release download "$tag" --repo "$repo" --pattern "$(basename "$asset")" --dir "$verify_dir"
  cmp "$asset" "$verify_dir/$(basename "$asset")"
done
echo '发布成功，安装包和对应源码包均已校验。'
gh release view "$tag" --repo "$repo" --json url --jq .url
