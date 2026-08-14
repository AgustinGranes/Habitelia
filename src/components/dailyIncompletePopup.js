import { iconSVG } from './icons.js';

export function showDailyIncompletePopup({ uncompletedHabits = [], partner = null, driverActive = false, ovrDelta = 0, newOvr = 50, teamName = 'Apex' }) {
  document.getElementById('daily-incomplete-modal')?.remove();

  const partnerActive = partner && partner.enabled && partner.name;
  const habitNamesList = uncompletedHabits.map(h => `- ${typeof h === 'string' ? h : (h.name || h.habitName || 'Hábito')}`).join('\n');

  let whatsappLink = '';
  if (partnerActive && partner.phone) {
    const rawPhone = partner.phone.replace(/[^0-9]/g, '');
    const msgText = `Hola ${partner.name}, no completé los siguientes hábitos en Habitelia:\n${habitNamesList}${partner.contract ? `\n\nConsecuencia acordada: ${partner.contract}` : ''}`;
    whatsappLink = `https://wa.me/${rawPhone}?text=${encodeURIComponent(msgText)}`;
  }

  let bodyContent = '';

  if (driverActive && partnerActive) {
    // Both active
    bodyContent = `
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; background: rgba(245, 101, 101, 0.15); border: 1px solid #F56565; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #F56565; margin-bottom: 16px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #F56565; display: inline-block; animation: pulse 1.5s infinite;"></span>
        PÉRDIDA DE RENDIMIENTO & SOCIO CORRESPONSABLE
      </div>

      <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 8px 0; color: var(--text-primary);">¡Día Incompleto!</h3>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 12px 0 16px 0;">
        <div style="font-size: 14px; font-weight: 700; color: #F56565; background: rgba(255,255,255,0.06); padding: 6px 14px; border-radius: 12px; border: 1px solid #F56565;">
          ${ovrDelta} OVR
        </div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); background: rgba(0,0,0,0.4); padding: 4px 14px; border-radius: 12px; border: 1px solid var(--border-subtle);">
          Nuevo OVR: ${newOvr}
        </div>
      </div>

      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px; text-align: left; margin-bottom: 16px; font-size: 13px;">
        <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">
          Hábitos no completados (${uncompletedHabits.length}):
        </div>
        <div style="color: var(--text-primary); line-height: 1.5; font-size: 13.5px;">
          ${uncompletedHabits.map(h => `<div style="display: flex; align-items: center; gap: 6px;">${iconSVG('x', 14)} <span>${typeof h === 'string' ? h : (h.name || h.habitName || 'Hábito')}</span></div>`).join('')}
        </div>
      </div>

      ${whatsappLink ? `
        <a href="${whatsappLink}" target="_blank" class="btn-primary" style="min-height: 48px; font-size: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; background: #25D366; border-color: #25D366; color: #FFFFFF;">
          ${iconSVG('share', 18)} Notificar a ${partner.name} por WhatsApp
        </a>
      ` : ''}
    `;
  } else if (!driverActive && partnerActive) {
    // Only Partner active
    bodyContent = `
      <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
        ${iconSVG('user', 24)}
      </div>

      <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 8px 0; color: var(--text-primary);">Socio Corresponsable</h3>
      <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.4;">
        No completaste todos tus hábitos del día. Tu socio corresponsable debe estar al tanto.
      </p>

      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px; text-align: left; margin-bottom: 20px; font-size: 13px;">
        <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">
          Hábitos no completados (${uncompletedHabits.length}):
        </div>
        <div style="color: var(--text-primary); line-height: 1.5; font-size: 13.5px;">
          ${uncompletedHabits.map(h => `<div style="display: flex; align-items: center; gap: 6px;">${iconSVG('x', 14)} <span>${typeof h === 'string' ? h : (h.name || h.habitName || 'Hábito')}</span></div>`).join('')}
        </div>
        ${partner.contract ? `
          <div style="margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 8px; font-style: italic; color: var(--text-secondary); font-size: 12px;">
            Contrato / Consecuencia: ${partner.contract}
          </div>
        ` : ''}
      </div>

      ${whatsappLink ? `
        <a href="${whatsappLink}" target="_blank" class="btn-primary" style="min-height: 48px; font-size: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; background: #25D366; border-color: #25D366; color: #FFFFFF;">
          ${iconSVG('share', 18)} Notificar a ${partner.name} por WhatsApp
        </a>
      ` : ''}
    `;
  } else if (driverActive && !partnerActive) {
    // Only Driver active: standard telemetry popups handle this, but if called, render driver penalty
    bodyContent = `
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; background: rgba(245, 101, 101, 0.15); border: 1px solid #F56565; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #F56565; margin-bottom: 16px;">
        PÉRDIDA DE RENDIMIENTO
      </div>

      <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 8px 0; color: var(--text-primary);">¡Atención Piloto!</h3>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 12px 0 16px 0;">
        <div style="font-size: 14px; font-weight: 700; color: #F56565; background: rgba(255,255,255,0.06); padding: 6px 14px; border-radius: 12px; border: 1px solid #F56565;">
          ${ovrDelta} OVR
        </div>
        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); background: rgba(0,0,0,0.4); padding: 4px 14px; border-radius: 12px; border: 1px solid var(--border-subtle);">
          OVR ${newOvr}
        </div>
      </div>

      <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px; text-align: left; margin-bottom: 20px; font-size: 13px;">
        <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">
          Hábitos no completados (${uncompletedHabits.length}):
        </div>
        <div style="color: var(--text-primary); line-height: 1.5; font-size: 13.5px;">
          ${uncompletedHabits.map(h => `<div style="display: flex; align-items: center; gap: 6px;">${iconSVG('x', 14)} <span>${typeof h === 'string' ? h : (h.name || h.habitName || 'Hábito')}</span></div>`).join('')}
        </div>
      </div>
    `;
  } else {
    // Neither Driver nor Partner active: Encouraging popup
    bodyContent = `
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
        ${iconSVG('flame', 28)}
      </div>

      <h3 class="editorial-title" style="font-size: 26px; margin: 0 0 8px 0; color: var(--text-primary);">¡No te rindas!</h3>
      
      <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
        Ayer no lograste completar todos tus hábitos, pero recordá: <strong>un tropiezo no define tu identidad</strong>. Lo importante es levantarte y retomar el control hoy.
      </p>

      ${uncompletedHabits.length > 0 ? `
        <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px; text-align: left; margin-bottom: 20px; font-size: 13px;">
          <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">
            Pendientes de ayer (${uncompletedHabits.length}):
          </div>
          <div style="color: var(--text-primary); line-height: 1.5; font-size: 13.5px;">
            ${uncompletedHabits.map(h => `<div style="display: flex; align-items: center; gap: 6px;">${iconSVG('target', 14)} <span>${typeof h === 'string' ? h : (h.name || h.habitName || 'Hábito')}</span></div>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  const modalHtml = `
    <div id="daily-incomplete-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.25s ease;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.9);">
        
        ${bodyContent}

        <button id="btn-close-daily-incomplete" class="btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px;">
          Entendido, ¡A enfocarme hoy!
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-close-daily-incomplete')?.addEventListener('click', () => {
    document.getElementById('daily-incomplete-modal')?.remove();
  });
}
