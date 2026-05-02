/**
 * RTL Free — Service Worker
 * إدارة القائمة السياقية والإشعارات والشارة
 */

const STORAGE_KEY = 'rtlfree_settings';
const SCRIPT_ID_PREFIX = 'rtlfree-site-';

const DEFAULTS = {
  autoDetect: true,
  forceRTL: false,
  fontFamily: 'site',
  customFontName: '',
  fontSize: 100,
  lineHeight: 1.8,
  letterSpacing: 0,
  fontWeight: 400,
  convertNumerals: 'none',
  hideTashkeel: false,
  fixInputs: true,
  fixCode: false,
  smoothFonts: true,
  enabledSites: [],
  siteProfiles: {}
};

const FONT_CYCLE = [
  'site', 'Tajawal', 'Amiri', 'IBM Plex Sans Arabic', 'Vazirmatn'
];

async function getSettings() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULTS, ...(data[STORAGE_KEY] || {}) };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

async function getActiveHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).hostname.toLowerCase();
  } catch { return null; }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function originFromUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return `${parsed.protocol}//${parsed.hostname}/*`;
  } catch {
    return '';
  }
}

function hostFromPattern(pattern) {
  try {
    const stripped = String(pattern || '').replace(/\/\*$/, '/');
    return new URL(stripped).hostname.replace(/^\*\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function matchesEnabledSite(host, enabledSites = []) {
  return enabledSites.some(site => {
    const clean = String(site || '').trim().toLowerCase().replace(/^\*\./, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return clean && (host === clean || host.endsWith('.' + clean));
  });
}

function scriptId(kind, origin) {
  const scheme = origin.startsWith('https://') ? 'https' : 'http';
  const host = hostFromPattern(origin).replace(/[^a-z0-9_-]/gi, '-').slice(0, 80);
  return `${SCRIPT_ID_PREFIX}${kind}-${scheme}-${host}`;
}

async function grantedOriginsForEnabledSites(settings) {
  const all = await chrome.permissions.getAll();
  return [...new Set((all.origins || []).filter(origin => {
    if (!/^https?:\/\/.+\/\*$/.test(origin)) return false;
    const host = hostFromPattern(origin);
    return host && matchesEnabledSite(host, settings.enabledSites || []);
  }))];
}

async function syncContentScripts() {
  if (!chrome.scripting?.getRegisteredContentScripts) return;

  const settings = await getSettings();
  const origins = await grantedOriginsForEnabledSites(settings);
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const managedIds = registered
    .map(script => script.id)
    .filter(id => id?.startsWith(SCRIPT_ID_PREFIX));

  if (managedIds.length) {
    await chrome.scripting.unregisterContentScripts({ ids: managedIds });
  }

  if (!origins.length) return;

  const scripts = origins.flatMap(origin => ([
    {
      id: scriptId('shadow', origin),
      matches: [origin],
      js: ['force-open-shadow.js'],
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true,
      world: 'MAIN',
      persistAcrossSessions: true
    },
    {
      id: scriptId('content', origin),
      matches: [origin],
      js: ['content.js'],
      css: ['injected.css'],
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true,
      persistAcrossSessions: true
    }
  ]));

  await chrome.scripting.registerContentScripts(scripts);
}

async function injectIntoTab(tabId) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['force-open-shadow.js'],
      world: 'MAIN'
    });
    await chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      files: ['injected.css']
    });
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content.js']
    });
  } catch (e) {
    // صفحات المتصفح الداخلية وبعض صفحات المتجر لا تسمح بالحقن.
  }
}

// ============================================================
// إنشاء القائمة السياقية
// ============================================================

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'rtlfree-toggle-site',
      title: 'تفعيل/تعطيل RTL Free على هذا الموقع',
      contexts: ['page', 'selection']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-cycle-font',
      title: 'تبديل الخط العربي',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-separator',
      type: 'separator',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-increase',
      title: 'تكبير الخط',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-decrease',
      title: 'تصغير الخط',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-reset-size',
      title: 'إعادة الحجم الافتراضي',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-separator2',
      type: 'separator',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'rtlfree-options',
      title: 'الإعدادات المتقدمة',
      contexts: ['page']
    });
  });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  createContextMenus();
  await syncContentScripts();
  if (details.reason === 'install') {
    await saveSettings(DEFAULTS);
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html?welcome=1') });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  createContextMenus();
  await syncContentScripts();
});

