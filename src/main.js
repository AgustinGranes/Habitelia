import './main.css';
import { onAuthChange, auth } from './firebase.js';
import { store } from './store.js';
import { navigate, getCurrentRoute } from './router.js';
import { initTheme } from './utils/theme.js';

// Import all page renderers
import { render as renderLogin, mount as mountLogin } from './pages/login.js';
import { render as renderOnboarding, mount as mountOnboarding } from './pages/onboarding.js';
import { render as renderHome, mount as mountHome, unmount as unmountHome } from './pages/home.js';
import { render as renderRoutine, mount as mountRoutine } from './pages/routine.js';
import { render as renderCalendar, mount as mountCalendar } from './pages/calendar.js';
import { render as renderHabitForm, mount as mountHabitForm } from './pages/habitForm.js';
import { render as renderChain, mount as mountChain } from './pages/habitChain.js';
import { render as renderDriver, mount as mountDriver } from './pages/driver.js';
import { render as renderFriends, mount as mountFriends } from './pages/friends.js';
import { render as renderSettings, mount as mountSettings } from './pages/settings.js';
import { render as renderCalculator, mount as mountCalculator } from './pages/calculator.js';
import { render as renderTodo, mount as mountTodo } from './pages/todo.js';
import { renderSidebar, mountSidebar, openSidebar } from './components/sidebar.js';

const routesMap = {
  '/login': { render: renderLogin, mount: mountLogin },
  '/onboarding': { render: renderOnboarding, mount: mountOnboarding },
  '/home': { render: renderHome, mount: mountHome, unmount: unmountHome },
  '/routine': { render: renderRoutine, mount: mountRoutine },
  '/calendar': { render: renderCalendar, mount: mountCalendar },
  '/habit/new': { render: renderHabitForm, mount: mountHabitForm },
  '/habit/edit': { render: renderHabitForm, mount: mountHabitForm },
  '/chain': { render: renderChain, mount: mountChain },
  '/driver': { render: renderDriver, mount: mountDriver },
  '/friends': { render: renderFriends, mount: mountFriends },
  '/settings': { render: renderSettings, mount: mountSettings },
  '/calculator': { render: renderCalculator, mount: mountCalculator },
  '/todo': { render: renderTodo, mount: mountTodo },
};

// Edge Swipe from Left Gesture to Open Sidebar (preventing browser back gesture)
let touchStartX = 0;
let touchStartY = 0;
let isEdgeSwipe = false;
window._lastSwipeTime = 0;
window._isSwipingMenu = false;

window.addEventListener('touchstart', (e) => {
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isEdgeSwipe = touchStartX < 120;
    if (isEdgeSwipe) {
      window._isSwipingMenu = true;
    }
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches.length === 1 && isEdgeSwipe) {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    if (diffX > 15 && Math.abs(diffY) < 70) {
      if (e.cancelable) e.preventDefault();
      window._lastSwipeTime = Date.now();
      openSidebar();
    }
  }
}, { passive: false });

window.addEventListener('touchend', (e) => {
  if (isEdgeSwipe) {
    const touchEndX = e.changedTouches && e.changedTouches.length === 1 ? e.changedTouches[0].clientX : touchStartX;
    const touchEndY = e.changedTouches && e.changedTouches.length === 1 ? e.changedTouches[0].clientY : touchStartY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (diffX > 15 && Math.abs(diffY) < 70) {
      if (e.cancelable) e.preventDefault();
      window._lastSwipeTime = Date.now();
      openSidebar();
    }
  }
  setTimeout(() => {
    isEdgeSwipe = false;
    window._isSwipingMenu = false;
  }, 300);
}, { passive: true });

const getAppContainer = () => document.getElementById('app') || document.body;

// Show a splash while Firebase resolves auth — prevents black screen
const showSplash = () => {
  const app = getAppContainer();
  app.innerHTML = `
    <div style="
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; background: var(--bg-primary); gap: 20px;
    ">
      <div style="
        font-family: var(--font-serif); font-size: 42px; color: var(--text-primary);
        letter-spacing: -0.03em; animation: splashFade 1s ease-out;
      ">HABITELIA.</div>
      <div style="
        width: 32px; height: 3px; background: var(--text-primary); border-radius: 2px;
        animation: splashBar 1.2s ease-in-out infinite alternate;
      "></div>
    </div>
    <style>
      @keyframes splashFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes splashBar { from { opacity: 0.2; width: 16px; } to { opacity: 1; width: 40px; } }
    </style>
  `;
};

let routerStarted = false;

