export const THEMES = {
  obsidian: {
    name: 'Obsidian Monochrome',
    bgPrimary: '#0A0A0A',
    bgSurface: '#171717',
    bgSurfaceHover: '#262626',
    bgSubtle: '#262626',
    textPrimary: '#FAFAFA',
    textSecondary: '#A3A3A3',
    textTertiary: '#737373',
    borderSubtle: '#262626',
    borderStrong: '#FAFAFA',
    accentPrimary: '#FAFAFA',
    accentInverted: '#0A0A0A'
  },
  light: {
    name: 'Clean Light',
    bgPrimary: '#FAFAFA',
    bgSurface: '#FFFFFF',
    bgSurfaceHover: '#F5F5F5',
    bgSubtle: '#EEEEEE',
    textPrimary: '#0A0A0A',
    textSecondary: '#666666',
    textTertiary: '#A3A3A3',
    borderSubtle: '#E5E5E5',
    borderStrong: '#0A0A0A',
    accentPrimary: '#0A0A0A',
    accentInverted: '#FAFAFA'
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    bgPrimary: '#080914',
    bgSurface: '#121528',
    bgSurfaceHover: '#1C223F',
    bgSubtle: '#1C223F',
    textPrimary: '#00F0FF',
    textSecondary: '#70A0B0',
    textTertiary: '#406070',
    borderSubtle: '#1E2648',
    borderStrong: '#00F0FF',
    accentPrimary: '#00F0FF',
    accentInverted: '#080914'
  },
  emerald: {
    name: 'Emerald Mint',
    bgPrimary: '#04150E',
    bgSurface: '#0B291C',
    bgSurfaceHover: '#133E2B',
    bgSubtle: '#133E2B',
    textPrimary: '#10B981',
    textSecondary: '#6EE7B7',
    textTertiary: '#047857',
    borderSubtle: '#1B4D39',
    borderStrong: '#10B981',
    accentPrimary: '#10B981',
    accentInverted: '#04150E'
  },
  gold: {
    name: 'Obsidian Gold',
    bgPrimary: '#0D0C0A',
    bgSurface: '#1A1814',
    bgSurfaceHover: '#2A2620',
    bgSubtle: '#2A2620',
    textPrimary: '#F59E0B',
    textSecondary: '#FCD34D',
    textTertiary: '#B45309',
    borderSubtle: '#332B1F',
    borderStrong: '#F59E0B',
    accentPrimary: '#F59E0B',
    accentInverted: '#0D0C0A'
  },
  purple: {
    name: 'Midnight Purple',
    bgPrimary: '#0D0914',
    bgSurface: '#181226',
    bgSurfaceHover: '#281E3D',
    bgSubtle: '#281E3D',
    textPrimary: '#A855F7',
    textSecondary: '#C084FC',
    textTertiary: '#7E22CE',
    borderSubtle: '#2E1F47',
    borderStrong: '#A855F7',
    accentPrimary: '#A855F7',
    accentInverted: '#0D0914'
  },
  crimson: {
    name: 'Sunset Crimson',
    bgPrimary: '#14080A',
    bgSurface: '#241014',
    bgSurfaceHover: '#3B1A21',
    bgSubtle: '#3B1A21',
    textPrimary: '#F43F5E',
    textSecondary: '#FB7185',
    textTertiary: '#BE123C',
    borderSubtle: '#4A1D27',
    borderStrong: '#F43F5E',
    accentPrimary: '#F43F5E',
    accentInverted: '#14080A'
  },
  ocean: {
    name: 'Ocean Cobalt',
    bgPrimary: '#060B14',
    bgSurface: '#0E172A',
    bgSurfaceHover: '#1E293B',
    bgSubtle: '#1E293B',
    textPrimary: '#38BDF8',
    textSecondary: '#7DD3FC',
    textTertiary: '#0284C7',
    borderSubtle: '#1E3A8A',
    borderStrong: '#38BDF8',
    accentPrimary: '#38BDF8',
    accentInverted: '#060B14'
  },
  rose: {
    name: 'Rose Quartz',
    bgPrimary: '#14090E',
    bgSurface: '#24121B',
    bgSurfaceHover: '#3B1C2C',
    bgSubtle: '#3B1C2C',
    textPrimary: '#EC4899',
    textSecondary: '#F472B6',
    textTertiary: '#BE185D',
    borderSubtle: '#4A1F36',
    borderStrong: '#EC4899',
    accentPrimary: '#EC4899',
    accentInverted: '#14090E'
  },
  oled: {
    name: 'OLED Pure Black',
    bgPrimary: '#000000',
    bgSurface: '#080808',
    bgSurfaceHover: '#121212',
    bgSubtle: '#171717',
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    textTertiary: '#555555',
    borderSubtle: '#222222',
    borderStrong: '#FFFFFF',
    accentPrimary: '#FFFFFF',
    accentInverted: '#000000'
  }
};

export function applyTheme(themeKey = 'obsidian') {
  try {
    const theme = THEMES[themeKey] || THEMES.obsidian;
    const elements = [document.documentElement, document.body].filter(Boolean);

    elements.forEach(el => {
      el.style.setProperty('--bg-primary', theme.bgPrimary);
      el.style.setProperty('--bg-surface', theme.bgSurface);
      el.style.setProperty('--bg-surface-hover', theme.bgSurfaceHover);
      el.style.setProperty('--bg-subtle', theme.bgSubtle);
      el.style.setProperty('--text-primary', theme.textPrimary);
      el.style.setProperty('--text-secondary', theme.textSecondary);
      el.style.setProperty('--text-tertiary', theme.textTertiary);
      el.style.setProperty('--border-subtle', theme.borderSubtle);
      el.style.setProperty('--border-strong', theme.borderStrong);
      el.style.setProperty('--accent-primary', theme.accentPrimary);
      el.style.setProperty('--accent-inverted', theme.accentInverted);
    });

    localStorage.setItem('app_theme_key', themeKey);
  } catch (e) {
    console.error('Error applying theme:', e);
  }
}

export function initTheme() {
  try {
    const savedKey = localStorage.getItem('app_theme_key') || 'obsidian';
    applyTheme(savedKey);
  } catch (e) {
    console.error('Error initializing theme:', e);
  }
}
