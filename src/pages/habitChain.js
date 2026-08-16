import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

let selectedHabitId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function calculateScheduledStreak(habit) {
    if (!habit.completions) return 0;
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const isDaily = !habit.frequency || habit.frequency.type === 'daily';
    const scheduledDays = isDaily ? dayKeys : (habit.frequency.days || dayKeys);
    
    let streak = 0;
    let checkDate = new Date();
    // Go back day by day, only counting scheduled days
    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayKey = dayKeys[checkDate.getDay()];
        
        if (scheduledDays.includes(dayKey)) {
            // This was a scheduled day
            if (habit.completions[dateStr] === 'completed' || habit.completions[dateStr] === 'completed_2min') {
                streak++;
            } else {
                break; // Chain broken
            }
        }
        // Non-scheduled days are simply skipped (don't break chain)
        checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
}

function renderMonthlyGrid(habit, year, month) {
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const isDaily = !habit?.frequency || habit.frequency.type === 'daily';
  const scheduledDays = isDaily ? dayKeys : (habit.frequency.days || dayKeys);

  const daysData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dayNamesShort[dateObj.getDay()];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = habit?.completions?.[dateStr];
    const isCompletedFull = status === 'completed';
    const isCompleted2Min = status === 'completed_2min';
    
    const dayKey = dayKeys[dateObj.getDay()];
    const isScheduled = scheduledDays.includes(dayKey);
    
    daysData.push({ dayNumber: d, dayOfWeek, dateStr, isCompletedFull, isCompleted2Min, isScheduled });
  }

  const columnsHtml = daysData.map(item => {
    const isCompleted = item.isCompletedFull || item.isCompleted2Min;
    let cellBg = 'var(--bg-primary)';
    let cellBorder = '1px solid var(--border-subtle)';
    let checkColor = 'var(--bg-primary)';

    if (item.isCompletedFull) {
      cellBg = 'var(--text-primary)';
      cellBorder = '1px solid var(--text-primary)';
      checkColor = 'var(--bg-primary)';
    } else if (item.isCompleted2Min) {
      cellBg = 'rgba(255, 255, 255, 0.45)';
      cellBorder = '1px solid var(--text-secondary)';
      checkColor = 'var(--text-primary)';
    }

    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 32px;">
        <!-- Diagonal Day & Date Header -->
        <div style="height: 48px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary); display: inline-block; transform: rotate(-45deg); transform-origin: center center; white-space: nowrap;">
            ${item.dayOfWeek} ${item.dayNumber}
          </span>
        </div>
        
        <!-- Cell (Empty, 2-Min Dimmed, or Solid White Full) -->
        ${(!item.isScheduled && !isCompleted) ? `
        <div class="chain-cell not-scheduled" style="width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border: 1px solid var(--border-subtle); position: relative; overflow: hidden;" title="No programado">
            <svg width="26" height="26" style="position: absolute; top: 0; left: 0;"><line x1="0" y1="26" x2="26" y2="0" stroke="var(--text-tertiary)" stroke-width="1" opacity="0.4"/></svg>
        </div>
        ` : `
        <div title="${item.dateStr}: ${item.isCompletedFull ? 'Completado (Completo)' : item.isCompleted2Min ? 'Completado (2 Minutos)' : 'No completado'}" 
             style="width: 26px; height: 26px; border-radius: 6px; background: ${cellBg}; border: ${cellBorder}; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
          ${isCompleted ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${checkColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
        `}
      </div>
    `;
  }).join('');

  return `
    <div class="glass-card" style="padding: 24px 20px; border-radius: 18px; overflow-x: auto;">
      <!-- Month Navigation Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <button id="chain-prev-month" class="btn-secondary" style="width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          ${iconSVG('arrowLeft', 16)}
        </button>
        <h4 class="editorial-title" style="font-size: 20px; margin: 0; color: var(--text-primary);">
          ${monthNames[month]} ${year}
        </h4>
        <button id="chain-next-month" class="btn-secondary" style="width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          ${iconSVG('arrowRight', 16)}
        </button>
      </div>

      <!-- Scrollable Horizontal Grid of All Days -->
      <div style="display: flex; gap: 6px; min-width: max-content; padding-top: 10px; padding-bottom: 12px;">
        ${columnsHtml}
      </div>

      <!-- Legend -->
      <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 16px; margin-top: 16px; font-size: 11.5px; color: var(--text-secondary);">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle); position: relative; overflow: hidden;">
            <svg width="14" height="14" style="position: absolute; top: 0; left: 0;"><line x1="0" y1="14" x2="14" y2="0" stroke="var(--text-tertiary)" stroke-width="1" opacity="0.4"/></svg>
          </div>
          <span>No programado</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle);"></div>
          <span>No completado</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 14px; height: 14px; border-radius: 4px; background: rgba(255,255,255,0.45); border: 1px solid var(--text-secondary);"></div>
          <span>2 minutos</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--text-primary); border: 1px solid var(--text-primary);"></div>
          <span>Completado</span>
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
      <div class="page habit-chain-page" style="padding: 24px 20px 100px 20px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; width: 100%;">
          <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            ${iconSVG('menu', 20)}
          </button>
          <div style="flex: 1; min-width: 0;">
            <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Mi Cadena<span style="color: var(--text-secondary);">.</span></h1>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Nunca rompas la cadena</div>
          </div>
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
      <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; width: 100%;">
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
          ${iconSVG('menu', 20)}
        </button>
        <div style="flex: 1; min-width: 0;">
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Mi Cadena<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Visualización mensual de constancia</div>
        </div>
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
            ${calculateScheduledStreak(habit)} Días de Racha
          </span>
        </div>
        <div style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
          Racha Máxima: <strong style="color: var(--text-primary);">${habit.maxStreak || calculateScheduledStreak(habit)} días</strong> • Total: <strong style="color: var(--text-primary);">${habit.totalCompletions || calculateScheduledStreak(habit)} repeticiones</strong>
        </div>
      </div>

      <div style="margin-bottom: 28px;">
        <h3 class="editorial-title" style="font-size: 20px; margin: 0 0 16px 0;">Historial Mensual de Constancia</h3>
        ${renderMonthlyGrid(habit, currentYear, currentMonth)}
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
  let overlay = document.getElementById('sidebar-overlay');
  let panel = document.getElementById('sidebar-panel');
  if (!overlay || !panel) {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      const sidebarHTML = renderSidebar();
      appContainer.insertAdjacentHTML('beforeend', sidebarHTML);
      mountSidebar();
    }
  }

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
      refreshView();
    });
  }

  document.getElementById('chain-prev-month')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    refreshView();
  });

  document.getElementById('chain-next-month')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    refreshView();
  });

  document.getElementById('btn-notify')?.addEventListener('click', () => {
    const state = store.getState();
    const habit = state.habits.find(h => h.id === selectedHabitId);
    if (habit && habit.reward?.partnerPhone) {
      const msg = encodeURIComponent(`¡Hola ${habit.reward.partnerName}! Mantuve mi racha de ${calculateScheduledStreak(habit)} días en el hábito "${habit.name}" con Habitelia.`);
      window.open(`https://wa.me/${habit.reward.partnerPhone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    } else {
      showToast('No hay número cargado para el socio corresponsable', 'info');
    }
  });
}

function refreshView() {
  const pageContent = document.querySelector('.habit-chain-page');
  if (pageContent) {
    pageContent.outerHTML = render();
    mount();
  } else {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = render();
      mount();
      const sidebarHTML = renderSidebar();
      app.insertAdjacentHTML('beforeend', sidebarHTML);
      mountSidebar();
    }
  }
}

export function unmount() {
}