// ============================================================
// معالج القائمة السياقية
// ============================================================

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();

  switch (info.menuItemId) {
    case 'rtlfree-toggle-site':
      await toggleSite();
      break;
    case 'rtlfree-cycle-font':
      await cycleFont();
      break;
    case 'rtlfree-increase':
      await changeSize(10);
      break;
    case 'rtlfree-decrease':
      await changeSize(-10);
      break;
    case 'rtlfree-reset-size':
      await setSize(100);
      break;
    case 'rtlfree-options':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// ============================================================
// اختصارات الكيبورد
// يمكن للمستخدم تعديلها من chrome://extensions/shortcuts
// ============================================================

chrome.commands.onCommand.addListener(async (command) => {
  const host = await getActiveHost();
  if (!host) return;

  switch (command) {
    case 'toggle-site': {
      await toggleSite();
      const settings = await getSettings();
      const nowActive = (settings.enabledSites || []).some(d => host === d || host.endsWith('.' + d));
      await showToast(nowActive ? `RTL Free مُفعَّل على ${host}` : `RTL Free مُعطَّل على ${host}`);
      break;
    }
    case 'cycle-font':
      await cycleFont();
      break;
    case 'increase-size':
      await changeSize(10);
      break;
    case 'decrease-size':
      await changeSize(-10);
      break;
  }
});

// ============================================================
// الإجراءات
// ============================================================

async function toggleSite() {
  const tab = await getActiveTab();
  const host = tab?.url ? (() => {
    try { return new URL(tab.url).hostname.toLowerCase(); } catch { return null; }
  })() : null;
  if (!host) return;

  const settings = await getSettings();
  const enabled = new Set(settings.enabledSites || []);
  const isEnabled = enabled.has(host);

  if (isEnabled) {
    enabled.delete(host);
  } else {
    const origin = originFromUrl(tab.url);
    if (!origin) return;
    const hasPermission = await chrome.permissions.contains({ origins: [origin] });
    const allowed = hasPermission || await chrome.permissions.request({ origins: [origin] });
    if (!allowed) return;
    enabled.add(host);
  }

  await saveSettings({ ...settings, enabledSites: [...enabled] });
  await syncContentScripts();
  if (!isEnabled) await injectIntoTab(tab.id);
  await updateBadge();
}

async function cycleFont() {
  const settings = await getSettings();
  const idx = FONT_CYCLE.indexOf(settings.fontFamily);
  const next = FONT_CYCLE[(idx + 1) % FONT_CYCLE.length];
  await saveSettings({ ...settings, fontFamily: next });
  await showToast(`الخط: ${next}`);
}

async function changeSize(delta) {
  const settings = await getSettings();
  const size = Math.max(60, Math.min(200, settings.fontSize + delta));
  await saveSettings({ ...settings, fontSize: size });
  await showToast(`الحجم: ${size}%`);
}

async function setSize(size) {
  const settings = await getSettings();
  await saveSettings({ ...settings, fontSize: size });
  await showToast(`الحجم: ${size}%`);
}

async function toggleForceRTL() {
  const settings = await getSettings();
  const forceRTL = !settings.forceRTL;
  await saveSettings({ ...settings, forceRTL });
  await showToast(forceRTL ? 'تم فرض RTL' : 'تم إلغاء فرض RTL');
}

async function showToast(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg) => {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = `
          position:fixed;top:20px;left:50%;transform:translateX(-50%);
          background:#1e293b;color:#fff;padding:12px 20px;
          border-radius:12px;font-size:14px;font-family:system-ui;
          z-index:2147483647;box-shadow:0 10px 40px rgba(0,0,0,.3);
          direction:rtl;opacity:0;transition:opacity .2s;
          border:1px solid rgba(255,255,255,.1);
        `;
        document.documentElement.appendChild(t);
        requestAnimationFrame(() => t.style.opacity = '1');
        setTimeout(() => {
          t.style.opacity = '0';
          setTimeout(() => t.remove(), 250);
        }, 1500);
      },
      args: [text]
    });
  } catch (e) { /* بعض الصفحات لا تسمح */ }
}

// ============================================================
// شارة الأيقونة
// ============================================================

async function updateBadge(tabId) {
  const settings = await getSettings();
  const tabs = tabId ? [{ id: tabId, url: (await chrome.tabs.get(tabId)).url }] : await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;
    let host;
    try { host = new URL(tab.url).hostname.toLowerCase(); } catch { continue; }

    const active = (settings.enabledSites || []).some(d => host === d || host.endsWith('.' + d));

    const badge = active ? 'ON' : '';
    const color = active ? '#14b8a6' : '#334155';

    try {
      await chrome.action.setBadgeText({ tabId: tab.id, text: badge });
      await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color });
    } catch { /* تجاهل */ }
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => updateBadge(tabId));
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'complete') updateBadge(tabId);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[STORAGE_KEY]) {
    syncContentScripts().catch(() => {});
    updateBadge();
  }
});

// ============================================================
// الرسائل من الصفحات
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) return;
  if (msg.type === 'rtlfree:open-options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  } else if (msg.type === 'rtlfree:get-defaults') {
    sendResponse({ defaults: DEFAULTS });
  } else if (msg.type === 'rtlfree:sync-content-scripts') {
    syncContentScripts()
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
});
