import './main.css';
import { onAuthChange } from './firebase.js';
import { store } from './store.js';
import { initRouter, navigate, getCurrentRoute } from './router.js';

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
import { renderSidebar, mountSidebar } from './components/sidebar.js';

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

// Edge Swipe from Left Gesture to Open Sidebar
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (e.changedTouches && e.changedTouches.length === 1) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (touchStartX < 40 && diffX > 60 && Math.abs(diffY) < 50) {
      store.setState({ sidebarOpen: true });
    }
  }
}, { passive: true });

const getAppContainer = () => document.getElementById('app') || document.body;

const renderApp = (routePath, params) => {
  try {
    store.setState({ currentRoute: routePath });
    const appContainer = getAppContainer();
    
    const route = routesMap[routePath] || routesMap['/login'];
    const renderFn = route.render || (() => `<div class="page">Page Not Found</div>`);
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
    console.error('Error rendering app route:', routePath, err);
  }
};

const initialize = () => {
  initTheme();
  store.setState({ loading: true });
  
  onAuthChange(async (user) => {
    if (user) {
      await store.loadUserData();
      store.setState({ loading: false });
      
      const state = store.getState();
      const localOnboarded = localStorage.getItem(`onboardingCompleted_${user.uid}`) === 'true';
      const isOnboarded = state.user?.onboardingCompleted === true || localOnboarded;
      
      if (!isOnboarded) {
        if (getCurrentRoute().path !== '/onboarding') {
          navigate('/onboarding');
        }
      } else if (getCurrentRoute().path === '/login' || getCurrentRoute().path === '/onboarding') {
        navigate('/home');
      }
    } else {
      store.setState({ loading: false, user: null });
      if (getCurrentRoute().path !== '/login') {
        navigate('/login');
      }
    }
  });

  initRouter(renderApp);
};

let renderTimeout;
store.subscribe(() => {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    // Allows hooks for component re-rendering
  }, 50);
});

initialize();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}
