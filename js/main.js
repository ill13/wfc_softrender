// js/main.js
let TERRAIN_TYPES, LOCATIONS;
let wfc;
let softRenderer = null;

async function initApp() {
  const themeName = document.getElementById("themeSelect").value;
  const data = await DataLoader.loadTheme(themeName);
  TERRAIN_TYPES = data.TERRAIN_TYPES;
  LOCATIONS = data.LOCATIONS;
  ThemeManager.setTheme(themeName);

  const width = parseInt(document.getElementById("gridWidth").value);
  const height = parseInt(document.getElementById("gridHeight").value);
  wfc = new WaveFunctionCollapse(width, height, themeName);
  updateLegend();
  setupEventListeners();
  wfc.updateUI();

  // Initialize SoftRenderer once mapGrid exists
  const mapGrid = document.getElementById("mapGrid");
  softRenderer = new SoftRenderer(mapGrid);

  //Inside initApp(), after wfc.updateUI();
  //  const mapGrid = document.getElementById("mapGrid");
  // if (!window.softRenderer && mapGrid) {
  //   window.softRenderer = new SoftRenderer(mapGrid);
  // }
  softRenderer?.update();
}

function updateLegend() {
  const legendEl = document.getElementById("legend");
  legendEl.innerHTML = "";
  const theme = ThemeManager.current;
  Object.keys(theme.elevation).forEach((type) => {
    const visual = theme.elevation[type];
    const item = document.createElement("div");
    item.className = "legend-item";
    const tile = document.createElement("div");
    tile.className = "legend-tile";
    tile.style.backgroundColor = visual.colors[0];
    const label = document.createElement("span");
    label.textContent = visual.label;
    item.appendChild(tile);
    item.appendChild(label);
    legendEl.appendChild(item);
  });
}

function setupEventListeners() {
  // Copy Map Name Button
  document.getElementById("copyMapNameBtn").addEventListener("click", () => {
    const input = document.getElementById("mapNameInput");
    const text = input.value || input.placeholder;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        const btn = document.getElementById("copyMapNameBtn");
        const original = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(() => (btn.textContent = original), 2000);
      })
      .catch((err) => {
        console.warn("Copy failed:", err);
        alert("Could not copy to clipboard: " + err);
      });
  });

  document.getElementById("generateBtn").addEventListener("click", () => {
    const w = parseInt(document.getElementById("gridWidth").value);
    const h = parseInt(document.getElementById("gridHeight").value);
    const themeName = document.getElementById("themeSelect").value;
    wfc = new WaveFunctionCollapse(w, h, themeName);

    // ✅ Force SoftRenderer to reset canvas and redraw state
    softRenderer?.reset();

    wfc.autoGenerate();
  });

  document.getElementById("stepBtn").addEventListener("click", () => {
    if (!wfc.isGenerating) wfc.step();
  });

  document.getElementById("autoBtn").addEventListener("click", () => {
    const btn = document.getElementById("autoBtn");
    if (wfc.isGenerating) {
      wfc.isGenerating = false;
      btn.textContent = "Auto Generate";
    } else {
      btn.textContent = "Auto Step";
      wfc.autoGenerate();
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    const w = parseInt(document.getElementById("gridWidth").value);
    const h = parseInt(document.getElementById("gridHeight").value);
    const themeName = document.getElementById("themeSelect").value;
    wfc = new WaveFunctionCollapse(w, h, themeName);
    // ✅ Force SoftRenderer to reattach to new grid
    const mapGrid = document.getElementById("mapGrid");
    if (softRenderer) {
      softRenderer.gridEl = mapGrid;
      softRenderer.lastGridEl = null; // Force reset on next update
    }
    wfc.updateUI();
  });

  document.getElementById("slowBtn").addEventListener("click", () => (wfc.autoSpeed = 300));
  document.getElementById("normalBtn").addEventListener("click", () => (wfc.autoSpeed = 100));
  document.getElementById("fastBtn").addEventListener("click", () => (wfc.autoSpeed = 30));

  document.getElementById("themeSelect").addEventListener("change", async () => {
    const themeName = document.getElementById("themeSelect").value;
    const data = await DataLoader.loadTheme(themeName);
    TERRAIN_TYPES = data.TERRAIN_TYPES;
    LOCATIONS = data.LOCATIONS;
    ThemeManager.setTheme(themeName);
    const w = parseInt(document.getElementById("gridWidth").value);
    const h = parseInt(document.getElementById("gridHeight").value);
    wfc = new WaveFunctionCollapse(w, h, themeName);
    wfc.updateUI();
  });
}

// Press 'H' to hide/show base tiles (for dev)
document.addEventListener("keydown", (e) => {
  if (e.key === "h" || e.key === "H") {
    console.log("hide/unhide");
    const tiles = document.querySelectorAll(".tile");
    const isVisible = tiles[0]?.style.color !== "transparent";
    document.querySelectorAll(".tile").forEach((t) => {
      t.style.color = isVisible ? "transparent" : "";
      t.style.backgroundColor = "transparent";
    });
  }
});

// Start
document.addEventListener("DOMContentLoaded", async () => {
  await ThemeManager.loadThemes();
  initApp();
});