const renderApp = (routePath, params) => {
  try {
    // ROUTE GUARD: If authenticated user lands on /login or /, replace state silently to /home without showing splash or re-rendering
    if (auth.currentUser && (routePath === '/login' || routePath === '/')) {
      const state = store.getState();
      const localOnboarded = localStorage.getItem(`onboardingCompleted_${auth.currentUser.uid}`) === 'true';
      const isOnboarded = state.user?.onboardingCompleted === true || localOnboarded;
      const targetHash = isOnboarded ? '#/home' : '#/onboarding';
      window.history.replaceState(null, '', targetHash);
      routePath = isOnboarded ? '/home' : '/onboarding';
    }

    // Skip full DOM re-rendering if current route matches target route and app is already populated
    const currentRouteInState = store.getState().currentRoute;
    if (currentRouteInState === routePath && document.getElementById('app')?.children.length > 0) {
      return;
    }

    store.setState({ currentRoute: routePath });
    const appContainer = getAppContainer();

    const route = routesMap[routePath] || routesMap['/home'];
    const renderFn = route.render || (() => `<div class="page"></div>`);
    const mountFn = route.mount || (() => {});
    const newHTML = renderFn(params);

    appContainer.innerHTML = newHTML;
    mountFn(params);

    if (routePath !== '/login' && routePath !== '/onboarding') {
      const sidebarHTML = renderSidebar();
      appContainer.insertAdjacentHTML('beforeend', sidebarHTML);
      mountSidebar();
    }
  } catch (err) {
    console.error('Error rendering route:', routePath, err);
  }
};

const startRouter = () => {
  if (routerStarted) return;
  routerStarted = true;

  const parseHash = () => {
    const hash = window.location.hash || '#/login';
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
      return { path: '/habit/edit', params };
    }
    if (rawPath === '/habit/edit' || rawPath === '/habit/new') return { path: '/habit/new', params };
    if (rawPath === '/login') return { path: '/login', params };
    if (rawPath === '/onboarding') return { path: '/onboarding', params };
    if (rawPath === '/home') return { path: '/home', params };
    if (rawPath === '/routine') return { path: '/routine', params };
    if (rawPath === '/calendar') return { path: '/calendar', params };
    if (rawPath === '/chain') return { path: '/chain', params };
    if (rawPath === '/driver') return { path: '/driver', params };
    if (rawPath === '/friends') return { path: '/friends', params };
    if (rawPath === '/calculator') return { path: '/calculator', params };
    if (rawPath === '/todo') return { path: '/todo', params };
    if (rawPath === '/settings') return { path: '/settings', params };

    return { path: '/login', params: {} };
  };

  const handleHashChange = (e) => {
    const timeSinceSwipe = Date.now() - (window._lastSwipeTime || 0);
    if (window._isSwipingMenu || timeSinceSwipe < 600) {
      const currentRoutePath = store.getState().currentRoute || '/home';
      window.history.pushState(null, '', `#${currentRoutePath}`);
      openSidebar();
      return;
    }

    const route = parseHash();
    renderApp(route.path, route.params);
  };

  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('popstate', (e) => {
    const timeSinceSwipe = Date.now() - (window._lastSwipeTime || 0);
    if (window._isSwipingMenu || timeSinceSwipe < 600) {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
      const currentRoutePath = store.getState().currentRoute || '/home';
      window.history.pushState(null, '', `#${currentRoutePath}`);
      openSidebar();
      return;
    }

    if (auth.currentUser) {
      const hash = window.location.hash;
      if (!hash || hash === '#/' || hash === '#/login' || hash === '#/onboarding') {
        if (e.cancelable) e.preventDefault();
        e.stopImmediatePropagation();
        window.history.replaceState(null, '', '#/home');
      }
    }
  }, true);

  handleHashChange();
};

const initialize = () => {
  initTheme();

  showSplash();

  onAuthChange(async (user) => {
    if (user) {
      await store.loadUserData();

      const state = store.getState();
      const localOnboarded = localStorage.getItem(`onboardingCompleted_${user.uid}`) === 'true';
      const isOnboarded = state.user?.onboardingCompleted === true || localOnboarded;

      if (!isOnboarded) {
        window.location.replace('#/onboarding');
      } else {
        const hash = window.location.hash;
        if (!hash || hash === '#/' || hash === '#/login' || hash === '#/onboarding') {
          window.location.replace('#/home');
        }
      }
    } else {
      store.setState({ user: null });
      window.location.replace('#/login');
    }

    startRouter();
  });
};

initialize();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}
