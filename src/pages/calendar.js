import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';
import { showDeleteHabitModal } from '../components/deleteHabitModal.js';

let currentDate = new Date();

function checkHabitFreq(h, dayKey) {
  if (!h || !h.frequency) return true;
  if (h.frequency.type === 'daily') return true;
  if (h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
    return h.frequency.days.includes(dayKey);
  }
  return true;
}

export function getHabitsForDate(dateStr, habits = [], routines = [], todos = []) {
  const todayStr = store.getTodayString();
  const isPast = dateStr < todayStr;

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
    const mainTime = (h.cue?.timePerDay && h.cue.timePerDay[currentDayKey]) || (h.cue?.time ? h.cue.time : null);
    const duration = (h.noDuration || h.duration === 0) ? 0 : (h.duration || 0);

    occurrences.push({
      id: h.id,
      name: h.name,
      time: mainTime,
      duration: duration
    });

    // 2. Repetition occurrences
    if (h.repetition?.enabled && Array.isArray(h.repetitions)) {
      h.repetitions.forEach((rep, idx) => {
        const repDays = rep.days || [];
        if (repDays.includes(currentDayKey)) {
          const repLabel = rep.name ? `${h.name} (${rep.name})` : h.name;
          const repTime = rep.time || mainTime;
          occurrences.push({
            id: h.id + '_rep_' + idx,
            name: repLabel,
            time: repTime,
            duration: duration
          });
        }
      });
    }
  };

  const activeHabitIds = new Set();

  if (assignedRoutine) {
    (assignedRoutine.habitIds || []).forEach(id => {
      const h = habits.find(item => item.id === id);
      if (h && checkHabitFreq(h, currentDayKey)) activeHabitIds.add(h.id);
    });
  }

  customHabits.forEach(h => {
    if (h && checkHabitFreq(h, currentDayKey)) activeHabitIds.add(h.id);
  });

  habits.forEach(h => {
    if (h && checkHabitFreq(h, currentDayKey)) activeHabitIds.add(h.id);
  });

  activeHabitIds.forEach(id => {
    const h = habits.find(item => item.id === id);
    if (h) {
      addHabitOccurrences(h);
    }
  });

  // Filter To-Do items for dateStr
  const dayTodos = (todos || []).filter(t => {
    if (t.completed) return false;
    if (t.dueDate === dateStr) return true;
    if (t.showInHabits && (!t.dueDate || t.dueDate === dateStr)) return true;
    return false;
  });

  const sortByTime = (a, b) => {
    const timeA = a.time || '';
    const timeB = b.time || '';
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    if (!timeA && !timeB) return 0;
    return timeA.localeCompare(timeB);
  };

  occurrences.sort(sortByTime);
  dayTodos.sort(sortByTime);

  return { habits: isPast ? [] : occurrences, todos: dayTodos };
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
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const todos = state.todos || [];

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isPast = dateStr < todayStr;
    const assignedRoutineId = localStorage.getItem(`assigned_routine_${dateStr}`);
    const assignedRoutine = routines.find(r => r.id === assignedRoutineId);

    const loadedData = getHabitsForDate(dateStr, habits, routines, todos);
    const habitCount = loadedData.habits.length;
    const hasTodo = loadedData.todos.length > 0;

    let badgeHtml = '';
    if (hasTodo) {
      badgeHtml = `<div style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-top: 4px; display: flex; align-items: center; gap: 3px; background: #FFFFFF; color: #000000; border: 1px solid #FFFFFF; box-shadow: 0 0 8px rgba(255,255,255,0.4);" title="${loadedData.todos.length} tareas To-Do">${loadedData.todos.length} TD</div>`;
    } else if (isToday) {
      badgeHtml = `<div style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-top: 4px; display: flex; align-items: center; gap: 3px; background: rgba(0,0,0,0.18); color: var(--accent-inverted); border: 1px solid rgba(0,0,0,0.2);" title="${habitCount} hábitos">${habitCount}</div>`;
    } else if (!isPast && habitCount > 0) {
      badgeHtml = `<div style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-top: 4px; display: flex; align-items: center; gap: 3px; background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-subtle);" title="${habitCount} hábitos">${habitCount}</div>`;
    }

    daysHtml += `
      <div class="calendar-day ${isToday ? 'today-day' : ''} ${isPast ? 'past-day' : ''}" data-day="${i}" data-date="${dateStr}" style="min-height: 72px; padding: 6px 4px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; border-radius: 12px; border: 1px solid ${isToday ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${isToday ? 'var(--accent-primary)' : 'var(--bg-primary)'}; color: ${isToday ? 'var(--accent-inverted)' : (isPast ? 'var(--text-tertiary)' : 'var(--text-primary)')}; opacity: ${isPast && !hasTodo ? '0.65' : '1'}; cursor: pointer; position: relative; transition: transform 0.15s ease, border-color 0.15s ease;">
        <span style="font-weight: ${isToday ? '700' : '600'}; font-size: 14px;">${i}</span>
        
        ${(!isPast && assignedRoutine) ? `
          <span style="font-size: 9.5px; font-weight: 600; color: ${isToday ? 'var(--accent-inverted)' : 'var(--text-primary)'}; background: ${isToday ? 'rgba(0,0,0,0.12)' : 'var(--bg-subtle)'}; padding: 2px 5px; border-radius: 4px; max-width: 92%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${assignedRoutine.name}
          </span>
        ` : ''}

        ${badgeHtml}
      </div>
    `;
  }

  return `
    <div class="page calendar-page" style="padding: 24px 20px 100px 20px; max-width: 650px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 24px; width: 100%;">
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
          ${iconSVG('menu', 20)}
        </button>
        <div style="flex: 1; min-width: 0;">
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Calendario<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Planificación de rutinas en el tiempo</div>
        </div>
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

      <!-- Explanation Button -->
      <button id="btn-explain-calendar" class="btn-secondary" style="width: 100%; min-height: 46px; border-radius: 14px; margin-top: 20px; font-size: 13.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
        ${iconSVG('info', 16)} Explicación del funcionamiento del calendario
      </button>

    </div>
  `;
}

