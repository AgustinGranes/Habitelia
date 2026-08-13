import './main.css';
import { onAuthChange } from './firebase.js';
import { store } from './store.js';
import { initRouter, navigate, getCurrentRoute } from './router.js';

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
};

const appContainer = document.getElementById('app') || document.body;

const renderApp = (routePath, params) => {
  store.setState({ currentRoute: routePath });
  
  const route = routesMap[routePath] || routesMap['/login'];
  
  // Guard against missing functions during active development
  const renderFn = route.render || (() => `<div class="page-content">Missing Render</div>`);
  const mountFn = route.mount || (() => {});
  const newHTML = renderFn(params);
  
  const oldContent = appContainer.querySelector('.page-content');
  if (oldContent) {
    oldContent.classList.add('page-exit');
    setTimeout(() => {
      if (routesMap[getCurrentRoute().path]?.unmount) {
        routesMap[getCurrentRoute().path].unmount();
      }
      appContainer.innerHTML = newHTML;
      
      const newContent = appContainer.querySelector('.page-content');
      if (newContent) newContent.classList.add('page-enter');
      mountFn(params);
      
      if (routePath !== '/login' && routePath !== '/onboarding') {
        const sidebarHTML = renderSidebar();
        appContainer.insertAdjacentHTML('beforeend', sidebarHTML);
        mountSidebar();
      }
    }, 300);
  } else {
    appContainer.innerHTML = newHTML;
    const newContent = appContainer.querySelector('.page-content');
    if (newContent) newContent.classList.add('page-enter');
    mountFn(params);
    
    if (routePath !== '/login' && routePath !== '/onboarding') {
      const sidebarHTML = renderSidebar();
      appContainer.insertAdjacentHTML('beforeend', sidebarHTML);
      mountSidebar();
    }
  }
};

const initialize = () => {
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
