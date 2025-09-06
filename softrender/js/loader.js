// js/loader.js
class DataLoader {
  static async loadTheme(themeName) {
    const res = await fetch(`themes/${themeName}.json`);
    const theme = await res.json();

    // Extract terrain rules and weights
    const TERRAIN_TYPES = {};
    Object.keys(theme.elevation).forEach((type) => {
      TERRAIN_TYPES[type] = {
        weight: theme.elevation[type].weight || 1,
        adjacent: theme.elevation[type].adjacent || [],
        colors: theme.elevation[type].colors || ["#333"],
      };
    });

    const LOCATIONS = Object.entries(theme.locations).map(([id, loc]) => ({
      id,
      ...loc,
    }));
    const TEMPLATES = theme.templates || {};

    return { TERRAIN_TYPES, LOCATIONS, TEMPLATES, THEME: theme };
  }
}