export function openDayActionModal(dateStr, dayNum) {
  document.getElementById('day-action-modal')?.remove();
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const todos = state.todos || [];
  const assignedRoutineId = localStorage.getItem(`assigned_routine_${dateStr}`);
  const assignedRoutine = routines.find(r => r.id === assignedRoutineId);

  const todayStr = store.getTodayString();
  const isPast = dateStr < todayStr;

  const loadedData = getHabitsForDate(dateStr, habits, routines, todos);
  const loadedHabits = loadedData.habits;
  const loadedTodos = loadedData.todos;

  if (isPast) {
    const todosListHtml = loadedTodos.length > 0 ? `
      <div style="margin-top: 6px;">
        <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
          ${iconSVG('check', 14)} Tareas To-Do registradas (${loadedTodos.length})
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${loadedTodos.map(t => `
            <div style="padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13.5px; color: ${t.completed ? 'var(--text-tertiary)' : 'var(--text-primary)'}; font-weight: 600; ${t.completed ? 'text-decoration: line-through;' : ''}">
                ${t.name || t.text || t.title || 'Tarea'}
              </span>
              <span style="font-size: 10px; font-weight: 800; background: ${t.completed ? 'rgba(46,125,50,0.1)' : '#FFFFFF'}; color: ${t.completed ? '#4CAF50' : '#000000'}; padding: 2px 7px; border-radius: 6px;">
                ${t.completed ? 'COMPLETADA' : 'TO-DO'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : `
      <div style="color: var(--text-secondary); font-size: 13px; font-style: italic; text-align: center; padding: 20px 12px;">
        No hubo tareas To-Do registradas en esta fecha.
      </div>
    `;

    const modalHtml = `
      <div id="day-action-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div class="glass-card" style="width: 100%; max-width: 460px; padding: 26px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 88vh; overflow-y: auto;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
            <div>
              <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Detalle del Día</h3>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Fecha: ${dateStr}</div>
            </div>
            <button id="close-day-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${iconSVG('x', 16)}
            </button>
          </div>

          <!-- Past Date Warning Banner -->
          <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text-secondary);">
              ${iconSVG('clock', 18)}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">Fecha pasada</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4;">
                Este día ya transcurrió. No se puede modificar ni planificar actividades pasadas.
              </div>
            </div>
          </div>

          <!-- To-Dos for the past date -->
          <div style="margin-bottom: 20px;">
            ${todosListHtml}
          </div>

          <button id="btn-close-past-modal" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; font-size: 13.5px;">
            Cerrar
          </button>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('close-day-modal')?.addEventListener('click', () => {
      document.getElementById('day-action-modal')?.remove();
    });
    document.getElementById('btn-close-past-modal')?.addEventListener('click', () => {
      document.getElementById('day-action-modal')?.remove();
    });
    return;
  }

  const habitsListHtml = loadedHabits.length > 0 ? loadedHabits.map(h => {
    return `
    <div style="padding: 10px 14px; border-radius: 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 10px;">
      <div style="min-width: 0; flex: 1;">
        <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${h.name}</div>
        ${h.time || h.duration ? `
        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 4px;">
          ${iconSVG('clock', 12)} ${h.time ? h.time : ''} ${h.duration ? `(${h.duration} min)` : ''}
        </div>` : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
        <button class="btn-ghost btn-edit-habit-calendar" data-id="${h.id}" title="Editar Hábito" style="padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 11.5px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 4px;">
          ${iconSVG('edit', 13)} Editar
        </button>
        <button class="btn-ghost btn-delete-habit-calendar" data-id="${h.id}" data-name="${h.name}" title="Eliminar Hábito" style="padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 11.5px; color: var(--text-tertiary); cursor: pointer; display: flex; align-items: center; gap: 4px;">
          ${iconSVG('trash', 13)}
        </button>
      </div>
    </div>
  `;
  }).join('') : `
    <div style="color: var(--text-secondary); font-size: 13px; font-style: italic; text-align: center; padding: 12px;">
      No hay hábitos específicos cargados para este día.
    </div>
  `;

  const todosListHtml = loadedTodos.length > 0 ? `
    <div style="margin-top: 14px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
      <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
        ${iconSVG('check', 14)} Tareas Pendientes To-Do (${loadedTodos.length})
      </h4>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${loadedTodos.map(t => `
          <div style="padding: 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; color: var(--text-primary); font-weight: 600;">${t.text || t.name || t.title || 'Tarea'}</span>
            <span style="font-size: 10px; font-weight: 800; background: #FFFFFF; color: #000000; padding: 2px 7px; border-radius: 6px;">TO-DO</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

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
        <div style="margin-bottom: 14px;">
          <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin: 0 0 10px 0;">
            Hábitos Programados (${loadedHabits.length})
          </h4>
          <div style="max-height: 180px; overflow-y: auto;">
            ${habitsListHtml}
          </div>
        </div>

        <!-- Loaded To-Dos Section -->
        ${todosListHtml}

        <!-- Routine Preset Assignment -->
        <div style="margin-top: 14px; margin-bottom: 20px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
          <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; font-size: 13px;">Asignar Rutina Preset a este día</label>
          <select id="day-routine-select" class="input" style="width: 100%; min-height: 44px;">
            <option value="">Sin rutina fija preset</option>
            ${routineOptsHtml}
          </select>
        </div>

        <!-- Action Buttons Container -->
        <div style="display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
          <button id="btn-add-habit-day-menu" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('plus', 16)} Agregar Hábito
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

  // Edit Habit Listener
  document.querySelectorAll('.btn-edit-habit-calendar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('day-action-modal')?.remove();
      const rawId = e.currentTarget.dataset.id;
      const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
      navigate('/habit/new', { id, from: 'calendar', dateReturn: dateStr });
    });
  });

  // Delete Habit Listener
  document.querySelectorAll('.btn-delete-habit-calendar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rawId = e.currentTarget.dataset.id;
      const habitId = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
      const name = e.currentTarget.dataset.name || 'Hábito';
      showDeleteHabitModal(habitId, name, () => {
        document.getElementById('day-action-modal')?.remove();
        refreshCalendar();
        openDayActionModal(dateStr);
      });
    });
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
    openDayActionModal(dateStr);
  });

  document.getElementById('btn-add-habit-day-menu')?.addEventListener('click', () => {
    openAddHabitChoiceModal(dateStr);
  });
}

function openAddHabitChoiceModal(dateStr) {
  document.getElementById('add-habit-choice-modal')?.remove();
  const modalHtml = `
    <div id="add-habit-choice-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1600; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 26px; border-radius: 22px; border: 1px solid var(--border-subtle); background: var(--bg-surface); text-align: center;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Agregar Hábito</h3>
          <button id="close-choice-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 20px; text-align: left;">
          Elegí cómo querés agregar un hábito a la fecha <strong>${dateStr}</strong>:
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
          <button id="btn-choice-create-new" class="btn-primary" style="width: 100%; min-height: 48px; border-radius: 12px; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('plus', 16)} Crear Hábito para este día
          </button>
          <button id="btn-choice-add-existing" class="btn-secondary" style="width: 100%; min-height: 48px; border-radius: 12px; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('chain', 16)} Agregar un Hábito Existente
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-choice-modal')?.addEventListener('click', () => {
    document.getElementById('add-habit-choice-modal')?.remove();
  });

  document.getElementById('btn-choice-create-new')?.addEventListener('click', () => {
    document.getElementById('add-habit-choice-modal')?.remove();
    document.getElementById('day-action-modal')?.remove();
    navigate('/habit/new', { date: dateStr, from: 'calendar', dateReturn: dateStr });
  });

  document.getElementById('btn-choice-add-existing')?.addEventListener('click', () => {
    document.getElementById('add-habit-choice-modal')?.remove();
    openSelectExistingHabitModal(dateStr);
  });
}

function openSelectExistingHabitModal(dateStr) {
  document.getElementById('select-existing-habit-modal')?.remove();

  const state = store.getState();
  const allHabits = state.habits || [];
  
  // Get currently assigned habits for dateStr
  const customHabitsStr = localStorage.getItem(`assigned_habits_${dateStr}`) || '[]';
  let assignedIds = [];
  try { assignedIds = JSON.parse(customHabitsStr); } catch (e) {}

  const availableHabits = allHabits.filter(h => !assignedIds.includes(h.id));

  const listHtml = availableHabits.length > 0 ? availableHabits.map(h => `
    <div style="padding: 12px 14px; border-radius: 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
      <div style="min-width: 0; flex: 1;">
        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${h.name}</div>
        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">${h.cue?.time || 'Sin hora'} ${h.duration ? `(${h.duration} min)` : ''}</div>
      </div>
      <button class="btn-primary btn-add-this-existing" data-id="${h.id}" style="padding: 6px 14px; font-size: 12px; border-radius: 8px; font-weight: 600; width: auto; margin: 0; flex-shrink: 0;">
        Agregar
      </button>
    </div>
  `).join('') : `
    <div style="color: var(--text-secondary); font-size: 13.5px; text-align: center; padding: 20px 10px;">
      Todos tus hábitos existentes ya están agregados a este día o no tienes hábitos creados.
    </div>
  `;

  const modalHtml = `
    <div id="select-existing-habit-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1650; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 460px; padding: 26px; border-radius: 22px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 85vh; overflow-y: auto;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Seleccionar Hábito Existente</h3>
          <button id="close-select-existing-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; margin-bottom: 16px;">
          ${listHtml}
        </div>

        <button id="btn-cancel-select-existing" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; color: var(--text-secondary);">
          Volver
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const closeMe = () => document.getElementById('select-existing-habit-modal')?.remove();

  document.getElementById('close-select-existing-modal')?.addEventListener('click', closeMe);
  document.getElementById('btn-cancel-select-existing')?.addEventListener('click', closeMe);

  document.querySelectorAll('.btn-add-this-existing').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const habitId = e.currentTarget.dataset.id;
      if (habitId) {
        const key = `assigned_habits_${dateStr}`;
        const existingStr = localStorage.getItem(key) || '[]';
        let existing = [];
        try { existing = JSON.parse(existingStr); } catch (err) {}
        if (!existing.includes(habitId)) {
          existing.push(habitId);
          localStorage.setItem(key, JSON.stringify(existing));
        }
        showToast('Hábito agregado a la fecha con éxito', 'success');
        closeMe();
        document.getElementById('day-action-modal')?.remove();
        refreshCalendar();
        openDayActionModal(dateStr);
      }
    });
  });
}

function showCalendarExplanationModal() {
  document.getElementById('calendar-explanation-modal')?.remove();
  const modalHtml = `
    <div id="calendar-explanation-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1600; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 520px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 88vh; overflow-y: auto;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <div>
            <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Funcionamiento del Calendario</h3>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Guía de planificación y funciones avanzadas</div>
          </div>
          <button id="close-calendar-explanation" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13.5px; color: var(--text-primary); line-height: 1.5;">
          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px;">
            <strong style="display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 14px;">1. Programación de Hábitos por Frecuencia</strong>
            Los hábitos se distribuyen automáticamente en las fechas según su frecuencia (diarios o días específicos de la semana) e incluyen todas las repeticiones diarias que hayas configurado.
          </div>

          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px;">
            <strong style="display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 14px;">2. Asignación de Rutinas Presets</strong>
            Al tocar cualquier fecha podés asignarle una rutina preset guardada para ese día específico o crear un hábito exclusivo para esa fecha.
          </div>

          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px;">
            <strong style="display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 14px;">3. Tareas To-Do e Indicador Blanco</strong>
            Las tareas del To-Do programadas para una fecha se muestran en el resumen del día sin sumarse al número de hábitos. Las fechas con tareas To-Do destacan con un <strong>distintivo blanco brillante</strong> en la grilla del calendario.
          </div>

          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 14px;">
            <strong style="display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 14px;">4. Edición y Eliminación Directa</strong>
            En la ventana del día podés editar cualquier hábito (y volver a esa misma fecha al finalizar) o eliminarlo (eligiendo borrarlo solo por hoy o para siempre).
          </div>
        </div>

        <button id="btn-close-explanation-ok" class="btn-primary" style="width: 100%; min-height: 46px; border-radius: 12px; margin-top: 22px; font-weight: 600; font-size: 14px;">
          Entendido
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const closeModal = () => document.getElementById('calendar-explanation-modal')?.remove();
  document.getElementById('close-calendar-explanation')?.addEventListener('click', closeModal);
  document.getElementById('btn-close-explanation-ok')?.addEventListener('click', closeModal);
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

  document.getElementById('btn-explain-calendar')?.addEventListener('click', () => {
    showCalendarExplanationModal();
  });

  // Re-open specific date modal if openDate query parameter is present in URL
  const hashStr = window.location.hash || '';
  const hashParams = new URLSearchParams(hashStr.split('?')[1] || '');
  const openDateParam = hashParams.get('openDate');
  if (openDateParam) {
    window.history.replaceState(null, '', `#/calendar`);
    openDayActionModal(openDateParam);
  }
}

export function unmount() {
}
