/*
 * X Followback Tracker
 * Copyright (c) 2026 7ai-Life
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License only.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';
const $ = id => document.getElementById(id);
const defaults = { enabled: true, ownHandle: '' };
chrome.storage.local.get(defaults, value => { $('enabled').checked = value.enabled; $('handle').value = value.ownHandle; });
$('enabled').addEventListener('change', async () => { await chrome.storage.local.set({ enabled: $('enabled').checked }); refresh(); });
$('settings').addEventListener('submit', async event => {
  event.preventDefault();
  const handle = $('handle').value.trim().replace(/^@/, '');
  if (handle && !/^[a-zA-Z0-9_]{1,15}$/.test(handle)) { $('saved').textContent = '请输入用户名，限 1–15 位字母、数字或下划线。'; return; }
  await chrome.storage.local.set({ ownHandle: handle });
  $('saved').textContent = '已保存。';
  refresh();
});
async function refresh() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'xfb:status' });
    $('status').textContent = result.reason + (result.unknown ? ` · ${result.unknown} 个等待加载` : '');
    for (const key of ['missing', 'mutual', 'total']) $(key).textContent = result.active ? result[key] : '—';
  } catch {
    $('status').textContent = '请打开 X 并刷新页面，再进入自己的「正在关注」。';
    for (const key of ['missing', 'mutual', 'total']) $(key).textContent = '—';
  }
}
refresh();
setInterval(refresh, 1500);
