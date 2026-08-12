let currentRoute = { path: '/', params: {} };

const parseHash = () => {
  const hash = window.location.hash || '#/home';
  const rawPathWithQuery = hash.slice(1);
  const [rawPath, queryString] = rawPathWithQuery.split('?');
  const pathParts = rawPath.split('/').filter(Boolean);
  
  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  if (rawPath.startsWith('/habit/edit/')) {
    params.id = pathParts[2];
    return { path: '/habit/new', params };
  }
  
  if (rawPath === '/habit/edit' || rawPath === '/habit/new') {
    return { path: '/habit/new', params };
  }

  if (rawPath === '/login') return { path: '/login', params };
  if (rawPath === '/onboarding') return { path: '/onboarding', params };
  if (rawPath === '/home') return { path: '/home', params };
  if (rawPath === '/routine') return { path: '/routine', params };
  if (rawPath === '/calendar') return { path: '/calendar', params };
  if (rawPath === '/chain') return { path: '/chain', params };
  if (rawPath === '/settings') return { path: '/settings', params };
  
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

export const navigate = (path, params = {}) => {
  let target = path;
  if (params && typeof params === 'object' && Object.keys(params).length > 0) {
    const query = new URLSearchParams(params).toString();
    target = `${path}?${query}`;
  }
  window.location.hash = target;
};

export const getCurrentRoute = () => currentRoute;

export const goBack = () => {
  window.history.back();
};
