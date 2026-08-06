const list = document.getElementById("list");

async function render() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  list.innerHTML = "";
  blockedSites.forEach(site => {
    const li = document.createElement("li");
    li.style.marginBottom = "8px";
    li.textContent = site;
    list.appendChild(li);
  });
}

chrome.storage.onChanged.addListener(render);
render();