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
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const code = fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function row(handle, badge = '', button = 'unfollow', bio = '') {
  return `<div data-testid="UserCell" id="${handle}"><a href="/${handle}">@${handle}</a>${badge}<div data-testid="UserDescription"><span>${bio}</span></div><div><button data-testid="1-${button}">${button === 'unfollow' ? '正在关注' : '关注'}</button></div></div>`;
}
function setup(rows, url = 'https://x.com/owner/following', config = {}, profile = true) {
  const dom = new JSDOM(`${profile ? '<a data-testid="AppTabBar_Profile_Link" href="/owner">我</a>' : ''}<main data-testid="primaryColumn"><section>${rows}</section></main><aside>${row('sidebar')}</aside>`, { url, runScripts: 'outside-only' });
  const w = dom.window;
  let change, message;
  w.chrome = {
    storage: { local: { get: (defaults, cb) => cb({ ...defaults, ...config }) }, onChanged: { addListener: fn => change = fn } },
    runtime: { onMessage: { addListener: fn => message = fn } }
  };
  w.eval(code);
  return { w, doc: w.document, close: () => w.close(), change: patch => change(patch, 'local'), status: () => { let result; message({ type: 'xfb:status' }, {}, value => result = value); return result; } };
}
const marked = (app, id) => app.doc.getElementById(id).hasAttribute('data-xfb-missing');

test('标记未回关，保留中英文互关，排除推荐与侧栏，防止简介误判', async () => {
  const app = setup(row('missing') + row('cn', '<span data-testid="userFollowIndicator">关注了你</span>') + row('en', '<span>Follows you</span>') + row('suggested', '', 'follow') + row('bio', '', 'unfollow', '关注了你'));
  try {
    assert.equal(marked(app, 'missing'), false);
    await wait(1400);
    assert.equal(marked(app, 'missing'), true);
    assert.equal(marked(app, 'bio'), true);
    for (const id of ['cn', 'en', 'suggested', 'sidebar']) assert.equal(marked(app, id), false);
    assert.equal(app.status().missing, 2);
    assert.equal(app.status().mutual, 2);
    assert.equal(app.status().total, 4);
    app.status(); app.status();
    assert.equal(app.doc.querySelectorAll('[data-xfb-badge]').length, 2);
  } finally { app.close(); }
});

test('动态新行、延迟回关标志、取消关注后自动更新', async () => {
  const app = setup(row('first'));
  try {
    await wait(1400);
    app.doc.getElementById('first').insertAdjacentHTML('beforeend', '<span data-testid="userFollowIndicator">关注了你</span>');
    app.doc.querySelector('section').insertAdjacentHTML('beforeend', row('newuser'));
    await wait(1500);
    assert.equal(marked(app, 'first'), false);
    assert.equal(marked(app, 'newuser'), true);
    const button = app.doc.querySelector('#newuser button');
    button.setAttribute('data-testid', '1-follow'); button.textContent = '关注';
    await wait(350);
    assert.equal(marked(app, 'newuser'), false);
  } finally { app.close(); }
});

test('虚拟列表复用节点时清除旧状态，等待新账号关系加载', async () => {
  const app = setup(row('recycled'));
  try {
    await wait(1400);
    assert.equal(marked(app, 'recycled'), true);
    app.doc.querySelector('#recycled a').setAttribute('href', '/another');
    await wait(300);
    assert.equal(marked(app, 'recycled'), false);
    app.doc.getElementById('recycled').insertAdjacentHTML('beforeend', '<span>關注了你</span>');
    await wait(1100);
    assert.equal(marked(app, 'recycled'), false);
  } finally { app.close(); }
});

test('禁用立即清除、启用恢复、SPA 离开列表清除', async () => {
  const app = setup(row('missing'));
  try {
    await wait(1400);
    app.change({ enabled: { newValue: false } }); await wait(100);
    assert.equal(marked(app, 'missing'), false);
    app.change({ enabled: { newValue: true } }); await wait(100);
    assert.equal(marked(app, 'missing'), true);
    app.w.history.pushState({}, '', '/home'); await wait(650);
    assert.equal(marked(app, 'missing'), false);
    assert.equal(app.status().active, false);
  } finally { app.close(); }
});

test('他人列表、粉丝页面及无身份页面保持不标记', async () => {
  for (const [url, profile] of [['https://x.com/other/following', true], ['https://x.com/owner/followers', true], ['https://x.com/owner/following', false]]) {
    const app = setup(row('missing'), url, {}, profile);
    try { await wait(1100); assert.equal(marked(app, 'missing'), false); assert.equal(app.status().active, false); } finally { app.close(); }
  }
});

test('手填用户名后可识别；切换登录账号时优先真实导航身份', async () => {
  const app = setup(row('missing'), 'https://x.com/OWNER/following', { ownHandle: '@owner' }, false);
  try {
    await wait(1400); assert.equal(marked(app, 'missing'), true);
    app.doc.body.insertAdjacentHTML('afterbegin', '<a data-testid="AppTabBar_Profile_Link" href="/other">我</a>');
    await wait(300); assert.equal(marked(app, 'missing'), false);
  } finally { app.close(); }
});

test('弹窗开关、用户名校验、保存和计数消息', async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(__dirname, '../extension/popup.html'), 'utf8'), { runScripts: 'outside-only' });
  const w = dom.window;
  const stored = { enabled: true, ownHandle: '' };
  w.chrome = {
    storage: { local: { get: (d, cb) => cb({ ...d, ...stored }), set: async patch => Object.assign(stored, patch) } },
    tabs: { query: async () => [{ id: 1 }], sendMessage: async () => ({ active: true, reason: '测试页面', total: 5, missing: 3, mutual: 2 }) }
  };
  try {
    w.eval(fs.readFileSync(path.join(__dirname, '../extension/popup.js'), 'utf8'));
    await wait(20);
    assert.equal(w.document.getElementById('missing').textContent, '3');
    const input = w.document.getElementById('handle');
    const form = w.document.getElementById('settings');
    input.value = 'not valid'; form.dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(stored.ownHandle, '');
    input.value = '@owner'; form.dispatchEvent(new w.Event('submit', { cancelable: true })); await wait(20);
    assert.equal(stored.ownHandle, 'owner');
    const toggle = w.document.getElementById('enabled'); toggle.checked = false; toggle.dispatchEvent(new w.Event('change')); await wait(20);
    assert.equal(stored.enabled, false);
  } finally { w.close(); }
});
