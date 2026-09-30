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
(() => {
  'use strict';
  if (globalThis.__xFollowbackMarker) return;
  globalThis.__xFollowbackMarker = true;
  const DEFAULTS = { enabled: true, ownHandle: '' };
  const CELL = '[data-testid="UserCell"]';
  const MARK = 'data-xfb-missing';
  const FOLLOW_BACK = /^(关注了你|關注了你|跟隨你|正在跟隨你|Follows you)$/i;
  const FOLLOWING = /^(正在关注|正在關注|跟隨中|Following)$/i;
  let settings = { ...DEFAULTS };
  let timer;
  let lastPath = location.pathname;
  let status = { active: false, reason: '正在读取页面', total: 0, missing: 0, mutual: 0, unknown: 0 };
  const pending = new WeakMap();
  const normalize = value => String(value || '').trim().replace(/^@/, '').toLowerCase();

  function profileHandle(href) {
    if (!href) return '';
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== location.origin) return '';
      return url.pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/?$/)?.[1].toLowerCase() || '';
    } catch { return ''; }
  }

  function context() {
    if (!settings.enabled) return { active: false, reason: '标记已关闭' };
    const owner = location.pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/following\/?$/)?.[1].toLowerCase();
    if (!owner) return { active: false, reason: '请打开自己的「正在关注」页面' };
    // Prefer the current account's navigation link; a manually entered handle is only a fallback.
    const navigation = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
    const own = profileHandle(navigation?.getAttribute('href')) || normalize(settings.ownHandle);
    if (!own) return { active: false, reason: '无法识别当前账号，请在扩展中填写自己的用户名' };
    if (owner !== own) return { active: false, reason: '当前是其他账号的列表；请打开自己的「正在关注」' };
    return { active: true, reason: '按页面「关注了你」标识判断', own };
  }

  function followingButton(cell) {
    return Array.from(cell.querySelectorAll('button, [role="button"]')).find(button => {
      const id = button.getAttribute('data-testid') || '';
      return id.endsWith('-unfollow') || FOLLOWING.test(button.textContent.trim());
    });
  }

  function followsYou(cell) {
    return !!cell.querySelector('[data-testid="userFollowIndicator"]') ||
      Array.from(cell.querySelectorAll('span')).some(span => {
        // Never treat words inside a biography as relationship evidence.
        if (span.closest('[data-testid="UserDescription"]')) return false;
        return FOLLOW_BACK.test(span.textContent.trim());
      });
  }

  function clear(cell) {
    cell.removeAttribute(MARK);
    cell.querySelectorAll('[data-xfb-badge]').forEach(el => el.remove());
  }

  function decorate(cell, button) {
    cell.setAttribute(MARK, 'true');
    let badge = cell.querySelector('[data-xfb-badge]');
    if (!badge) {
      badge = document.createElement('span');
      badge.setAttribute('data-xfb-badge', '');
      badge.textContent = '未回关';
      badge.title = '已关注此账号，但此卡片未显示「关注了你」。仅依据页面标识判断。';
      // Keep the follow button intact and never attach any click behavior.
      button.parentElement.insertBefore(badge, button);
    }
  }

  const observeOptions = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href', 'data-testid', 'aria-label'] };
  const observer = new MutationObserver(() => schedule());
  function scan() {
    clearTimeout(timer);
    observer.disconnect();
    try {
      const ctx = context();
      status = { ...ctx, total: 0, missing: 0, mutual: 0, unknown: 0 };
      const primary = document.querySelector('[data-testid="primaryColumn"]');
      const cells = new Set(ctx.active && primary ? primary.querySelectorAll(`section ${CELL}`) : []);
      document.querySelectorAll(`[${MARK}], [data-xfb-badge]`).forEach(el => {
        const cell = el.matches(CELL) ? el : el.closest(CELL);
        if (cell && !cells.has(cell)) clear(cell);
      });
      if (!ctx.active) return;
      if (!primary || !cells.size) status.reason = '等待正在关注列表加载；若一直无结果，页面结构可能已变化';
      for (const cell of cells) {
        const button = followingButton(cell);
        const account = Array.from(cell.querySelectorAll('a[href]')).map(a => profileHandle(a.getAttribute('href'))).find(Boolean);
        // Suggestions, unfollowed rows and skeletons are not candidates.
        if (!button || !account || account === ctx.own) { clear(cell); pending.delete(cell); continue; }
        status.total++;
        if (followsYou(cell)) { status.mutual++; clear(cell); pending.delete(cell); continue; }
        const signature = `${location.pathname}:${account}`;
        let state = pending.get(cell);
        if (!state || state.signature !== signature) {
          state = { signature, since: Date.now() };
          pending.set(cell, state);
          clear(cell);
        }
        // Allow delayed relationship labels to render before classifying an absent label.
        if (Date.now() - state.since < 900) {
          status.unknown++;
          schedule(Math.max(20, 950 - (Date.now() - state.since)));
          continue;
        }
        status.missing++;
        decorate(cell, button);
      }
    } finally { observer.observe(document.documentElement, observeOptions); }
  }
  function schedule(delay = 180) { clearTimeout(timer); timer = setTimeout(scan, delay); }

  chrome.storage.local.get(DEFAULTS, saved => { settings = { ...DEFAULTS, ...saved }; scan(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of Object.keys(DEFAULTS)) if (changes[key]) settings[key] = changes[key].newValue ?? DEFAULTS[key];
    schedule(0);
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'xfb:status') { scan(); respond(status); }
  });
  // X uses client-side navigation; pathname changes do not always trigger a DOM mutation.
  setInterval(() => {
    if (lastPath !== location.pathname) { lastPath = location.pathname; schedule(0); }
  }, 500);
})();
