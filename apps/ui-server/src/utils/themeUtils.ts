export const getThemeIconPath = (appId: string, theme: string, defaultIconPath?: string): string | null => {
  const customThemes = ['retro', 'panic', 'zen', 'matrix', 'kawaii', 'cartoon', 'neon'];
  if (customThemes.includes(theme)) {
    // Return the dynamic theme icon path
    return `/icons/themes/${theme}/${appId}.jpg`;
  }
  return defaultIconPath || null;
};

export const getThemeWallpaper = (theme: string, defaultWallpaper: string): string => {
  const customThemes = ['retro', 'panic', 'zen', 'matrix', 'kawaii', 'cartoon', 'neon'];
  if (customThemes.includes(theme)) {
    return `/wallpapers/${theme}.jpg`;
  }
  return defaultWallpaper;
};
