import { store } from '../store.js';
import { navigate } from '../router.js';
import { logOut } from '../firebase.js';

export function renderSidebar() {
    const state = store.getState();
    const name = state.user?.displayName || state.user?.name || 'Viajero';
    const identity = state.user?.identity || 'Sin identidad';
    const currentRoute = state.currentRoute;

    const isActive = (path) => currentRoute === path ? 'active' : '';

    return `
        <div class="sidebar-overlay" id="sidebar-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 100; opacity: 0; transition: opacity 0.3s;"></div>
        <div class="sidebar glass-card" id="sidebar-panel" style="position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; z-index: 101; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; border-radius: 0; border-left: none; border-top: none; border-bottom: none;">
            <div class="sidebar-header" style="padding: 30px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                <h2 style="margin: 0; font-family: 'Playfair Display', serif; font-size: 24px; color: #fff;">${name}</h2>
                <div style="font-size: 14px; color: #F5C518; margin-top: 8px; font-style: italic;">${identity}</div>
            </div>
            <nav class="sidebar-nav" style="flex: 1; overflow-y: auto; padding: 0 10px;">
                <div class="sidebar-nav-item ${isActive('/home')}" data-path="/home" style="padding: 15px 20px; border-radius: 10px; margin-bottom: 5px; display: flex; align-items: center; gap: 15px; cursor: pointer; color: #eee; transition: background 0.2s, color 0.2s;"><span style="font-size: 20px;">🏠</span> Inicio</div>
                <div class="sidebar-nav-item ${isActive('/routine')}" data-path="/routine" style="padding: 15px 20px; border-radius: 10px; margin-bottom: 5px; display: flex; align-items: center; gap: 15px; cursor: pointer; color: #eee; transition: background 0.2s, color 0.2s;"><span style="font-size: 20px;">📋</span> Rutina de Hoy</div>
                <div class="sidebar-nav-item ${isActive('/calendar')}" data-path="/calendar" style="padding: 15px 20px; border-radius: 10px; margin-bottom: 5px; display: flex; align-items: center; gap: 15px; cursor: pointer; color: #eee; transition: background 0.2s, color 0.2s;"><span style="font-size: 20px;">📅</span> Calendario</div>
                <div class="sidebar-nav-item ${isActive('/chain')}" data-path="/chain" style="padding: 15px 20px; border-radius: 10px; margin-bottom: 5px; display: flex; align-items: center; gap: 15px; cursor: pointer; color: #eee; transition: background 0.2s, color 0.2s;"><span style="font-size: 20px;">🔗</span> Mi Cadena</div>
                <div class="sidebar-nav-item ${isActive('/settings')}" data-path="/settings" style="padding: 15px 20px; border-radius: 10px; margin-bottom: 5px; display: flex; align-items: center; gap: 15px; cursor: pointer; color: #eee; transition: background 0.2s, color 0.2s;"><span style="font-size: 20px;">⚙️</span> Configuración</div>
                
                <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 20px 20px;"></div>
                
                <div class="sidebar-nav-item logout-item" id="sidebar-logout" style="padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; color: #F44336; transition: background 0.2s;"><span style="font-size: 20px;">🚪</span> Cerrar Sesión</div>
            </nav>
        </div>
        <style>
            .sidebar-nav-item:hover { background: rgba(255,255,255,0.05); }
            .sidebar-nav-item.active { background: rgba(245,197,24,0.1); color: #F5C518 !important; font-weight: bold; }
            .sidebar-nav-item.logout-item:hover { background: rgba(244, 67, 54, 0.1); }
            .sidebar.open { left: 0 !important; }
            .sidebar-overlay.show { opacity: 1 !important; }
        </style>
    `;
}

export function mountSidebar() {
    const overlay = document.getElementById('sidebar-overlay');
    const panel = document.getElementById('sidebar-panel');
    
    if (!overlay || !panel) return;

    const closeSidebar = () => {
        store.setState({ sidebarOpen: false });
    };

    overlay.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (e.currentTarget.id === 'sidebar-logout') {
                closeSidebar();
                await logOut();
                navigate('/login');
                return;
            }
            
            const path = e.currentTarget.dataset.path;
            if (path) {
                closeSidebar();
                navigate(path);
            }
        });
    });

    const unsub = store.subscribe(() => {
        const isOpen = store.getState().sidebarOpen;
        if (isOpen) {
            overlay.style.display = 'block';
            // Slight delay to allow display block to apply before animating opacity
            requestAnimationFrame(() => {
                panel.classList.add('open');
                overlay.classList.add('show');
            });
        } else {
            panel.classList.remove('open');
            overlay.classList.remove('show');
            setTimeout(() => {
                if(!store.getState().sidebarOpen) overlay.style.display = 'none';
            }, 300);
        }
    });
    
    return unsub;
}
