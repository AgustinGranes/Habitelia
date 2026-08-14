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
      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: 12px; text-align: left; margin-bottom: 14px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          ${iconSVG('info', 15)} Instalar en iOS (Safari):
        </div>
        1. Tocá <strong>Compartir</strong> (ícono de cuadro con flecha).<br>
        2. Seleccioná <strong>"Agregar a pantalla de inicio"</strong>.
      </div>
    `;
  } else {
    instructionsHtml = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: 12px; text-align: left; margin-bottom: 14px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
        Agregá Habitelia a tu pantalla de inicio para una experiencia fluida como app nativa.
      </div>
    `;
  }

  const modalHtml = `
    <div id="pwa-install-modal" style="position: fixed; bottom: 24px; left: 20px; right: 20px; max-width: 440px; margin: 0 auto; z-index: 9999; animation: fadeIn 0.3s ease;">
      <div class="glass-card" style="width: 100%; padding: 20px; border-radius: 20px; border: 1px solid var(--border-strong); background: var(--bg-surface); text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,0.6); box-sizing: border-box;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--text-primary); color: var(--bg-primary); display: flex; align-items: center; justify-content: center; font-family: var(--font-serif); font-size: 20px; font-weight: bold;">
              H
            </div>
            <div style="font-weight: 700; font-size: 16px; color: var(--text-primary); text-align: left;">Instalar Habitelia</div>
          </div>
          <button id="btn-dismiss-pwa-top" style="background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px;">
            ${iconSVG('x', 18)}
          </button>
        </div>

        ${instructionsHtml}

        <div style="display: flex; gap: 10px;">
          <button id="btn-dismiss-pwa" class="btn-secondary" style="flex: 1; min-height: 42px; font-size: 13px; color: var(--text-secondary);">
            Ahora no
          </button>
          <button id="btn-install-pwa" class="btn-primary" style="flex: 1.5; min-height: 42px; font-size: 13px;">
            ${iconSVG('plus', 16)} Agregar a Inicio
          </button>
        </div>

      </div>
    </div>
  `;

  if (document.body) {
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeHandler = () => document.getElementById('pwa-install-modal')?.remove();
    document.getElementById('btn-dismiss-pwa')?.addEventListener('click', closeHandler);
    document.getElementById('btn-dismiss-pwa-top')?.addEventListener('click', closeHandler);

    document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          deferredPrompt = null;
          closeHandler();
        }
      } else {
        if (!isIOS) {
          alert('Para agregar la app: abrí el menú de tu navegador (tres puntos ⋮) y selecciona "Agregar a pantalla de inicio".');
        }
      }
    });
  }
}
