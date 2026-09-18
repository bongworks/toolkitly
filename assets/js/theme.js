const STORAGE_KEY = 'toolkitly-theme';

function preferredTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function initializeTheme() {
  const theme = localStorage.getItem(STORAGE_KEY) || preferredTheme();
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(STORAGE_KEY, nextTheme);
  return nextTheme;
}
