import { iconSVG } from './icons.js';
import { getRandomSuccessMessage, getRandomErrorMessage } from '../radioMessages.js';
import { getOVRColor } from '../driverEngine.js';

export function showTelemetryRadioPopup(delta, newOvr, teamName) {
  document.getElementById('telemetry-radio-modal')?.remove();

  const isSuccess = delta > 0;
  const radioMsg = isSuccess ? getRandomSuccessMessage() : getRandomErrorMessage();
  const ovrColor = getOVRColor(newOvr);

  const titleText = isSuccess ? '¡MEJORA DE RENDIMIENTO!' : '¡PÉRDIDA DE RENDIMIENTO!';
  const deltaBadge = isSuccess ? '+1 OVR' : '-1 OVR';
  const badgeColor = isSuccess ? '#48BB78' : '#F56565';

  const modalHtml = `
    <div id="telemetry-radio-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.25s ease;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        
        <!-- Radio Telemetry Badge Header -->
        <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 16px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${badgeColor}; display: inline-block; animation: pulse 1.5s infinite;"></span>
          RADIO DE BOXES • TELEMETRÍA EN VIVO
        </div>

        <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 6px 0; color: var(--text-primary);">${titleText}</h3>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 16px 0;">
          <div style="font-size: 14px; font-weight: 700; color: ${badgeColor}; background: rgba(255,255,255,0.06); padding: 6px 14px; border-radius: 12px; border: 1px solid ${badgeColor};">
            ${deltaBadge}
          </div>
          <div style="font-size: 20px; font-weight: 700; color: ${ovrColor}; background: rgba(0,0,0,0.4); padding: 4px 14px; border-radius: 12px; border: 1px solid ${ovrColor};">
            OVR ${newOvr}
          </div>
        </div>

        <!-- Radio Message Box -->
        <div style="padding: 16px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 14px; margin-bottom: 20px; text-align: left; position: relative;">
          <div style="font-size: 11px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            ${iconSVG('info', 14)} Ingeniero de Pista (${teamName}):
          </div>
          <div style="font-size: 14px; color: var(--text-primary); font-style: italic; font-family: var(--font-serif); line-height: 1.4;">
            "${radioMsg}"
          </div>
        </div>

        <button id="btn-close-telemetry" class="btn-primary" style="width: 100%; min-height: 48px; font-size: 14px;">
          Entendido, Volver a Pista
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-close-telemetry')?.addEventListener('click', () => {
    document.getElementById('telemetry-radio-modal')?.remove();
  });
}
