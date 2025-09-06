// js/classes/MapNamer.js
class MapNamer {
  static generate_old(wfc) {
    const theme = wfc.themeName; // e.g., 'fantasy'

    // Gather data
    const grid = wfc.grid.flat();
    const terrainCount = {};
    const placedLocations = wfc.placedLocations;

    grid.forEach(cell => {
      if (cell.terrain) terrainCount[cell.terrain] = (terrainCount[cell.terrain] || 0) + 1;
    });

    // Dominant terrain
    const dominantTerrain = Object.keys(terrainCount).reduce((a, b) =>
      terrainCount[a] > terrainCount[b] ? a : b
    );

    // Get label from theme
    const themeData = ThemeManager.current;
    const terrainLabel = themeData.elevation[dominantTerrain]?.label || "Unknown";

    // Iconic location (rarest or most special)
    const iconicLocation = placedLocations.length > 0
      ? placedLocations.sort((a, b) => {
        const aWeight = TERRAIN_TYPES[a.loc.id]?.weight || 1;
        const bWeight = TERRAIN_TYPES[b.loc.id]?.weight || 1;
        return aWeight - bWeight; // lower weight = rarer
      })[0]?.loc.name
      : null;

    // Adjectives by theme
    const adjectives = {
      fantasy: ["Sacred", "Ancient", "Whispering", "Cursed", "Hidden", "Eternal", "Forgotten"],
      cyberpunk: ["Abandoned", "Neon", "Fractured", "Silent", "Bleeding", "Data-Lit", "Fallen"],
      modern: ["Quiet", "Tree-Lined", "Busy", "Riverside", "Hillside", "Empty", "Sunlit"]
    };

    const adj = adjectives[theme] ? adjectives[theme][Math.floor(Math.random() * adjectives[theme].length)] : "Mysterious";

    // Name patterns
    const patterns = [
      `${adj} ${terrainLabel}`,
      `${iconicLocation ? iconicLocation : `The ${adj} Site`} in the ${terrainLabel}`,
      `${iconicLocation ? `${iconicLocation} of` : `The ${adj} Realm of`} the ${terrainLabel}`,
      `The ${adj} ${iconicLocation || "Place"} by the ${terrainLabel}`,
      `Where the ${terrainLabel} Begins`
    ];

    return patterns[Math.floor(Math.random() * patterns.length)];
  }




static generate(wfc) {
  const theme = wfc.themeName;
  const grid = wfc.grid.flat();

  // Count terrain types
  const terrainCount = {};
  grid.forEach(cell => {
    if (cell.terrain) terrainCount[cell.terrain] = (terrainCount[cell.terrain] || 0) + 1;
  });

  // Get dominant terrain with fallback
  let dominantTerrain;
  const terrainKeys = Object.keys(terrainCount);
  if (terrainKeys.length > 0) {
    dominantTerrain = terrainKeys.reduce((a, b) =>
      terrainCount[a] > terrainCount[b] ? a : b
    );
  } else {
    // Fallback: use the first terrain type from TERRAIN_TYPES
    dominantTerrain = Object.keys(TERRAIN_TYPES)[0] || "meadow"; // generic fallback
  }

  // Get label from theme
  const themeData = ThemeManager.current;
  const terrainLabel = themeData.elevation[dominantTerrain]?.label || "Unknown";

  // Iconic location (rarest or most special)
  const iconicLocation = wfc.placedLocations.length > 0
    ? wfc.placedLocations.sort((a, b) => {
        const aWeight = TERRAIN_TYPES[a.loc.id]?.weight || 1;
        const bWeight = TERRAIN_TYPES[b.loc.id]?.weight || 1;
        return aWeight - bWeight; // lower weight = rarer
      })[0]?.loc.name
    : null;

  // Adjectives by theme
  const adjectives = {
    fantasy: ["Sacred", "Ancient", "Whispering", "Cursed", "Hidden", "Eternal", "Forgotten"],
    cyberpunk: ["Abandoned", "Neon", "Fractured", "Silent", "Bleeding", "Data-Lit", "Fallen"],
    modern: ["Quiet", "Tree-Lined", "Busy", "Riverside", "Hillside", "Empty", "Sunlit"]
  };
  const adj = adjectives[theme] ? adjectives[theme][Math.floor(Math.random() * adjectives[theme].length)] : "Mysterious";

  // Name patterns
  const patterns = [
    `${adj} ${terrainLabel}`,
    `${iconicLocation ? iconicLocation : `The ${adj} Site`} in the ${terrainLabel}`,
    `${iconicLocation ? `${iconicLocation} of` : `The ${adj} Realm of`} the ${terrainLabel}`,
    `The ${adj} ${iconicLocation || "Place"} by the ${terrainLabel}`,
    `Where the ${terrainLabel} Begins`
  ];

  return patterns[Math.floor(Math.random() * patterns.length)];
}




  static stringToSeed(str) {
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      seed = ((seed << 5) - seed + char) & 0xffffffff;
    }
    return Math.abs(seed) % 1000000;
  }
}