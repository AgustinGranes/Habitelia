import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

let currentDate = new Date();

export function getHabitsForDate(dateStr, habits = [], routines = []) {
  const assignedRoutineId = localStorage.getItem(`assigned_routine_${dateStr}`);
  const assignedRoutine = routines.find(r => r.id === assignedRoutineId);

  const customHabitsStr = localStorage.getItem(`assigned_habits_${dateStr}`);
  let customHabits = [];
  if (customHabitsStr) {
    try {
      const ids = JSON.parse(customHabitsStr);
      customHabits = ids.map(id => habits.find(h => h.id === id)).filter(Boolean);
    } catch (e) {}
  }

  const d = new Date(dateStr + 'T00:00:00');
  const dayIdx = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDayKey = dayKeys[dayIdx];

  const occurrences = [];

  const addHabitOccurrences = (h) => {
    // 1. Main occurrence
    const mainTime = (h.cue?.timePerDay && h.cue.timePerDay[currentDayKey]) || h.cue?.time || '08:00';
    occurrences.push({
      id: h.id,
      name: h.name,
      time: mainTime,
      duration: h.duration || 15
    });

    // 2. Repetition occurrences
    if (h.repetition?.enabled && Array.isArray(h.repetitions)) {
      h.repetitions.forEach((rep, idx) => {
        const repDays = rep.days || [];
        if (repDays.includes(currentDayKey)) {
          occurrences.push({
            id: h.id + '_rep_' + idx,
            name: `${h.name} (Repetición ${idx + 1})`,
            time: rep.time || '18:00',
            duration: h.duration || 15
          });
        }
      });
    }
  };

  const activeHabitIds = new Set();

  if (assignedRoutine) {
    (assignedRoutine.habitIds || []).forEach(id => {
      activeHabitIds.add(id);
    });
  }

  customHabits.forEach(h => activeHabitIds.add(h.id));

  habits.forEach(h => {
    let matchesFreq = false;
    if (h.frequency) {
      if (h.frequency.type === 'daily') {
        matchesFreq = true;
      } else if (h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
        matchesFreq = h.frequency.days.includes(currentDayKey);
      }
    } else {
      matchesFreq = true;
    }

    if (matchesFreq) {
      activeHabitIds.add(h.id);
    }
  });

  activeHabitIds.forEach(id => {
    const h = habits.find(item => item.id === id);
    if (h) {
      addHabitOccurrences(h);
    }
  });

  return occurrences;
}

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

    const loadedHabits = getHabitsForDate(dateStr, habits, routines);
    const habitCount = loadedHabits.length;

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
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
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

  const loadedHabits = getHabitsForDate(dateStr, habits, routines);

  const d = new Date(dateStr + 'T00:00:00');
  const dayIdx = d.getDay();
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDayKey = dayKeys[dayIdx];

  const habitsListHtml = loadedHabits.length > 0 ? loadedHabits.map(h => {
    const habitTime = h.time || '08:00';
    return `
    <div style="padding: 10px 14px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">${h.name}</div>
      <div style="font-size: 12px; color: var(--text-secondary);">⏰ ${habitTime} (${h.duration || 15} min)</div>
    </div>
  `;
  }).join('') : `
    <div style="color: var(--text-secondary); font-size: 13px; font-style: italic; text-align: center; padding: 12px;">
      No hay hábitos específicos cargados para este día.
    </div>
  `;

  const routineOptsHtml = routines.map(r => `
    <option value="${r.id}" ${assignedRoutineId === r.id ? 'selected' : ''}>${r.name} (${(r.habitIds || []).length} hábitos)</option>
  `).join('');

  const modalHtml = `
    <div id="day-action-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 480px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 88vh; overflow-y: auto;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <div>
            <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Planificación del Día</h3>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Fecha: ${dateStr}</div>
          </div>
          <button id="close-day-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <!-- Loaded Habits Section -->
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin: 0 0 10px 0;">
            Hábitos Programados (${loadedHabits.length})
          </h4>
          <div style="max-height: 180px; overflow-y: auto;">
            ${habitsListHtml}
          </div>
        </div>

        <!-- Routine Preset Assignment -->
        <div style="margin-bottom: 20px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
          <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; font-size: 13px;">Asignar Rutina Preset a este día</label>
          <select id="day-routine-select" class="input" style="width: 100%; min-height: 44px;">
            <option value="">Sin rutina fija preset</option>
            ${routineOptsHtml}
          </select>
        </div>

        <!-- Action Buttons Container -->
        <div style="display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
          <button id="btn-create-habit-for-day" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('plus', 16)} Crear Hábito para este día
          </button>
          <button id="btn-save-day-routine" class="btn-primary" style="width: 100%; min-height: 46px; border-radius: 12px; font-size: 14px; font-weight: 600;">
            Guardar Rutina para esta Fecha
          </button>
          <button id="btn-cancel-day-modal" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; font-size: 13.5px; color: var(--text-secondary);">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-day-modal')?.addEventListener('click', () => {
    document.getElementById('day-action-modal')?.remove();
  });
  document.getElementById('btn-cancel-day-modal')?.addEventListener('click', () => {
    document.getElementById('day-action-modal')?.remove();
  });

  document.getElementById('btn-save-day-routine')?.addEventListener('click', () => {
    const selectedId = document.getElementById('day-routine-select')?.value;
    if (selectedId) {
      localStorage.setItem(`assigned_routine_${dateStr}`, selectedId);
      const routine = routines.find(r => r.id === selectedId);
      if (routine && routine.habitIds) {
        store.saveHabitOrder(dateStr, routine.habitIds);
      }
      showToast('Rutina asignada a la fecha correctamente', 'success');
    } else {
      localStorage.removeItem(`assigned_routine_${dateStr}`);
      localStorage.removeItem(`habit_order_${dateStr}`);
      showToast('Rutina desasignada de la fecha', 'info');
    }
    document.getElementById('day-action-modal')?.remove();
    refreshCalendar();
  });

  document.getElementById('btn-create-habit-for-day')?.addEventListener('click', () => {
    document.getElementById('day-action-modal')?.remove();
    navigate(`/habit/new?date=${dateStr}`);
  });
}

function refreshCalendar() {
  const pageContent = document.querySelector('.calendar-page');
  if (pageContent) {
    pageContent.outerHTML = render();
    mount();
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
    refreshCalendar();
  });

  document.getElementById('next-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    refreshCalendar();
  });

  document.querySelectorAll('.calendar-day[data-date]').forEach(dayEl => {
    dayEl.addEventListener('click', (e) => {
      const dateStr = e.currentTarget.dataset.date;
      const dayNum = e.currentTarget.dataset.day;
      if (dateStr) {
        openDayActionModal(dateStr, dayNum);
      }
    });
  });
}

export function unmount() {
}
