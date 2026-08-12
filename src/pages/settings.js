import { store } from '../store.js';
import { showToast } from '../components/toast.js';

export function render(props = {}) {
    const state = store.getState();
    const email = state.user?.email || 'Sin email';
    const name = state.user?.displayName || state.user?.name || 'Usuario';
    const identity = state.user?.identity || 'No definida';

    return `
        <div class="page settings-page" style="padding: 24px 20px 100px 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box; overflow-y: auto;">
            <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
                    <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Configuración</h1>
                </div>
            </header>

            <div class="settings-section glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 20px;">
                <h3 style="margin-top: 0; color: #F5C518; font-size: 18px; margin-bottom: 16px; font-family: 'Playfair Display', serif; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Mi Identidad</h3>
                <div class="settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1;">
                        <div id="identity-display" style="font-style: italic; color: #eee; font-size: 15px; line-height: 1.5;">${identity}</div>
                        <textarea id="identity-input" class="input" rows="3" style="display: none; margin-top: 10px; width: 100%; font-size: 14px;">${identity}</textarea>
                    </div>
                    <button id="edit-identity-btn" class="btn-ghost" style="background: rgba(245, 197, 24, 0.1); border: 1px solid rgba(245, 197, 24, 0.3); color: #F5C518; cursor: pointer; padding: 8px 16px; border-radius: 10px; font-weight: 600; min-height: 40px;">Editar</button>
                    <button id="save-identity-btn" class="btn-ghost" style="display: none; background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.4); color: #4CAF50; cursor: pointer; padding: 8px 16px; border-radius: 10px; font-weight: 600; min-height: 40px;">Guardar</button>
                </div>
            </div>

            <div class="settings-section glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 20px;">
                <h3 style="margin-top: 0; color: #F5C518; font-size: 18px; margin-bottom: 16px; font-family: 'Playfair Display', serif; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Mi Cuenta</h3>
                <div class="settings-item" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; color: var(--text-muted);">Nombre</div>
                    <div style="font-weight: 600; color: #fff; font-size: 15px;">${name}</div>
                </div>
                <div class="settings-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; color: var(--text-muted);">Email</div>
                    <div style="font-weight: 600; color: #fff; font-size: 15px;">${email}</div>
                </div>
            </div>

            <div class="settings-section glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 20px;">
                <h3 style="margin-top: 0; color: #F5C518; font-size: 18px; margin-bottom: 16px; font-family: 'Playfair Display', serif; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Datos & Privacidad</h3>
                <div class="settings-item">
                    <button id="delete-data-btn" class="btn-danger" style="background: rgba(244, 67, 54, 0.12); border: 1px solid rgba(244, 67, 54, 0.35); color: #FF5252; padding: 14px; border-radius: 12px; cursor: pointer; width: 100%; font-weight: 600; font-size: 14px; transition: background 0.2s;">🗑️ Borrar Todos Mis Datos</button>
                </div>
            </div>
        </div>
    `;
}

export function mount() {
    // Menu button sidebar trigger
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            store.setState({ sidebarOpen: true });
            const overlay = document.getElementById('sidebar-overlay');
            const panel = document.getElementById('sidebar-panel');
            if (overlay && panel) {
                overlay.style.display = 'block';
                requestAnimationFrame(() => {
                    panel.classList.add('open');
                    overlay.classList.add('show');
                });
            }
        });
    }

    const display = document.getElementById('identity-display');
    const input = document.getElementById('identity-input');
    const editBtn = document.getElementById('edit-identity-btn');
    const saveBtn = document.getElementById('save-identity-btn');

    editBtn?.addEventListener('click', () => {
        display.style.display = 'none';
        input.style.display = 'block';
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        input.focus();
    });

    saveBtn?.addEventListener('click', () => {
        const newIdentity = input.value.trim();
        if (newIdentity) {
            store.saveUserProfile({ identity: newIdentity });
            display.textContent = newIdentity;
            showToast('Identidad actualizada', 'success');
        }
        
        display.style.display = 'block';
        input.style.display = 'none';
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
    });

    document.getElementById('delete-data-btn')?.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que querés borrar TODOS tus hábitos y progreso? Esta acción no se puede deshacer.')) {
            localStorage.clear();
            showToast('Datos borrados. Recargando...', 'info');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    });
}

export function unmount() {
}
