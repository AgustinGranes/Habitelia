import { iconSVG } from './icons.js';

// Format a date string (YYYY-MM-DD) into a human-readable label
function formatDateLabel(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, yesterday)) return 'Ayer';
  if (isSameDay(d, today)) return 'Hoy';

  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, c => c.toUpperCase());
}

function formatShortDate(dateStr) {
  if (!dateStr || dateStr === 'sin-fecha') return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parts[2].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  return `${day}/${month}`;
}

function buildHabitsListHtml(uncompletedHabits) {
  return uncompletedHabits.map(h => {
    const rawName = typeof h === 'string' ? h : (h.name || h.habitName || 'Hábito');
    const evalDate = typeof h === 'object' && h._evalDate ? h._evalDate : null;
    const dateTag = evalDate ? formatShortDate(evalDate) : '';
    const displayText = dateTag ? `${rawName} - ${dateTag}` : rawName;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; margin-bottom: 5px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${iconSVG('x', 14)}
          <span style="font-size: 13.5px; font-weight: 600; color: var(--text-primary);">${displayText}</span>
        </div>
        <span style="font-size: 11px; font-weight: 700; color: #F56565; background: rgba(245,101,101,0.12); padding: 2px 6px; border-radius: 6px;">-1 OVR</span>
      </div>
    `;
  }).join('');
}

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

  // ---- Shared habits-by-day panel ----
  const habitsPanel = uncompletedHabits.length > 0 ? `
    <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px; text-align: left; margin-bottom: 16px;">
      <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.08em;">
        Hábitos incumplidos — ${ovrDelta} OVR total
      </div>
      ${buildHabitsListHtml(uncompletedHabits)}
    </div>
  ` : '';

  // ---- OVR badge (only when driver active) ----
  const ovrBadge = driverActive ? `
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 12px 0 16px 0;">
      <div style="font-size: 14px; font-weight: 700; color: #F56565; background: rgba(245,101,101,0.1); padding: 6px 14px; border-radius: 12px; border: 1px solid #F56565;">
        ${ovrDelta} OVR
      </div>
      <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); background: rgba(0,0,0,0.3); padding: 4px 14px; border-radius: 12px; border: 1px solid var(--border-subtle);">
        Nuevo OVR: ${newOvr}
      </div>
    </div>
  ` : '';

  let bodyContent = '';

  if (driverActive && partnerActive) {
    bodyContent = `
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; background: rgba(245,101,101,0.15); border: 1px solid #F56565; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #F56565; margin-bottom: 14px;">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #F56565; display: inline-block; animation: pulse 1.5s infinite;"></span>
        PÉRDIDA DE RENDIMIENTO &amp; SOCIO CORRESPONSABLE
      </div>
      <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 4px 0; color: var(--text-primary);">¡Días Incompletos!</h3>
      ${ovrBadge}
      ${habitsPanel}
      ${whatsappLink ? `
        <a href="${whatsappLink}" target="_blank" class="btn-primary" style="min-height: 48px; font-size: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; background: #25D366; border-color: #25D366; color: #FFFFFF;">
          ${iconSVG('share', 18)} Notificar a ${partner.name} por WhatsApp
        </a>
      ` : ''}
    `;
  } else if (!driverActive && partnerActive) {
    bodyContent = `
      <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
        ${iconSVG('user', 22)}
      </div>
      <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 6px 0; color: var(--text-primary);">Socio Corresponsable</h3>
      <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">
        No completaste todos tus hábitos de los días previos. Tu socio debe estar al tanto.
      </p>
      ${habitsPanel}
      ${partner.contract ? `
        <div style="font-style: italic; color: var(--text-secondary); font-size: 12px; margin-bottom: 14px; padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: 10px; text-align: left;">
          Contrato / Consecuencia: ${partner.contract}
        </div>
      ` : ''}
      ${whatsappLink ? `
        <a href="${whatsappLink}" target="_blank" class="btn-primary" style="min-height: 48px; font-size: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; background: #25D366; border-color: #25D366; color: #FFFFFF;">
          ${iconSVG('share', 18)} Notificar a ${partner.name} por WhatsApp
        </a>
      ` : ''}
    `;
  } else if (driverActive && !partnerActive) {
    bodyContent = `
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; background: rgba(245,101,101,0.15); border: 1px solid #F56565; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #F56565; margin-bottom: 14px;">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #F56565; display: inline-block; animation: pulse 1.5s infinite;"></span>
        PÉRDIDA DE RENDIMIENTO
      </div>
      <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 4px 0; color: var(--text-primary);">¡Atención Piloto!</h3>
      ${ovrBadge}
      ${habitsPanel}
    `;
  } else {
    // No driver, no partner — motivational
    bodyContent = `
      <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
        ${iconSVG('flame', 26)}
      </div>
      <h3 class="editorial-title" style="font-size: 26px; margin: 0 0 8px 0; color: var(--text-primary);">¡No te rindas!</h3>
      <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
        No completaste todos tus hábitos de los días anteriores, pero recordá: <strong>un tropiezo no define tu identidad</strong>. Lo importante es retomar el control hoy.
      </p>
      ${habitsPanel}
    `;
  }

  const modalHtml = `
    <div id="daily-incomplete-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.25s ease;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.9); max-height: 88vh; overflow-y: auto;">
        
        ${bodyContent}

        <button id="btn-close-daily-incomplete" class="btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px; margin-top: 4px;">
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
