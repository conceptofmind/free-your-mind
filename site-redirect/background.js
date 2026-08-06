const REDIRECT_URL = "https://conceptofmind.bearblog.dev/taking-back-what-was-lost/";
const DEFAULTS = [
  "x.com",
  "twitter.com",
  "facebook.com",
  "reddit.com",
  "youtube.com",
  "tiktok.com",
  "instagram.com",
  "spotify.com",
  "pinterest.com"
];

let queue = Promise.resolve();

function rebuild() {
  queue = queue.then(rebuildAll).catch(console.error);
  return queue;
}

chrome.runtime.onInstalled.addListener(async () => {
  const { blockedSites } = await chrome.storage.local.get("blockedSites");
  const current = Array.isArray(blockedSites) ? blockedSites : [];
  await chrome.storage.local.set({
    blockedSites: [...new Set([...DEFAULTS, ...current])]
  });
  rebuild();
});

chrome.runtime.onStartup.addListener(rebuild);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedSites) rebuild();
});

function normalize(site) {
  return site
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

async function rebuildAll() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  const domains = [...new Set(
    blockedSites.map(normalize).filter(s => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s))
  )];

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: domains.length ? [{
      id: 1,
      priority: 1,
      action: { type: "redirect", redirect: { url: REDIRECT_URL } },
      condition: { requestDomains: domains, resourceTypes: ["main_frame"] }
    }] : []
  });

  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: ["blocklist"] });
  if (!domains.length) {
    if (scripts.length) await chrome.scripting.unregisterContentScripts({ ids: ["blocklist"] });
  } else {
    const script = {
      id: "blocklist",
      js: ["redirect.js"],
      matches: domains.flatMap(d => [`*://${d}/*`, `*://*.${d}/*`]),
      runAt: "document_start",
      persistAcrossSessions: true
    };
    if (scripts.length) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
  }

  await enforce(domains);
}

async function enforce(domains) {
  if (!domains.length) return;
  const hit = h => domains.some(d => h === d || h.endsWith("." + d));

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      if (hit(new URL(tab.url).hostname)) chrome.tabs.update(tab.id, { url: REDIRECT_URL });
    } catch {}
  }

  await chrome.browsingData.remove(
    { origins: domains.flatMap(d => [`https://${d}`, `https://www.${d}`]) },
    { serviceWorkers: true, cacheStorage: true }
  );
}