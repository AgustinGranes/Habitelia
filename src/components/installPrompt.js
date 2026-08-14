import { iconSVG } from './icons.js';

let deferredPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export function showInstallPromptIfNeeded() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true || 
                     document.referrer.includes('android-app://');

  if (isStandalone) {
    return;
  }

  // Remove existing prompt if any
  document.getElementById('pwa-install-modal')?.remove();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  let instructionsHtml = '';
  if (isIOS) {
    instructionsHtml = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px 16px; border-radius: 14px; text-align: left; margin-bottom: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          ${iconSVG('info', 16)} Pasos para instalar en iOS (Safari):
        </div>
        1. Tocá el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba) en la barra del navegador.<br>
        2. Deslizá hacia abajo y seleccioná <strong>"Agregar a pantalla de inicio"</strong>.<br>
        3. Tocá <strong>"Agregar"</strong> arriba a la derecha.
      </div>
    `;
  } else {
    instructionsHtml = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px 16px; border-radius: 14px; text-align: left; margin-bottom: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          ${iconSVG('info', 16)} Pasos para instalar:
        </div>
        Instalá Habitelia en tu pantalla de inicio para una experiencia fluida de app nativa, con acceso rápido y pantalla completa.
      </div>
    `;
  }

  const modalHtml = `
    <div id="pwa-install-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.25s ease;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-strong); background: var(--bg-surface); text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.9);">
        
        <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--text-primary); color: var(--bg-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-family: var(--font-serif); font-size: 28px; font-weight: bold;">
          H
        </div>

        <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 8px 0; color: var(--text-primary);">Instalá Habitelia</h3>
        
        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.4;">
          Agregá la app a la pantalla de inicio de tu teléfono para ingresar directamente sin barra de navegador.
        </p>

        ${instructionsHtml}

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="btn-install-pwa" class="btn-primary" style="min-height: 48px; font-size: 14px;">
            ${iconSVG('plus', 18)} Agregar a Pantalla de Inicio
          </button>
          <button id="btn-dismiss-pwa" class="btn-secondary" style="min-height: 44px; font-size: 13.5px; color: var(--text-secondary);">
            Ahora no
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-dismiss-pwa')?.addEventListener('click', () => {
    document.getElementById('pwa-install-modal')?.remove();
  });

  document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('pwa-install-modal')?.remove();
      }
    } else {
      // If no native prompt API, we keep instructions or alert
      if (!isIOS) {
        alert('Para agregar la app: abrí el menú de tu navegador (tres puntos ⋮) y selecciona "Agregar a pantalla de inicio" o "Instalar aplicación".');
      }
    }
  });
}
