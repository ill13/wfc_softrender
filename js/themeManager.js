// js/themeManager.js
class ThemeManager {
    static themes = {};
    static current = null;

    static async loadThemes() {
        const themeFiles = ['fantasy', 'cyberpunk', 'modern'];
        const promises = themeFiles.map(async name => {
            const res = await fetch(`themes/${name}.json`);
            const theme = await res.json();
            this.themes[name] = theme;
        });
        await Promise.all(promises);
        this.current = this.themes.fantasy; // default
    }

    static setTheme(dataOrName) {
    let theme = null;

    if (typeof dataOrName === 'string') {
        theme = this.themes[dataOrName];
        if (!theme) {
            console.warn(`Theme "${dataOrName}" not found`);
            return;
        }
    } else {
        theme = dataOrName;
    }

    this.current = theme;
    window.wfc?.updateUI();
    updateLegend();
}

    // ✅ ADD THIS METHOD BACK
    static getRandomColor(colors) {
        if (!colors || colors.length === 0) return "#333";
        return colors[Math.floor(Math.random() * colors.length)];
    }
}