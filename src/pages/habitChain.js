import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';

let selectedHabitId = null;

function renderHeatmapGrid(habit) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayLabels = ['', 'Lun', '', 'Mié', '', 'Vie', ''];
  
  const today = new Date();
  const days = [];
  
  // Build 364 days ending today
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isCompleted = habit?.completions?.[dateStr] === 'completed';
    days.push({ dateStr, isCompleted });
  }

  const weeks = [];
  for (let w = 0; w < 52; w++) {
    weeks.push(days.slice(w * 7, (w + 1) * 7));
  }

  const monthsHeader = `
    <div style="display: flex; justify-content: space-between; margin-left: 36px; margin-bottom: 10px; font-size: 11px; color: var(--text-tertiary); font-weight: 500;">
      ${months.map(m => `<span>${m}</span>`).join('')}
    </div>
  `;

  const gridRows = dayLabels.map((label, dayIdx) => {
    const cells = weeks.map(week => {
      const dayData = week[dayIdx] || {};
      const color = dayData.isCompleted ? 'var(--text-primary)' : 'var(--bg-subtle)';
      const border = dayData.isCompleted ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)';
      return `<div title="${dayData.dateStr || ''}" style="width: 10px; height: 10px; border-radius: 2px; background: ${color}; border: ${border}; flex-shrink: 0; transition: background 0.2s;"></div>`;
    }).join('');

    return `
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 30px; font-size: 10px; color: var(--text-tertiary); text-align: right; margin-right: 6px;">${label}</span>
        <div style="display: flex; gap: 3px;">${cells}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="heatmap-container glass-card" style="padding: 24px; border-radius: 18px; overflow-x: auto;">
      <div style="min-width: 600px;">
        ${monthsHeader}
        <div style="display: flex; flex-direction: column; gap: 3px;">
          ${gridRows}
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 16px; font-size: 11px; color: var(--text-secondary);">
        <span>Menos</span>
        <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--bg-subtle); border: 1px solid var(--border-subtle);"></div>
        <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--text-tertiary);"></div>
        <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--text-secondary);"></div>
        <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--text-primary);"></div>
        <span>Más</span>
      </div>
    </div>
  `;
}

export function render() {
  const state = store.getState();
  const habits = state.habits || [];
  
  if (habits.length === 0) {
    return `
      <div class="page habit-chain-page" style="padding: 24px 20px 100px 20px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
          <div>
            <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Mi Cadena.</h1>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Nunca rompas la cadena</div>
          </div>
          <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            ${iconSVG('menu', 20)}
          </button>
        </header>

        <div class="glass-card" style="text-align: center; padding: 48px 24px; border-radius: 20px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--text-secondary);">
            ${iconSVG('chain', 24)}
          </div>
          <h3 class="editorial-title" style="font-size: 22px; margin-bottom: 8px;">Aún no tienes hábitos</h3>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px;">Creá tu primer hábito para ver tu gráfico de constancia.</p>
          <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 240px; margin: 0 auto;">
            ${iconSVG('plus', 16)} Crear Hábito
          </button>
        </div>
      </div>
    `;
  }

  if (!selectedHabitId || !habits.find(h => h.id === selectedHabitId)) {
    selectedHabitId = habits[0].id;
  }
  
  const habit = habits.find(h => h.id === selectedHabitId) || habits[0];
  
  const optionsHtml = habits.map(h => 
    `<option value="${h.id}" ${h.id === selectedHabitId ? 'selected' : ''}>${h.name}</option>`
  ).join('');

  return `
    <div class="page habit-chain-page" style="padding: 24px 20px 100px 20px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Mi Cadena<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Visualización de constancia de alto rendimiento</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <div style="margin-bottom: 24px;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Seleccionar Hábito</label>
        <select id="habit-selector" class="input" style="width: 100%; min-height: 48px; font-size: 14px; border-radius: 12px;">
          ${optionsHtml}
        </select>
      </div>

      <!-- Streak Counter Monochromatic Card -->
      <div class="glass-card" style="text-align: center; padding: 32px 24px; border-radius: 20px; margin-bottom: 28px; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px; color: var(--text-primary);">
          ${iconSVG('flame', 28)}
          <span style="font-family: var(--font-serif); font-size: 42px; font-weight: 400; line-height: 1;">
            ${habit.streak || 0} Días de Racha
          </span>
        </div>
        <div style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
          Racha Máxima: <strong style="color: var(--text-primary);">${habit.maxStreak || habit.streak || 0} días</strong> • Total: <strong style="color: var(--text-primary);">${habit.totalCompletions || (habit.streak || 0)} repeticiones</strong>
        </div>
      </div>

      <div style="margin-bottom: 28px;">
        <h3 class="editorial-title" style="font-size: 20px; margin: 0 0 16px 0;">Historial de Constancia (52 Semanas)</h3>
        ${renderHeatmapGrid(habit)}
      </div>

      ${habit.reward?.partnerName ? `
      <div class="glass-card" style="padding: 24px; border-radius: 18px;">
        <h4 style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          ${iconSVG('user', 18)} Socio Corresponsable
        </h4>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
          ${habit.reward.partnerName} ${habit.reward.partnerPhone ? `(${habit.reward.partnerPhone})` : ''}
        </div>
        <button id="btn-notify" class="btn-secondary" style="width: 100%;">
          ${iconSVG('info', 16)} Notificar Logro a mi Socio
        </button>
      </div>
      ` : ''}
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

  const selector = document.getElementById('habit-selector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      selectedHabitId = e.target.value;
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = render();
        mount();
      }
    });
  }

  document.getElementById('btn-notify')?.addEventListener('click', () => {
    const state = store.getState();
    const habit = state.habits.find(h => h.id === selectedHabitId);
    if (habit && habit.reward?.partnerPhone) {
      const msg = encodeURIComponent(`¡Hola ${habit.reward.partnerName}! Mantuve mi racha de ${habit.streak || 1} días en el hábito "${habit.name}" con Habitelia.`);
      window.open(`https://wa.me/${habit.reward.partnerPhone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    } else {
      showToast('No hay número cargado para el socio corresponsable', 'info');
    }
  });
}

export function unmount() {
}
