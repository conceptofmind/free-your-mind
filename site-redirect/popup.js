const input = document.getElementById("site");
const addBtn = document.getElementById("add");

function normalize(site) {
  return site
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

addBtn.addEventListener("click", async () => {
  const site = normalize(input.value);
  if (!site) return;

  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  await chrome.storage.local.set({
    blockedSites: [...new Set([...blockedSites, site])]
  });

  input.value = "";
});