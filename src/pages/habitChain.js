import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

let selectedHabitId = null;

function renderHeatmapGrid(habit) {
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  
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
    <div style="display: flex; justify-content: space-between; margin-left: 36px; margin-bottom: 8px; font-size: 11px; color: var(--text-muted); padding-right: 10px;">
      ${months.map(m => `<span>${m}</span>`).join('')}
    </div>
  `;

  const gridRows = dayLabels.map((label, dayIdx) => {
    const cells = weeks.map(week => {
      const dayData = week[dayIdx] || {};
      const color = dayData.isCompleted ? '#4CAF50' : 'rgba(255, 255, 255, 0.05)';
      const border = dayData.isCompleted ? '1px solid #81C784' : '1px solid rgba(255, 255, 255, 0.03)';
      return `<div title="${dayData.dateStr || ''}" style="width: 10px; height: 10px; border-radius: 2px; background: ${color}; border: ${border}; flex-shrink: 0;"></div>`;
    }).join('');

    return `
      <div style="display: flex; align-items: center; gap: 3px;">
        <span style="width: 30px; font-size: 10px; color: var(--text-muted); text-align: right; margin-right: 6px;">${label}</span>
        <div style="display: flex; gap: 3px;">${cells}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="heatmap-container" style="background: rgba(10, 10, 14, 0.95); padding: 20px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); overflow-x: auto;">
      <div style="min-width: 600px;">
        ${monthsHeader}
        <div style="display: flex; flex-direction: column; gap: 3px;">
          ${gridRows}
        </div>
      </div>
    </div>
  `;
}

export function render() {
  const state = store.getState();
  const habits = state.habits || [];
  
  if (habits.length === 0) {
    return `
      <div class="page habit-chain-page" style="padding: 24px 20px 100px 20px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box; overflow-y: auto;">
        <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
            <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Mi Cadena</h1>
          </div>
        </header>

        <div class="empty-state glass-card" style="text-align: center; padding: 48px 24px; border-radius: 24px;">
          <div style="font-size: 56px; margin-bottom: 16px;">🔗</div>
          <h3 style="font-family: 'Playfair Display', serif; font-size: 24px; color: #fff; margin-bottom: 8px;">Aún no tenés hábitos</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Creá tu primer hábito para ver tu gráfico de constancia.</p>
          <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 240px; margin: 0 auto;">+ Crear Hábito</button>
        </div>
      </div>
    `;
  }

  if (!selectedHabitId || !habits.find(h => h.id === selectedHabitId)) {
    selectedHabitId = habits[0].id;
  }
  
  const habit = habits.find(h => h.id === selectedHabitId) || habits[0];
  
  const optionsHtml = habits.map(h => 
    `<option value="${h.id}" ${h.id === selectedHabitId ? 'selected' : ''}>${h.icon || '🎯'} ${h.name}</option>`
  ).join('');

  return `
    <div class="page habit-chain-page" style="padding: 24px 20px 100px 20px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box; overflow-y: auto;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
          <div>
            <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Mi Cadena</h1>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Nunca rompas la cadena</div>
          </div>
        </div>
      </header>

      <div style="margin-bottom: 24px;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Seleccionar Hábito</label>
        <select id="habit-selector" class="input" style="width: 100%; min-height: 48px; font-size: 1rem; border-radius: 14px;">
          ${optionsHtml}
        </select>
      </div>

      <div class="streak-counter glass-card" style="text-align: center; padding: 28px; border-radius: 20px; margin-bottom: 28px; border: 1px solid rgba(245, 197, 24, 0.3);">
        <div style="font-size: 40px; font-weight: 800; color: #F5C518; font-family: 'Playfair Display', serif; margin-bottom: 4px;">
          🔥 ${habit.streak || 0} Días de Racha
        </div>
        <div style="font-size: 14px; color: var(--text-muted); font-weight: 500;">
          Racha Máxima: <strong style="color: #fff;">${habit.maxStreak || 0} días</strong> • Total: <strong style="color: #fff;">${habit.totalCompletions || 0} veces</strong>
        </div>
      </div>

      <div style="margin-bottom: 28px;">
        <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #fff; margin: 0 0 16px 0;">Historial de Constancia (52 Semanas)</h3>
        ${renderHeatmapGrid(habit)}
      </div>

      ${habit.reward?.partnerName ? `
      <div class="glass-card" style="padding: 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);">
        <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #fff;">🤝 Socio Corresponsable</h4>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
          ${habit.reward.partnerName} ${habit.reward.partnerPhone ? `(${habit.reward.partnerPhone})` : ''}
        </div>
        <button id="btn-notify" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; margin: 0;">📱 Notificar Logro por WhatsApp</button>
      </div>
      ` : ''}
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

  const selector = document.getElementById('habit-selector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      selectedHabitId = e.target.value;
      navigate('/chain');
    });
  }

  const btnNotify = document.getElementById('btn-notify');
  if (btnNotify) {
    btnNotify.addEventListener('click', () => {
      const state = store.getState();
      const habits = state.habits || [];
      const habit = habits.find(h => h.id === selectedHabitId) || habits[0];
      if (habit?.reward?.partnerPhone) {
        const message = encodeURIComponent(`¡Hola! Te comparto mi progreso en Habitelia. Llevo una racha de ${habit.streak || 0} días en mi hábito de "${habit.name}" 🔥`);
        window.open(`https://wa.me/${habit.reward.partnerPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
      } else {
        showToast('Notificación enviada', 'info');
      }
    });
  }
}

export function unmount() {
}
