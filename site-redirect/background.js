const REDIRECT_URL = "https://www.google.com/";
let syncing = false;

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(syncRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedSites) {
    syncRules();
  }
});

async function init() {
  const { blockedSites } = await chrome.storage.local.get("blockedSites");

  if (!Array.isArray(blockedSites)) {
    await chrome.storage.local.set({
      blockedSites: ["x.com", "twitter.com"]
    });
    return;
  }

  await syncRules();
}

function normalize(site) {
  return site
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

async function syncRules() {
  if (syncing) return;
  syncing = true;

  try {
    const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

    const uniqueSites = [...new Set(blockedSites.map(normalize).filter(Boolean))];

    const newRules = uniqueSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: REDIRECT_URL }
      },
      condition: {
        requestDomains: [site],
        resourceTypes: ["main_frame"]
      }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map(rule => rule.id),
      addRules: newRules
    });
  } finally {
    syncing = false;
  }
}