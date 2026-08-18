import { store } from '../store.js';
import { auth, deleteAccountAndAllData } from '../firebase.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { THEMES, applyTheme } from '../utils/theme.js';
import { 
    getNotificationPermission, 
    requestNotificationPermission, 
    areNotificationsEnabled, 
    setNotificationsEnabled, 
    sendTestNotification 
} from '../services/notifications.js';

export function render(props = {}) {
    const state = store.getState();
    const currentUser = auth.currentUser;

    const email = currentUser?.email || state.user?.email || localStorage.getItem('user_email_v1') || 'Sin email';
    const name = currentUser?.displayName || state.user?.name || state.user?.displayName || localStorage.getItem('user_name_v1') || 'Usuario';
    const identity = state.user?.identity || localStorage.getItem('user_identity_v1') || 'No definida';
    const partner = state.user?.partner || { enabled: false, name: '', phone: '', contract: '' };
    const currentTheme = localStorage.getItem('app_theme_key') || 'obsidian';
    const showTodosInHome = state.user?.settings?.showTodosInHome !== false;
    const notifStatus = getNotificationPermission();
    const notifsEnabled = areNotificationsEnabled();

    return `
        <div class="page settings-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
            <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; width: 100%;">
                <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; margin-top: 2px;">
                    ${iconSVG('menu', 20)}
                </button>
                <div style="flex: 1; min-width: 0;">
                    <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Configuración<span style="color: var(--text-secondary);">.</span></h1>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Gestión de cuenta e identidad</div>
                </div>
            </header>

            <!-- Personalización de Colores & Tema -->
            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Personalización de Colores</h3>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">Seleccioná la paleta de colores para toda la aplicación:</div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px;">
                    ${Object.keys(THEMES).map(key => {
                        const t = THEMES[key];
                        const isSel = currentTheme === key;
                        return `
                            <button class="btn-theme-select" data-theme="${key}" style="padding: 12px; border-radius: 12px; border: 2px solid ${isSel ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${t.bgSurface}; color: ${t.textPrimary}; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: transform 0.15s ease;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${t.accentPrimary}; border: 1px solid ${t.borderSubtle};"></div>
                                <span style="font-size: 11.5px; font-weight: 700; text-align: center;">${t.name}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Preferencias de Inicio / Rutina -->
            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Preferencias de Visualización</h3>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">Mostrar Tareas (To-Do) en Inicio y Rutina</div>
                        <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">Ver los eventos de tu lista To-Do junto con tus hábitos diarios.</div>
                    </div>
                    <label style="display: flex; align-items: center; cursor: pointer; flex-shrink: 0; margin-left: 14px;">
                        <input type="checkbox" id="todos-in-home-toggle" ${showTodosInHome ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--text-primary);">
                    </label>
                </div>
            </div>

            <!-- Notificaciones & Recordatorios PWA -->
            <div class="glass-card" style="margin-bottom: 24px; padding: 24px; border-radius: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
                    <h3 class="editorial-title" style="font-size: 20px; margin: 0; display: flex; align-items: center; gap: 8px;">
                        ${iconSVG('bell', 20)} Notificaciones
                    </h3>
                    <span id="notif-status-badge" style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; ${notifStatus === 'granted' ? 'background: rgba(46,125,50,0.15); color: #4CAF50; border: 1px solid rgba(46,125,50,0.3);' : (notifStatus === 'denied' ? 'background: rgba(229,62,62,0.15); color: #E53E3E; border: 1px solid rgba(229,62,62,0.3);' : 'background: var(--bg-subtle); color: var(--text-secondary); border: 1px solid var(--border-subtle);')}">
                        ${notifStatus === 'granted' ? '✓ Activas' : (notifStatus === 'denied' ? 'Bloqueadas' : 'Pendientes')}
                    </span>
                </div>

                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px 0;">
                    Recibí avisos en tu dispositivo en el horario exacto de tus hábitos y tareas programadas para no romper tu racha.
                </p>

                ${notifStatus !== 'granted' ? `
                    <button id="btn-request-notif-perm" class="btn-primary" style="width: 100%; min-height: 44px; margin-bottom: 6px; font-size: 13.5px;">
                        ${iconSVG('bell', 16)} Activar Notificaciones en este Dispositivo
                    </button>
                    ${notifStatus === 'denied' ? `
                        <div style="font-size: 12px; color: #E53E3E; margin-top: 6px;">
                            Las notificaciones están bloqueadas en tu navegador. Podés habilitarlas desde la configuración de permisos del sitio.
                        </div>
                    ` : ''}
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">Avisos de hábitos y tareas</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Enviar alertas cuando sea momento de cumplir un hábito</div>
                            </div>
                            <label style="display: flex; align-items: center; cursor: pointer; flex-shrink: 0; margin-left: 14px;">
                                <input type="checkbox" id="toggle-notif-reminders" ${notifsEnabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--text-primary);">
                            </label>
                        </div>
                        <button id="btn-test-notif" class="btn-secondary" style="width: 100%; min-height: 40px; font-size: 13px; margin-top: 4px;">
                            ${iconSVG('bell', 15)} Enviar Notificación de Prueba
                        </button>
                    </div>
                `}
            </div>

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

            <!-- Delete Account In-App Modal Popup -->
            <div id="delete-account-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
                <div class="glass-card" style="background: #0D0D0D; border: 1px solid var(--border-subtle); border-radius: 24px; padding: 28px 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.9); box-sizing: border-box;">
                    
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(229, 62, 62, 0.15); color: #E53E3E; border: 1px solid rgba(229, 62, 62, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                        ${iconSVG('alert', 24)}
                    </div>

                    <h3 class="editorial-title" style="font-size: 22px; margin-bottom: 8px; color: var(--text-primary);">¿Eliminar Cuenta Definitivamente?</h3>
                    
                    <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
                        Esta acción eliminará <strong>permanentemente</strong> todos tus hábitos, rutinas, historial, ficha de piloto y tu usuario de la base de datos en la nube.
                    </p>



                    <div style="display: flex; gap: 12px;">
                        <button id="cancel-delete-modal-btn" class="btn-secondary" style="flex: 1; min-height: 44px; font-size: 13.5px; margin: 0;">
                            Cancelar
                        </button>
                        <button id="confirm-delete-modal-btn" style="flex: 1; min-height: 44px; font-size: 13.5px; background: #E53E3E; color: #FFFFFF; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; margin: 0;">
                            Sí, Eliminar
                        </button>
                    </div>

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

    document.querySelectorAll('.btn-theme-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const themeKey = e.currentTarget.dataset.theme;
            applyTheme(themeKey);
            showToast(`Tema "${THEMES[themeKey]?.name || themeKey}" aplicado`, 'success');
            const pageContent = document.querySelector('.settings-page');
            if (pageContent) {
                pageContent.outerHTML = render();
                mount();
            }
        });
    });

    document.getElementById('todos-in-home-toggle')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const currentSettings = store.getState().user?.settings || {};
        store.saveUserProfile({
            settings: { ...currentSettings, showTodosInHome: checked }
        });
        showToast(checked ? 'Tareas activadas en Inicio y Rutina' : 'Tareas ocultas en Inicio y Rutina', 'info');
    });

    // Notificaciones PWA
    document.getElementById('btn-request-notif-perm')?.addEventListener('click', async () => {
        const res = await requestNotificationPermission();
        if (res === 'granted') {
            showToast('¡Notificaciones activadas con éxito!', 'success');
            navigate('/settings');
        } else if (res === 'denied') {
            showToast('Permiso de notificaciones denegado en el navegador.', 'warning');
            navigate('/settings');
        } else {
            showToast('Tu navegador no soporta notificaciones nativas.', 'info');
        }
    });

    document.getElementById('toggle-notif-reminders')?.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        setNotificationsEnabled(enabled);
        showToast(enabled ? 'Recordatorios automáticos activados' : 'Recordatorios desactivados', 'info');
    });

    document.getElementById('btn-test-notif')?.addEventListener('click', async () => {
        const sent = await sendTestNotification();
        if (sent) {
            showToast('Notificación de prueba enviada', 'success');
        } else {
            showToast('No se pudo enviar la notificación. Verifica los permisos.', 'warning');
        }
    });

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

    const modal = document.getElementById('delete-account-modal');

    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'flex';
    });

    document.getElementById('cancel-delete-modal-btn')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('confirm-delete-modal-btn')?.addEventListener('click', async () => {
        showToast('Eliminando tu cuenta y cerrando sesión...', 'info');
        
        const res = await deleteAccountAndAllData();
        if (res.success) {
            if (modal) modal.style.display = 'none';
            localStorage.clear();
            store.setState({ user: null, habits: [], routines: [], driverProfile: null });
            showToast('Cuenta eliminada y sesión cerrada.', 'success');
            navigate('/login');
        } else {
            showToast(res.error || 'Error al eliminar cuenta.', 'error');
        }
    });
}

export function unmount() {
}
