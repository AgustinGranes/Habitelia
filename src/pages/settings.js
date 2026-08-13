import { store } from '../store.js';
import { auth, deleteAccountAndAllData } from '../firebase.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';

export function render(props = {}) {
    const state = store.getState();
    const currentUser = auth.currentUser;

    const email = currentUser?.email || state.user?.email || localStorage.getItem('user_email_v1') || 'Sin email';
    const name = currentUser?.displayName || state.user?.name || state.user?.displayName || localStorage.getItem('user_name_v1') || 'Usuario';
    const identity = state.user?.identity || localStorage.getItem('user_identity_v1') || 'No definida';
    const partner = state.user?.partner || { enabled: false, name: '', phone: '', contract: '' };

    return `
        <div class="page settings-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
            <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
                <div>
                    <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Configuración<span style="color: var(--text-secondary);">.</span></h1>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Gestión de cuenta e identidad</div>
                </div>
                <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box;">
                    ${iconSVG('menu', 20)}
                </button>
            </header>

            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Mi Identidad</h3>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1;">
                        <div id="identity-display" style="font-family: var(--font-serif); font-style: italic; color: var(--text-primary); font-size: 16px; line-height: 1.5;">${identity}</div>
                        <textarea id="identity-input" class="input" rows="3" style="display: none; margin-top: 10px; width: 100%; font-size: 14px;">${identity}</textarea>
                    </div>
                    <button id="edit-identity-btn" class="btn-secondary" style="width: auto; padding: 8px 16px; min-height: 40px;">
                        ${iconSVG('edit', 14)} Editar
                    </button>
                    <button id="save-identity-btn" class="btn-primary" style="display: none; width: auto; padding: 8px 16px; min-height: 40px;">
                        ${iconSVG('check', 14)} Guardar
                    </button>
                </div>
            </div>

            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <div id="partner-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${partner.enabled ? '16px' : '0'}; ${partner.enabled ? 'border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;' : ''}">
                    <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Socio Corresponsable</h3>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-primary);">
                        <input type="checkbox" id="partner-toggle" ${partner.enabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--text-primary);">
                        Activo
                    </label>
                </div>

                <div id="partner-fields" style="${partner.enabled ? '' : 'display: none;'}">
                    <div class="form-group" style="margin-bottom: 14px;">
                        <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; font-size: 13px;">Nombre del Socio</label>
                        <input type="text" id="settings-partner-name" class="input" value="${partner.name || ''}" placeholder="Ej. Carlos, Mamá..." style="width: 100%; min-height: 42px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 14px;">
                        <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; font-size: 13px;">WhatsApp / Teléfono</label>
                        <input type="tel" id="settings-partner-phone" class="input" value="${partner.phone || ''}" placeholder="+54 9 11..." style="width: 100%; min-height: 42px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; font-size: 13px;">Consecuencia (Contrato)</label>
                        <input type="text" id="settings-partner-contract" class="input" value="${partner.contract || ''}" placeholder="Ej. Pagar $500 si no cumplo" style="width: 100%; min-height: 42px;">
                    </div>

                    <button id="save-partner-btn" class="btn-primary" style="width: 100%; min-height: 44px; margin: 0;">Guardar Socio Corresponsable</button>
                </div>
            </div>

            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Mi Cuenta</h3>
                <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; color: var(--text-secondary);">Nombre</div>
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${name}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; color: var(--text-secondary);">Email</div>
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${email}</div>
                </div>
            </div>

            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Sincronización & Nube</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="sync-cloud-btn" class="btn-primary" style="width: 100%; font-size: 14px; padding: 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        ${iconSVG('check', 16)} Sincronizar Todos Mis Datos en la Nube
                    </button>
                </div>
            </div>

            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px; border: 1px solid rgba(229, 62, 62, 0.4); background: rgba(229, 62, 62, 0.04);">
                <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 8px; color: #E53E3E;">Zona de Peligro</h3>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.4;">
                    Si eliminás tu cuenta, se borrarán de forma <strong>permanente e irreversible</strong> todos tus hábitos, rutinas, perfil de piloto y datos de la base de datos en la nube. Podrás registrarte nuevamente en el futuro con el mismo email si lo deseás, pero comenzarás desde cero.
                </p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="delete-account-btn" style="width: 100%; font-size: 14px; padding: 13px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #E53E3E; color: #FFFFFF; border: none; font-weight: 700; cursor: pointer; transition: opacity 0.2s ease;">
                        ${iconSVG('trash', 16)} Eliminar Mi Cuenta y Datos Definitivamente
                    </button>
                </div>
            </div>
        </div>
    `;
}

export function mount() {
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
            localStorage.setItem('user_identity_v1', newIdentity);
            display.textContent = newIdentity;
            showToast('Identidad actualizada correctamente', 'success');
        }
        
        display.style.display = 'block';
        input.style.display = 'none';
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
    });

    const partnerToggle = document.getElementById('partner-toggle');
    const partnerFields = document.getElementById('partner-fields');

    partnerToggle?.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        const partnerHeader = document.getElementById('partner-header');
        if (partnerFields) partnerFields.style.display = enabled ? 'block' : 'none';
        if (partnerHeader) {
            partnerHeader.style.marginBottom = enabled ? '16px' : '0';
            partnerHeader.style.borderBottom = enabled ? '1px solid var(--border-subtle)' : 'none';
            partnerHeader.style.paddingBottom = enabled ? '10px' : '0';
        }
        store.saveUserProfile({
            partner: { ...(store.getState().user?.partner || {}), enabled }
        });
        showToast(enabled ? 'Socio Corresponsable activado' : 'Socio Corresponsable desactivado', 'info');
    });

    document.getElementById('save-partner-btn')?.addEventListener('click', () => {
        const name = document.getElementById('settings-partner-name')?.value.trim();
        const phone = document.getElementById('settings-partner-phone')?.value.trim();
        const contract = document.getElementById('settings-partner-contract')?.value.trim();

        store.saveUserProfile({
            partner: { enabled: partnerToggle?.checked ?? true, name, phone, contract }
        });
        showToast('Socio Corresponsable guardado', 'success');
    });

    document.getElementById('sync-cloud-btn')?.addEventListener('click', async () => {
        showToast('Sincronizando todos tus hábitos y tu piloto con la nube...', 'info');
        const success = await store.syncAllDataToCloud();
        if (success) {
            showToast('¡Todos tus datos se guardaron en la nube correctamente!', 'success');
        } else {
            showToast('Error al conectar con Firestore. Verifica tu conexión.', 'error');
        }
    });

    document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
        const confirmMsg = "⚠️ ¿ESTÁS ABSOLUTAMENTE SEGURO DE QUE QUERÉS ELIMINAR TU CUENTA?\n\nEsta acción ELIMINARÁ PERMANENTEMENTE todos tus hábitos, rutinas, historial, ficha de piloto y tu usuario de la base de datos en la nube. Podrás volver a registrarte en el futuro pero tus datos actuales se perderán para siempre.";
        if (confirm(confirmMsg)) {
            showToast('Eliminando tu cuenta y datos de la base de datos...', 'info');
            const res = await deleteAccountAndAllData();
            if (res.success) {
                localStorage.clear();
                showToast('Cuenta y datos eliminados con éxito.', 'success');
                setTimeout(() => {
                    navigate('/login');
                    window.location.reload();
                }, 1200);
            } else {
                showToast('Error al eliminar cuenta: ' + (res.error || ''), 'error');
            }
        }
    });
}

export function unmount() {
}
