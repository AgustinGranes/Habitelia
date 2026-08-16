import { store } from '../store.js';
import { navigate } from '../router.js';
import { logOut } from '../firebase.js';
import { iconSVG } from './icons.js';

let _sidebarIsOpen = false;

export function closeSidebar() {
  _sidebarIsOpen = false;
  const panel = document.getElementById('sidebar-panel');
  const overlay = document.getElementById('sidebar-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      if (!_sidebarIsOpen && overlay) overlay.style.display = 'none';
    }, 200);
  }
  store.setState({ sidebarOpen: false });
}

export function openSidebar() {
  if (_sidebarIsOpen) return;
  _sidebarIsOpen = true;

  let overlay = document.getElementById('sidebar-overlay');
  let panel = document.getElementById('sidebar-panel');

  if (!overlay || !panel) {
    document.querySelectorAll('#sidebar-overlay').forEach(el => el.remove());
    document.querySelectorAll('#sidebar-panel').forEach(el => el.remove());

    const appContainer = document.getElementById('app') || document.body;
    const sidebarHTML = renderSidebar();
    appContainer.insertAdjacentHTML('beforeend', sidebarHTML);
    mountSidebar();
    overlay = document.getElementById('sidebar-overlay');
    panel = document.getElementById('sidebar-panel');
  }

  if (overlay && panel) {
    overlay.style.display = 'block';
    requestAnimationFrame(() => {
      panel.classList.add('open');
      overlay.classList.add('show');
    });
  }
  store.setState({ sidebarOpen: true });
}

export function renderSidebar() {
    const state = store.getState();
    const name = state.user?.displayName || state.user?.name || 'Viajero';
    const identity = state.user?.identity || 'Sin identidad definida';
    const currentRoute = state.currentRoute;

    const isActive = (path) => currentRoute === path ? 'active' : '';

    return `
        <div class="sidebar-overlay" id="sidebar-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 100; opacity: 0; transition: opacity 0.15s ease;"></div>
        <div class="sidebar" id="sidebar-panel" style="position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; z-index: 101; transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; border-right: 1px solid var(--border-subtle); background: var(--bg-surface);">
            <div class="sidebar-header" style="padding: 32px 24px 24px 24px; border-bottom: 1px solid var(--border-subtle);">
                <div style="font-family: var(--font-serif); font-size: 26px; color: var(--text-primary); letter-spacing: -0.02em; font-weight: 400; margin-bottom: 16px;">
                    HABITELIA<span class="brand-dot" style="color: var(--text-primary);">.</span>
                </div>
                <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${name}</div>
                <div style="font-size: 13px; color: var(--text-secondary); font-style: italic; font-family: var(--font-serif);">${identity}</div>
            </div>

            <nav class="sidebar-nav" style="flex: 1; overflow-y: auto; padding: 16px 12px;">
                <div class="sidebar-nav-item ${isActive('/home')}" data-path="/home" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('home', 18)} <span style="font-size: 14px;">Inicio</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/routine')}" data-path="/routine" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('routine', 18)} <span style="font-size: 14px;">Rutina</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/todo')}" data-path="/todo" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('todo', 18)} <span style="font-size: 14px;">Lista de Tareas</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/calendar')}" data-path="/calendar" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('calendar', 18)} <span style="font-size: 14px;">Calendario</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/chain')}" data-path="/chain" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('chain', 18)} <span style="font-size: 14px;">Mi Cadena</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/driver')}" data-path="/driver" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('helmet', 18)} <span style="font-size: 14px;">Tu Piloto</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/friends')}" data-path="/friends" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('users', 18)} <span style="font-size: 14px;">Amigos</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/calculator')}" data-path="/calculator" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('calculator', 18)} <span style="font-size: 14px;">Calculadora</span>
                </div>
                <div class="sidebar-nav-item ${isActive('/settings')}" data-path="/settings" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 4px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease;">
                    ${iconSVG('settings', 18)} <span style="font-size: 14px;">Configuración</span>
                </div>
                
                <div style="height: 1px; background: var(--border-subtle); margin: 16px 12px;"></div>
                
                <div class="sidebar-nav-item logout-item" id="sidebar-logout" style="padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--text-tertiary); transition: all 0.2s ease;">
                    ${iconSVG('logout', 18)} <span style="font-size: 14px;">Cerrar Sesión</span>
                </div>
            </nav>
        </div>
        <style>
            .sidebar-nav-item:hover { background: var(--bg-surface-hover); color: var(--text-primary) !important; }
            .sidebar-nav-item.active { background: var(--bg-subtle); color: var(--text-primary) !important; font-weight: 600; }
            .sidebar-nav-item.logout-item:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary) !important; }
            .sidebar.open { left: 0 !important; }
            .sidebar-overlay.show { opacity: 1 !important; }
        </style>
    `;
}

let currentSidebarUnsub = null;

export function mountSidebar() {
    if (currentSidebarUnsub) {
        currentSidebarUnsub();
        currentSidebarUnsub = null;
    }

    const overlays = document.querySelectorAll('#sidebar-overlay');
    const panels = document.querySelectorAll('#sidebar-panel');
    if (overlays.length > 1) {
        for (let i = 0; i < overlays.length - 1; i++) overlays[i].remove();
    }
    if (panels.length > 1) {
        for (let i = 0; i < panels.length - 1; i++) panels[i].remove();
    }

    const overlay = document.getElementById('sidebar-overlay');
    const panel = document.getElementById('sidebar-panel');
    
    if (!overlay || !panel) return;

    // Instant close on tap/touch anywhere on overlay
    overlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    }, { passive: false });

    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    });

    panel.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.onclick = async (e) => {
            const currentItem = e.currentTarget;
            if (currentItem.id === 'sidebar-logout') {
                closeSidebar();
                await logOut();
                navigate('/login');
                return;
            }
            
            const path = currentItem.dataset.path;
            if (path) {
                closeSidebar();
                navigate(path);
            }
        };
    });

    currentSidebarUnsub = store.subscribe(() => {
        const isOpen = store.getState().sidebarOpen;
        if (isOpen) {
            _sidebarIsOpen = true;
            overlay.style.display = 'block';
            requestAnimationFrame(() => {
                panel.classList.add('open');
                overlay.classList.add('show');
            });
        } else {
            _sidebarIsOpen = false;
            panel.classList.remove('open');
            overlay.classList.remove('show');
            setTimeout(() => {
                if (!_sidebarIsOpen && overlay) overlay.style.display = 'none';
            }, 200);
        }
    });
    
    return currentSidebarUnsub;
}
