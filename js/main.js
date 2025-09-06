// js/main.js
let TERRAIN_TYPES, LOCATIONS;
let wfc;
let watercolorOverlay = null;

async function initApp() {
    const themeName = document.getElementById("themeSelect").value;
    const data = await DataLoader.loadTheme(themeName);
    TERRAIN_TYPES = data.TERRAIN_TYPES;
    LOCATIONS = data.LOCATIONS;
    ThemeManager.setTheme(themeName);

    const width = parseInt(document.getElementById("gridWidth").value);
    const height = parseInt(document.getElementById("gridHeight").value);
    wfc = new WaveFunctionCollapse(width, height, themeName);
    const mapArea = document.querySelector(".map-area");
    const tileSize = Math.min(48, 600 / Math.max(wfc.width, height));
    watercolorOverlay = new WatercolorOverlay(mapArea, wfc.width, wfc.height, tileSize, MapNamer.stringToSeed(wfc.mapName));

    updateLegend();
    setupEventListeners();
    wfc.updateUI();
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
        // Clear old overlay
        if (window.watercolorOverlay) {
            window.watercolorOverlay.clear();
        }
        wfc = new WaveFunctionCollapse(w, h, themeName);

        // Then create new one after wfc
        const mapArea = document.querySelector(".map-area");
        const tileSize = Math.min(48, 600 / Math.max(w, h));
        const seed = MapNamer.stringToSeed(wfc.mapName);
        window.watercolorOverlay = new WatercolorOverlay(mapArea, w, h, tileSize, seed);

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
        // Clear old overlay
        if (window.watercolorOverlay) {
            window.watercolorOverlay.clear();
        }
        wfc = new WaveFunctionCollapse(w, h, themeName);
        // Then create new one after wfc
        const mapArea = document.querySelector(".map-area");
        const tileSize = Math.min(48, 600 / Math.max(w, h));
        const seed = MapNamer.stringToSeed(wfc.mapName);
        window.watercolorOverlay = new WatercolorOverlay(mapArea, w, h, tileSize, seed);

        document.getElementById("autoBtn").textContent = "Auto Generate";
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

// Start
document.addEventListener("DOMContentLoaded", async () => {
    await ThemeManager.loadThemes();
    initApp();
});
