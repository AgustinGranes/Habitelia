import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

let currentDate = new Date();

export function render() {
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  
  let daysHtml = '';
  for (let i = 0; i < startOffset; i++) {
    daysHtml += `<div class="calendar-day other-month" style="opacity: 0.15; pointer-events: none; min-height: 72px;"></div>`;
  }
  
  const today = new Date();
  const habits = store.getState().habits || [];
  const routines = store.getState().routines || [];

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const assignedRoutineId = localStorage.getItem(`assigned_routine_${dateStr}`);
    const assignedRoutine = routines.find(r => r.id === assignedRoutineId);

    // Calculate specific loaded habit count for this date
    let habitCount = 0;
    if (assignedRoutine) {
      habitCount = (assignedRoutine.habitIds || []).length;
    } else {
      const customHabitsStr = localStorage.getItem(`assigned_habits_${dateStr}`);
      if (customHabitsStr) {
        try {
          const customHabits = JSON.parse(customHabitsStr);
          habitCount = customHabits.length;
        } catch (e) {
          habitCount = 0;
        }
      } else {
        habitCount = 0;
      }
    }

    daysHtml += `
      <div class="calendar-day ${isToday ? 'today-day' : ''}" data-day="${i}" data-date="${dateStr}" style="min-height: 72px; padding: 6px 4px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; border-radius: 12px; border: 1px solid ${isToday ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${isToday ? 'var(--accent-primary)' : 'var(--bg-primary)'}; color: ${isToday ? 'var(--accent-inverted)' : 'var(--text-primary)'}; cursor: pointer; position: relative; transition: transform 0.15s ease, border-color 0.15s ease;">
        <span style="font-weight: ${isToday ? '700' : '600'}; font-size: 14px;">${i}</span>
        
        ${assignedRoutine ? `
          <span style="font-size: 9.5px; font-weight: 600; color: ${isToday ? 'var(--accent-inverted)' : 'var(--text-primary)'}; background: ${isToday ? 'rgba(0,0,0,0.12)' : 'var(--bg-subtle)'}; padding: 2px 5px; border-radius: 4px; max-width: 92%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${assignedRoutine.name}
          </span>
        ` : ''}

        <!-- Number of Habits Badge (Accurate per Day) -->
        <div style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; background: ${isToday ? 'rgba(0,0,0,0.18)' : 'var(--bg-subtle)'}; color: ${isToday ? 'var(--accent-inverted)' : 'var(--text-primary)'}; border: 1px solid ${isToday ? 'rgba(0,0,0,0.2)' : 'var(--border-subtle)'}; margin-top: 4px; display: flex; align-items: center; gap: 3px;" title="${habitCount} hábitos cargados">
          ${habitCount}
        </div>
      </div>
    `;
  }

  return `
    <div class="page calendar-page" style="padding: 24px 20px 100px 20px; max-width: 650px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Calendario<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Planificación de rutinas en el tiempo</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <div class="glass-card" style="padding: 24px; border-radius: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <button id="prev-month" class="btn-secondary" style="width: 38px; height: 38px; min-height: 38px; padding: 0; border-radius: 10px;">
            ${iconSVG('arrowLeft', 16)}
          </button>
          <h2 class="editorial-title" style="font-size: 22px; margin: 0; color: var(--text-primary);">${monthNames[month]} ${year}</h2>
          <button id="next-month" class="btn-secondary" style="width: 38px; height: 38px; min-height: 38px; padding: 0; border-radius: 10px;">
            ${iconSVG('arrowRight', 16)}
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">
          ${weekdays.map(d => `<div>${d}</div>`).join('')}
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
          ${daysHtml}
        </div>
      </div>
    </div>
  `;
}

