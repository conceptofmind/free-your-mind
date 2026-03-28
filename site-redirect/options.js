const list = document.getElementById("list");

async function render() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  list.innerHTML = "";

  blockedSites.forEach(site => {
    const li = document.createElement("li");
    li.style.marginBottom = "8px";

    const text = document.createElement("span");
    text.textContent = site + " ";

    const button = document.createElement("button");
    button.textContent = "Remove";
    button.onclick = async () => {
      const updated = blockedSites.filter(s => s !== site);
      await chrome.storage.local.set({ blockedSites: updated });
      render();
    };

    li.appendChild(text);
    li.appendChild(button);
    list.appendChild(li);
  });
}

render();