import { CATEGORIES, TOOLS } from './tool-catalog.js';
import { getCopy, getStoredLanguage, setLanguage, translateStaticContent } from './i18n.js';
import { initializeTheme, toggleTheme } from './theme.js';

const searchInput = document.querySelector('#tool-search');
const filters = document.querySelector('#category-filters');
const toolGrid = document.querySelector('#tool-grid');
const toolCount = document.querySelector('#tool-count');
const emptyState = document.querySelector('#empty-state');
const languageButton = document.querySelector('.language-button');
const themeButton = document.querySelector('.theme-button');

let language = setLanguage(getStoredLanguage());
let activeCategory = 'all';

function labelFor(category) {
  return category.label[language];
}

function matchingTools() {
  const query = searchInput.value.trim().toLocaleLowerCase(language);
  return TOOLS.filter((tool) => {
    const inCategory = activeCategory === 'all' || tool.category === activeCategory;
    const searchable = `${tool.name[language]} ${tool.description[language]} ${labelFor(CATEGORIES.find((category) => category.id === tool.category))}`.toLocaleLowerCase(language);
    return inCategory && searchable.includes(query);
  });
}

function renderFilters() {
  filters.replaceChildren(...CATEGORIES.map((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-button';
    button.textContent = category.id === 'all' ? getCopy(language, 'allTools') : labelFor(category);
    button.setAttribute('aria-pressed', String(category.id === activeCategory));
    button.addEventListener('click', () => {
      activeCategory = category.id;
      render();
    });
    return button;
  }));
}

function renderTools() {
  const tools = matchingTools();
  toolGrid.replaceChildren(...tools.map((tool) => {
    const isAvailable = tool.available;
    const card = document.createElement(isAvailable ? 'a' : 'article');
    card.className = 'tool-card';
    if (isAvailable) card.href = tool.href;

    const icon = document.createElement('span');
    icon.className = 'tool-icon';
    icon.textContent = tool.icon;
    icon.setAttribute('aria-hidden', 'true');

    const title = document.createElement('h2');
    title.textContent = tool.name[language];
    const description = document.createElement('p');
    description.textContent = tool.description[language];
    const meta = document.createElement('span');
    meta.className = 'tool-card-meta';
    meta.textContent = isAvailable ? labelFor(CATEGORIES.find((category) => category.id === tool.category)) : getCopy(language, 'comingSoon');

    card.append(icon, title, description, meta);
    return card;
  }));
  toolCount.textContent = getCopy(language, 'toolCount', { count: tools.length });
  emptyState.hidden = tools.length !== 0;
}

function updateControls() {
  languageButton.textContent = language.toUpperCase();
  languageButton.setAttribute('aria-label', getCopy(language, 'languageLabel'));
  const theme = document.documentElement.dataset.theme;
  themeButton.setAttribute('aria-label', getCopy(language, theme === 'dark' ? 'themeToLight' : 'themeToDark'));
  themeButton.title = themeButton.getAttribute('aria-label');
}

function render() {
  translateStaticContent(language);
  renderFilters();
  renderTools();
  updateControls();
}

initializeTheme();
render();

searchInput.addEventListener('input', renderTools);
languageButton.addEventListener('click', () => {
  language = setLanguage(language === 'en' ? 'ko' : 'en');
  render();
});
themeButton.addEventListener('click', () => {
  toggleTheme();
  updateControls();
});
window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});