function openDayActionModal(dateStr, dayNum) {
  document.getElementById('day-action-modal')?.remove();
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const assignedRoutineId = localStorage.getItem(`assigned_routine_${dateStr}`);
  const assignedRoutine = routines.find(r => r.id === assignedRoutineId);

  // Determine loaded habits for this specific date
  let loadedHabits = [];
  if (assignedRoutine) {
    loadedHabits = (assignedRoutine.habitIds || []).map(id => habits.find(h => h.id === id)).filter(Boolean);
  } else {
    const customHabitsStr = localStorage.getItem(`assigned_habits_${dateStr}`);
    if (customHabitsStr) {
      try {
        const ids = JSON.parse(customHabitsStr);
        loadedHabits = ids.map(id => habits.find(h => h.id === id)).filter(Boolean);
      } catch (e) {
        loadedHabits = [];
      }
    }
  }

  const routinesOptions = routines.length === 0 
    ? `<option value="">No hay rutinas guardadas</option>`
    : `<option value="">-- Seleccionar Rutina Guardada --</option>` + routines.map(r => 
        `<option value="${r.id}" ${r.id === assignedRoutineId ? 'selected' : ''}>${r.name} (${(r.habitIds||[]).length} hábitos)</option>`
      ).join('');

  const modalHtml = `
    <div id="day-action-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 480px; padding: 28px; border-radius: 20px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 88vh; overflow-y: auto;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px;">
          <div>
            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary);">Planificación de Fecha</div>
            <h3 class="editorial-title" style="font-size: 24px; margin: 4px 0 0 0; color: var(--text-primary);">${dateStr}</h3>
          </div>
          <button id="close-day-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 18)}
          </button>
        </div>

        <!-- Loaded Habits Section for Date -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px;">
            Hábitos cargados para esta fecha (${loadedHabits.length}):
          </div>
          ${loadedHabits.length === 0 ? `
            <div style="padding: 12px 14px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px; color: var(--text-secondary); font-size: 13px;">
              Sin hábitos cargados específicamente para esta fecha.
            </div>
          ` : loadedHabits.map(h => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px; margin-bottom: 6px;">
              <div>
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${h.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">⏰ ${h.cue?.time || '08:00'} (${h.duration || 15} min)</div>
              </div>
            </div>
          `).join('')}

          ${assignedRoutine ? `
            <button id="btn-unassign-routine" class="btn-danger" style="width: 100%; margin-top: 10px; min-height: 38px; font-size: 12px;">
              🗑️ Desasignar Rutina "${assignedRoutine.name}"
            </button>
          ` : ''}
        </div>

        <div style="height: 1px; background: var(--border-subtle); margin: 20px 0;"></div>

        <!-- Section 1: Cargar Preset / Rutina Guardada -->
        <div style="margin-bottom: 20px;">
          <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; font-size: 13.5px;">
            ⚡ Cargar Preset / Rutina Guardada
          </label>
          <select id="modal-routine-select" class="input" style="width: 100%; min-height: 46px; margin-bottom: 12px;">
            ${routinesOptions}
          </select>
          <button id="btn-apply-routine" class="btn-primary" style="width: 100%; min-height: 44px; font-size: 13.5px;">
            Aplicar Rutina a ${dateStr}
          </button>
        </div>

        <!-- Section 2: Crear Hábito Nuevo -->
        <div style="margin-bottom: 16px;">
          <button id="btn-create-habit-for-date" class="btn-secondary" style="width: 100%; min-height: 44px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('plus', 16)} Crear Nuevo Hábito
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-day-modal')?.addEventListener('click', () => {
    document.getElementById('day-action-modal')?.remove();
  });

  document.getElementById('btn-unassign-routine')?.addEventListener('click', () => {
    localStorage.removeItem(`assigned_routine_${dateStr}`);
    showToast(`Rutina desasignada de ${dateStr}`, 'info');
    document.getElementById('day-action-modal')?.remove();
    refreshCalendarView();
  });

  document.getElementById('btn-apply-routine')?.addEventListener('click', () => {
    const routineId = document.getElementById('modal-routine-select')?.value;
    if (!routineId) {
      showToast('Seleccioná una rutina de la lista', 'info');
      return;
    }
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
      localStorage.setItem(`assigned_routine_${dateStr}`, routineId);
      showToast(`Rutina "${routine.name}" asignada a ${dateStr}`, 'success');
      document.getElementById('day-action-modal')?.remove();
      refreshCalendarView();
    }
  });

  document.getElementById('btn-create-habit-for-date')?.addEventListener('click', () => {
    document.getElementById('day-action-modal')?.remove();
    navigate('/habit/new');
  });
}

function refreshCalendarView() {
  const pageContent = document.querySelector('.calendar-page');
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

  document.getElementById('prev-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    refreshCalendarView();
  });

  document.getElementById('next-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    refreshCalendarView();
  });

  document.querySelectorAll('.calendar-day').forEach(dayEl => {
    dayEl.addEventListener('click', (e) => {
      const dateStr = e.currentTarget.dataset.date;
      const dayNum = e.currentTarget.dataset.day;
      if (!dateStr) return;
      openDayActionModal(dateStr, dayNum);
    });
  });
}

export function unmount() {
}
