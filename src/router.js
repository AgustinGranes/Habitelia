let currentRoute = { path: '/', params: {} };

const parseHash = () => {
  const hash = window.location.hash || '#/home';
  const rawPath = hash.slice(1);
  const pathParts = rawPath.split('/').filter(Boolean);
  
  if (rawPath === '/login') return { path: '/login', params: {} };
  if (rawPath === '/onboarding') return { path: '/onboarding', params: {} };
  if (rawPath === '/home') return { path: '/home', params: {} };
  if (rawPath === '/routine') return { path: '/routine', params: {} };
  if (rawPath === '/calendar') return { path: '/calendar', params: {} };
  if (rawPath === '/habit/new') return { path: '/habit/new', params: {} };
  if (rawPath.startsWith('/habit/edit/')) return { path: '/habit/edit', params: { id: pathParts[2] } };
  if (rawPath === '/chain') return { path: '/chain', params: {} };
  if (rawPath === '/settings') return { path: '/settings', params: {} };
  
  return { path: '/login', params: {} };
};

export const initRouter = (renderFn) => {
  const handleHashChange = () => {
    currentRoute = parseHash();
    renderFn(currentRoute.path, currentRoute.params);
  };
  
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
};

export const navigate = (path) => {
  window.location.hash = path;
};

export const getCurrentRoute = () => currentRoute;

export const goBack = () => {
  window.history.back();
};
