import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';
import { showDeleteHabitModal } from '../components/deleteHabitModal.js';
import { showSkipHabitModal } from '../components/skipHabitModal.js';
import { showUnskipHabitModal } from '../components/unskipHabitModal.js';

let isReorderingRoutine = false;
let cleanup = [];

export function render() {
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const todayDate = store.getTodayString();
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayKey = dayKeys[new Date().getDay()];

  // 1. Today's Items
  const todayItems = [];

  // Filter habits for today's day of week
  const todayHabits = habits.filter(h => {
    if (!h.frequency) return true;
    if (h.frequency.type === 'daily') return true;
    if (h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
      return h.frequency.days.includes(todayDayKey);
    }
    return true;
  });

  // Main occurrences
  todayHabits.forEach(h => {
    const status = h.completions?.[todayDate];
    const isDeletedToday = status === 'deleted_today';
    const isCompleted = status === 'completed' || status === 'completed_2min';
    const isTwoMin = status === 'completed_2min';
    const isSkipped = status === 'skipped';
    const linkedPleasure = h.noPleasure ? '' : (h.craving?.linkedPleasure || h.linkedPleasure || '');
    const twoMinuteVersion = h.noTwoMin ? '' : (h.response?.twoMinVersion || '');
    const habitTime = h.noSchedule ? null : ((h.cue?.timePerDay && h.cue.timePerDay[todayDayKey]) || (h.cue?.time ? h.cue.time : null));
    const duration = (h.noDuration || h.duration === 0) ? 0 : (h.duration || 0);
    const parentHabit = h.stackedAfterId ? habits.find(item => item.id === h.stackedAfterId) : null;
    
    todayItems.push({
      id: h.id,
      name: h.name,
      icon: h.icon || '🎯',
      time: habitTime,
      duration: duration,
      linkedPleasure,
      twoMinuteVersion,
      stackedAfterId: h.stackedAfterId || '',
      stackedAfterName: parentHabit?.name || '',
      completed: isCompleted,
      isTwoMin,
      skipped: isSkipped,
      deletedToday: isDeletedToday,
      streak: h.streak || 0
    });
  });

  // Repetition occurrences (if scheduled for today)
  habits.forEach(h => {
    if (h.repetition?.enabled && Array.isArray(h.repetitions)) {
      h.repetitions.forEach((rep, idx) => {
        const repDays = rep.days || [];
        if (repDays.includes(todayDayKey)) {
          const repDateKey = todayDate + '_rep_' + idx;
          const status = h.completions?.[repDateKey];
          const isDeletedToday = status === 'deleted_today';
          const isCompleted = status === 'completed' || status === 'completed_2min';
          const isTwoMin = status === 'completed_2min';
          const isSkipped = status === 'skipped';
          const linkedPleasure = h.noPleasure ? '' : (h.craving?.linkedPleasure || h.linkedPleasure || '');
          const twoMinuteVersion = h.noTwoMin ? '' : (h.response?.twoMinVersion || '');
          const duration = (h.noDuration || h.duration === 0) ? 0 : (h.duration || 0);
          const parentHabit = h.stackedAfterId ? habits.find(item => item.id === h.stackedAfterId) : null;

          const repLabel = rep.name ? `${h.name} (${rep.name})` : h.name;
          const parentRepLabel = parentHabit ? (rep.name ? `${parentHabit.name} (${rep.name})` : parentHabit.name) : '';
          const repTime = rep.time || (h.cue?.time ? h.cue.time : null);

          todayItems.push({
            id: h.id + '_rep_' + idx,
            name: repLabel,
            icon: h.icon || '🎯',
            time: repTime,
            duration: duration,
            linkedPleasure,
            twoMinuteVersion,
            stackedAfterId: h.stackedAfterId ? h.stackedAfterId + '_rep_' + idx : '',
            stackedAfterName: parentRepLabel,
            completed: isCompleted,
            isTwoMin,
            skipped: isSkipped,
            deletedToday: isDeletedToday,
            streak: h.streak || 0
          });
        }
      });
    }
  });

  const eventsMapRoutine = new Map(todayItems.map(e => [e.id, e]));
  const childrenMapRoutine = new Map();
  todayItems.forEach(e => {
    if (e.stackedAfterId && eventsMapRoutine.has(e.stackedAfterId)) {
      if (!childrenMapRoutine.has(e.stackedAfterId)) childrenMapRoutine.set(e.stackedAfterId, []);
      childrenMapRoutine.get(e.stackedAfterId).push(e);
    }
  });

  const rootItemsRoutine = todayItems.filter(e => !e.stackedAfterId || !eventsMapRoutine.has(e.stackedAfterId));

  const savedOrder = store.getHabitOrder(todayDate);
  if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
    rootItemsRoutine.sort((a, b) => {
      const idxA = savedOrder.indexOf(a.id);
      const idxB = savedOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  } else {
    rootItemsRoutine.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }

  function renderRoutineItemInner(item, isStackedChild = false) {
    if (item.deletedToday) {
      return `
        <div class="habit-item-card-routine" data-id="${item.id}" style="display: flex; align-items: center; justify-content: space-between; padding: ${isStackedChild ? '10px 14px' : '14px 18px'}; margin-top: ${isStackedChild ? '6px' : '0'}; border-radius: 14px; background: ${isStackedChild ? 'var(--bg-primary)' : 'transparent'}; border: ${isStackedChild ? '1px solid var(--border-subtle)' : 'none'}; opacity: 0.5; transition: all 0.2s ease; width: 100%; box-sizing: border-box;">
          <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
            <div style="width: 26px; height: 26px; border-radius: 50%; border: 1.75px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text-tertiary);">
              ⊘
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600; font-size: 15px; color: var(--text-tertiary); text-decoration: line-through; word-wrap: break-word; white-space: normal;">
                ${isStackedChild ? `↳ ${item.name} (Eliminado hoy)` : `${item.name} (Eliminado hoy)`}
              </div>
            </div>
          </div>
          <div style="flex-shrink: 0; margin-left: 8px;">
            <button class="btn-ghost btn-restore-habit-routine" data-id="${item.id}" style="padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 11.5px; color: var(--text-primary); cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 4px; touch-action: manipulation;">
              ${iconSVG('undo', 12)} Restaurar
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="habit-item-card-routine ${isReorderingRoutine ? '' : 'btn-toggle-routine-today'} ${item.completed ? 'completed' : ''}" data-id="${item.id}" data-completed="${item.completed}" style="display: flex; align-items: center; justify-content: space-between; padding: ${isStackedChild ? '10px 14px' : '14px 18px'}; margin-top: ${isStackedChild ? '6px' : '0'}; border-radius: 14px; background: ${isStackedChild ? 'var(--bg-primary)' : 'transparent'}; border: ${isStackedChild ? '1px solid var(--border-subtle)' : 'none'}; ${isReorderingRoutine ? '' : 'cursor: pointer;'} opacity: ${item.completed ? '0.75' : '1'}; transition: all 0.2s ease; width: 100%; box-sizing: border-box;">
        <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
          <div style="width: 26px; height: 26px; border-radius: 50%; border: 1.75px solid ${item.completed ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${item.completed ? (item.isTwoMin ? 'rgba(255,255,255,0.45)' : 'var(--text-primary)') : 'transparent'}; color: ${item.completed ? 'var(--bg-primary)' : 'transparent'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconSVG('check', 13)}
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 600; font-size: 15px; color: var(--text-primary); ${item.completed ? 'text-decoration: line-through;' : ''} word-wrap: break-word; white-space: normal;">${isStackedChild ? `↳ ${item.name}` : item.name}</div>
            ${item.time || item.duration ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px;">${iconSVG('clock', 12)} ${item.time ? item.time : ''} ${item.duration ? `(${item.duration} min)` : ''}</div>` : ''}
            ${item.linkedPleasure ? `<div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">Ritual previo: ${item.linkedPleasure}</div>` : ''}
            ${item.twoMinuteVersion ? `<div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">2 min: ${item.twoMinuteVersion}</div>` : ''}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 140px; flex-shrink: 0; align-items: center; margin-left: 8px;">
          <!-- 1. Racha -->
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 5px; border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 4px; box-sizing: border-box; height: 30px;">
            ${iconSVG('flame', 12)} ${item.streak || 0}d
          </div>
          
          <!-- 2. Saltar / Status -->
          <div style="display: flex; align-items: center; justify-content: center; box-sizing: border-box; height: 30px; width: 100%;">
            ${item.completed ? `
              <span style="font-size: 11px; font-weight: 600; color: #2E7D32; background: rgba(46,125,50,0.1); padding: 4px 8px; border-radius: 8px; width: 100%; text-align: center;">${item.isTwoMin ? '2 Min' : 'Hecho'}</span>
            ` : (item.skipped ? `
              <span style="font-size: 11px; font-weight: 600; color: #E53E3E; background: rgba(229,62,62,0.1); padding: 4px 8px; border-radius: 8px; width: 100%; text-align: center;">Saltado</span>
            ` : `
              <button class="btn-ghost btn-skip-habit-routine" data-id="${item.id}" data-name="${item.name}" title="Saltar Hábito" style="padding: 4px 0; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-secondary); cursor: pointer; width: 100%; text-align: center; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; touch-action: manipulation;">
                Saltar
              </button>
            `)}
          </div>
          
          <!-- 3. Editar -->
          <button class="btn-ghost btn-edit-habit-routine" data-id="${item.id}" title="Editar" style="padding: 5px 0; border-radius: 8px; border: 1px solid var(--border-subtle); color: var(--text-secondary); height: 30px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 100%; touch-action: manipulation; cursor: pointer;">
            ${iconSVG('edit', 13)} <span style="font-size: 11px; margin-left: 4px;">Editar</span>
          </button>
          
          <!-- 4. Eliminar -->
          <button class="btn-ghost btn-delete-habit-routine" data-id="${item.id}" data-name="${item.name}" title="Eliminar" style="padding: 5px 0; border-radius: 8px; border: 1px solid var(--border-subtle); color: var(--text-tertiary); height: 30px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 100%; touch-action: manipulation; cursor: pointer;">
            ${iconSVG('trash', 13)} <span style="font-size: 11px; margin-left: 4px;">Eliminar</span>
          </button>
        </div>
      </div>
    `;
  }

  let todayListHtml = '';
  if (todayItems.length === 0) {
    todayListHtml = `
      <div class="glass-card" style="text-align: center; padding: 32px 20px; border-radius: 18px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: var(--text-secondary);">
          ${iconSVG('routine', 20)}
        </div>
        <h3 class="editorial-title" style="font-size: 20px; margin-bottom: 6px;">Sin hábitos programados hoy</h3>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">Creá un hábito o cargá una rutina guardada.</p>
        <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 200px; margin: 0 auto; min-height: 40px;">
          ${iconSVG('plus', 14)} Crear Hábito
        </button>
      </div>
    `;
  } else {
    todayListHtml = rootItemsRoutine.map((rootItem, idx) => {
      const children = childrenMapRoutine.get(rootItem.id) || [];
      const isStack = children.length > 0;

      if (!isStack) {
        return `
          <div class="glass-card habit-group-card-routine" data-root-id="${rootItem.id}" style="margin-bottom: 10px; border-radius: 14px; overflow: hidden; border: 1px solid var(--border-subtle);">
            ${isReorderingRoutine ? `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle);">
                <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${rootItem.name}</span>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-ghost btn-move-up-routine" data-idx="${idx}" style="padding: 4px 8px;" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>
                    ${iconSVG('arrowUp', 16)}
                  </button>
                  <button class="btn-ghost btn-move-down-routine" data-idx="${idx}" style="padding: 4px 8px;" ${idx === rootItemsRoutine.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
                    ${iconSVG('arrowDown', 16)}
                  </button>
                </div>
              </div>
            ` : ''}
            ${renderRoutineItemInner(rootItem, false)}
          </div>
        `;
      }

      return `
        <div class="glass-card habit-group-card-routine" data-root-id="${rootItem.id}" style="padding: 14px; margin-bottom: 14px; border-radius: 18px; border: 1.5px solid var(--border-subtle); background: var(--bg-surface);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
              ${iconSVG('chain', 14)} Secuencia de Acumulación (Habit Stack)
            </span>
            ${isReorderingRoutine ? `
              <div style="display: flex; gap: 4px;">
                <button class="btn-ghost btn-move-up-routine" data-idx="${idx}" style="padding: 4px 8px;" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>
                  ${iconSVG('arrowUp', 16)}
                </button>
                <button class="btn-ghost btn-move-down-routine" data-idx="${idx}" style="padding: 4px 8px;" ${idx === rootItemsRoutine.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
                  ${iconSVG('arrowDown', 16)}
                </button>
              </div>
            ` : ''}
          </div>

          ${renderRoutineItemInner(rootItem, false)}

          <div style="border-left: 2px dashed var(--border-subtle); margin-left: 16px; padding-left: 8px; margin-top: 6px;">
            ${children.map(child => renderRoutineItemInner(child, true)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. All Habits Ever Created
  let allHabitsHtml = '';
  if (habits.length === 0) {
    allHabitsHtml = `
      <div class="glass-card" style="text-align: center; padding: 24px 20px; border-radius: 16px; color: var(--text-secondary); font-size: 13px;">
        Aún no creaste ningún hábito.
      </div>
    `;
  } else {
    allHabitsHtml = habits.map(h => {
      const linkedPleasure = h.craving?.linkedPleasure || h.linkedPleasure || '';
      const twoMin = h.response?.twoMinVersion || '';
      return `
        <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 10px; border-radius: 14px; border: 1px solid var(--border-subtle); gap: 16px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 15px; color: var(--text-primary); word-wrap: break-word; white-space: normal;">${h.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${(h.noDuration || h.duration === 0) ? '' : `Duración: ${h.duration} min `}${h.cue?.place ? `• ${h.cue.place}` : ''}</div>
            ${linkedPleasure ? `<div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">Ritual previo: ${linkedPleasure}</div>` : ''}
            ${twoMin ? `<div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">2 min: ${twoMin}</div>` : ''}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 220px; flex-shrink: 0;">
            <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; box-sizing: border-box;">
              ${iconSVG('flame', 14)} ${h.streak || 0}d
            </div>
            <button class="btn-ghost btn-chain-habit-routine" data-id="${h.id}" style="padding: 8px; font-size: 12px; border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; touch-action: manipulation;">
              ${iconSVG('chain', 14)} Cadena
            </button>
            <button class="btn-ghost btn-edit-habit-routine" data-id="${h.id}" style="padding: 8px; font-size: 12px; border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; touch-action: manipulation;">
              ${iconSVG('edit', 14)} Editar
            </button>
            <button class="btn-ghost btn-delete-habit-routine" data-id="${h.id}" data-name="${h.name}" style="padding: 8px; font-size: 12px; border: 1px solid var(--border-subtle); color: #E53E3E; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; touch-action: manipulation;">
              ${iconSVG('trash', 14)} Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Saved Routines
  let routinesHtml = '';
  if (routines.length === 0) {
    routinesHtml = `
      <div class="glass-card" style="text-align: center; padding: 24px 20px; border-radius: 16px; color: var(--text-secondary); font-size: 13px; margin-bottom: 14px;">
        Aún no guardaste ninguna rutina personalizada.
      </div>
    `;
  } else {
    routinesHtml = routines.map(r => {
      const habitNames = (r.habitIds || []).map(id => habits.find(h => h.id === id)?.name).filter(Boolean).join(', ');
      return `
        <div class="glass-card routine-card" style="padding: 18px; margin-bottom: 12px; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <h4 class="editorial-title" style="margin: 0 0 4px 0; font-size: 18px; color: var(--text-primary);">${r.name}</h4>
              <div style="font-size: 12px; color: var(--text-secondary);">${habitNames || `${(r.habitIds || []).length} hábitos`}</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
            <button class="btn-primary btn-load-routine" data-id="${r.id}" style="flex: 1; min-height: 38px; padding: 6px 12px; font-size: 12px; margin: 0; border-radius: 10px;">
              ${iconSVG('routine', 14)} Cargar Rutina
            </button>
            <button class="btn-danger btn-del-routine" data-id="${r.id}" style="padding: 6px 12px; font-size: 12px; border-radius: 10px; min-height: 38px; margin: 0; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer;">
              ${iconSVG('trash', 14)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  return `
    <div class="page routine-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 24px; width: 100%;">
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; margin-top: 2px;">
          ${iconSVG('menu', 20)}
        </button>
        <div style="flex: 1; min-width: 0;">
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Rutina<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${dateStr}</div>
        </div>
      </header>

      <!-- Section 1: Today's Routine -->
      <section class="today-section" style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Rutina de Hoy</h3>
            ${todayItems.length > 1 ? `
              <button id="btn-reorder-routine" class="btn-ghost" style="padding: 4px 10px; font-size: 12px; border: 1px solid ${isReorderingRoutine ? 'var(--text-primary)' : 'var(--border-subtle)'}; color: ${isReorderingRoutine ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                ${isReorderingRoutine ? `${iconSVG('check', 12)} Listo` : `${iconSVG('edit', 12)} Editar Orden`}
              </button>
            ` : ''}
          </div>
          <button id="btn-save-today-routine" class="btn-ghost" style="padding: 6px 12px; font-size: 12px; border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            ${iconSVG('star', 13)} Guardar Rutina
          </button>
        </div>
        ${todayListHtml}
      </section>

      <!-- Section 2: All Habits Ever Created -->
      <section class="all-habits-section" style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Todos tus Hábitos</h3>
          <button onclick="window.location.hash='/habit/new'" class="btn-ghost" style="padding: 6px 12px; font-size: 12px; border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ${iconSVG('plus', 13)} Nuevo
          </button>
        </div>
        ${allHabitsHtml}
      </section>

      <!-- Section 3: Saved Routines -->
      <section class="saved-routines-section" style="margin-bottom: 24px;">
        <div style="margin-bottom: 14px;">
          <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Rutinas Guardadas</h3>
        </div>

        ${routinesHtml}

        <div style="text-align: center; margin-top: 14px;">
          <button id="btn-create-custom-routine" class="btn-primary" style="padding: 8px 18px; font-size: 13px; min-height: 40px; border-radius: 10px; margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">
            ${iconSVG('plus', 15)} Crear Nueva Rutina
          </button>
        </div>
      </section>
    </div>
  `;
}

function openCompletionModeModal(habitId, habitName, onSelectMode) {
  document.getElementById('completion-mode-modal')?.remove();

  const modalHtml = `
    <div id="completion-mode-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 20px; border: 1px solid var(--border-subtle); background: var(--bg-surface); text-align: center;">
        
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          ${iconSVG('check', 22)}
        </div>

        <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 6px 0;">¡Excelente trabajo!</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 24px 0;">¿Qué versión completaste de "${habitName}"?</p>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          <button id="btn-mode-full" class="btn-primary" style="min-height: 50px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('star', 18)} Versión Completa (Normal)
          </button>

          <button id="btn-mode-2min" class="btn-secondary" style="min-height: 50px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('clock', 18)} Versión 2 Minutos
          </button>
        </div>

        <button id="btn-cancel-mode" class="btn-secondary" style="width: 100%; min-height: 44px; color: var(--text-secondary);">
          Cancelar
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-cancel-mode')?.addEventListener('click', () => {
    document.getElementById('completion-mode-modal')?.remove();
  });

  document.getElementById('btn-mode-full')?.addEventListener('click', () => {
    document.getElementById('completion-mode-modal')?.remove();
    onSelectMode('completed');
  });

  document.getElementById('btn-mode-2min')?.addEventListener('click', () => {
    document.getElementById('completion-mode-modal')?.remove();
    onSelectMode('completed_2min');
  });
}

function openCreateRoutineModal() {
  document.getElementById('create-routine-modal')?.remove();
  const habits = store.getState().habits || [];
  
  const habitsCheckboxes = habits.length === 0 
    ? `<div style="font-size: 13px; color: var(--text-secondary);">Primero tenés que crear algún hábito.</div>`
    : habits.map(h => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 10px; cursor: pointer;">
          <input type="checkbox" class="routine-habit-checkbox" value="${h.id}" checked style="width: 18px; height: 18px; accent-color: var(--text-primary);">
          <span style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${h.name} ${h.cue?.time ? `(${h.cue.time})` : ''}</span>
        </label>
      `).join('');

  const modalHtml = `
    <div id="create-routine-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 480px; padding: 28px; border-radius: 20px; border: 1px solid var(--border-subtle); max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Crear Nueva Rutina</h3>
          <button id="close-routine-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 18)}
          </button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; font-size: 13.5px;">Nombre de la Rutina</label>
          <input type="text" id="custom-routine-name" class="input" placeholder="Ej. Rutina Mañana / Noche..." style="width: 100%; min-height: 46px;">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; font-size: 13.5px;">Seleccionar Hábitos para incluir</label>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto;">
            ${habitsCheckboxes}
          </div>
        </div>

        <button id="btn-save-modal-routine" class="btn-primary" style="width: 100%; min-height: 48px; border-radius: 12px;">Guardar Rutina</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-routine-modal')?.addEventListener('click', () => {
    document.getElementById('create-routine-modal')?.remove();
  });

  document.getElementById('btn-save-modal-routine')?.addEventListener('click', () => {
    const name = document.getElementById('custom-routine-name')?.value.trim();
    if (!name) {
      showToast('Ingresá un nombre para la rutina', 'error');
      return;
    }

    const selectedHabits = Array.from(document.querySelectorAll('.routine-habit-checkbox:checked')).map(cb => cb.value);
    if (selectedHabits.length === 0) {
      showToast('Seleccioná al menos un hábito para la rutina', 'error');
      return;
    }

    const routine = {
      id: store.generateId(),
      name,
      habitIds: selectedHabits,
      repeatDays: [],
      createdAt: new Date().toISOString()
    };

    store.saveRoutine(routine);
    showToast(`Rutina "${name}" guardada con éxito`, 'success');
    document.getElementById('create-routine-modal')?.remove();
    refreshRoutineView();
  });
}

function refreshRoutineView() {
  const pageContent = document.querySelector('.routine-page');
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
  cleanup = [];

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

  // Toggle/uncomplete habit from Today's Routine
  document.querySelectorAll('.btn-toggle-routine-today').forEach(card => {
    card.addEventListener('click', async (e) => {
      e.stopPropagation();
      const rawId = e.currentTarget.dataset.id;
      const isRep = rawId.includes('_rep_');
      const habitId = isRep ? rawId.split('_rep_')[0] : rawId;
      const repIndex = isRep ? rawId.split('_rep_')[1] : null;
      const completionDateKey = isRep ? store.getTodayString() + '_rep_' + repIndex : store.getTodayString();
      const isCompleted = e.currentTarget.dataset.completed === 'true';

      if (isCompleted) {
        await store.uncompleteEvent(habitId, completionDateKey);
        showToast('Hábito desmarcado como pendiente', 'info');
        refreshRoutineView();
      } else {
        const habit = store.getState().habits?.find(h => h.id === habitId);
        if (!habit?.response?.twoMinVersion || habit?.noTwoMin) {
          const res = await store.completeEvent(habitId, completionDateKey, 'completed') || {};
          const streak = res.newStreak || 1;
          showToast(`¡Excelente! Racha: ${streak} días (Completo)`, 'success');
          refreshRoutineView();
        } else {
          openCompletionModeModal(rawId, habit?.name || 'Hábito', async (mode) => {
            const res = await store.completeEvent(habitId, completionDateKey, mode) || {};
            const streak = res.newStreak || 1;
            const modeText = mode === 'completed_2min' ? ' (2 minutos)' : ' (Completo)';
            showToast(`¡Excelente! Racha: ${streak} días${modeText}`, 'success');
            refreshRoutineView();
          });
        }
      }
    });
  });

  document.getElementById('btn-reorder-routine')?.addEventListener('click', () => {
    isReorderingRoutine = !isReorderingRoutine;
    refreshRoutineView();
  });

  document.querySelectorAll('.btn-move-up-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      if (idx > 0) {
        const cards = Array.from(document.querySelectorAll('.habit-group-card-routine'));
        const ids = cards.map(c => c.dataset.rootId);
        const temp = ids[idx];
        ids[idx] = ids[idx - 1];
        ids[idx - 1] = temp;
        store.saveHabitOrder(store.getTodayString(), ids);
        refreshRoutineView();
      }
    });
  });

  document.querySelectorAll('.btn-move-down-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const cards = Array.from(document.querySelectorAll('.habit-group-card-routine'));
      const ids = cards.map(c => c.dataset.rootId);
      if (idx < ids.length - 1) {
        const temp = ids[idx];
        ids[idx] = ids[idx + 1];
        ids[idx + 1] = temp;
        store.saveHabitOrder(store.getTodayString(), ids);
        refreshRoutineView();
      }
    });
  });

  document.getElementById('btn-create-custom-routine')?.addEventListener('click', () => {
    openCreateRoutineModal();
  });

  document.querySelectorAll('.btn-edit-habit-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rawId = e.currentTarget.dataset.id;
      const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
      navigate('/habit/new', { id, from: 'routine' });
    });
  });

  document.querySelectorAll('.btn-chain-habit-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rawId = e.currentTarget.dataset.id;
      const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
      navigate('/chain', { habitId: id });
    });
  });

  document.querySelectorAll('.btn-restore-habit-routine').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const rawId = e.currentTarget.dataset.id;
      const isRep = rawId.includes('_rep_');
      const habitId = isRep ? rawId.split('_rep_')[0] : rawId;
      const repIndex = isRep ? rawId.split('_rep_')[1] : null;
      const completionDateKey = isRep ? store.getTodayString() + '_rep_' + repIndex : store.getTodayString();

      await store.restoreTodayEvent(habitId, completionDateKey);
      showToast('Hábito restaurado', 'success');
      refreshRoutineView();
    });
  });

  document.querySelectorAll('.btn-delete-habit-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rawId = e.currentTarget.dataset.id;
      const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
      const name = e.currentTarget.dataset.name || 'Hábito';
      showDeleteHabitModal(id, name, () => {
        refreshRoutineView();
      });
    });
  });

  document.querySelectorAll('.btn-skip-habit-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rawId = e.currentTarget.dataset.id;
      const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
      const name = e.currentTarget.dataset.name || 'Hábito';
      showSkipHabitModal(id, name, () => {
        refreshRoutineView();
      });
    });
  });

  document.querySelectorAll('.btn-unskip-habit-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rawId = e.currentTarget.dataset.id;
      const name = e.currentTarget.dataset.name || 'Hábito';
      const isRep = rawId.includes('_rep_');
      const habitId = isRep ? rawId.split('_rep_')[0] : rawId;
      const repIndex = isRep ? rawId.split('_rep_')[1] : null;
      const completionDateKey = isRep ? store.getTodayString() + '_rep_' + repIndex : store.getTodayString();

      showUnskipHabitModal(habitId, name, completionDateKey, () => {
        refreshRoutineView();
      });
    });
  });

  // Save Today's Routine
  document.getElementById('btn-save-today-routine')?.addEventListener('click', () => {
    const state = store.getState();
    const habits = state.habits || [];
    if (habits.length === 0) {
      showToast('Primero agregá algún hábito para guardar una rutina', 'info');
      return;
    }

    const name = prompt('Nombre para esta rutina (ej. Rutina Mañanera):');
    if (name) {
      const cards = Array.from(document.querySelectorAll('.habit-item-card-routine'));
      const orderedIds = cards.length > 0 ? cards.map(c => c.dataset.id) : habits.map(h => h.id);
      const routine = {
        id: store.generateId(),
        name,
        habitIds: orderedIds,
        repeatDays: [],
        createdAt: new Date().toISOString()
      };
      store.saveRoutine(routine);
      showToast(`Rutina "${name}" guardada con éxito`, 'success');
      refreshRoutineView();
    }
  });

  // Load Routine
  document.querySelectorAll('.btn-load-routine').forEach(btn => {
    const loadHandler = (e) => {
      const state = store.getState();
      const routineId = e.currentTarget.dataset.id;
      const routine = state.routines.find(r => r.id === routineId);
      if (routine) {
        if (routine.habitIds && routine.habitIds.length > 0) {
          store.saveHabitOrder(store.getTodayString(), routine.habitIds);
        }
        showToast(`Rutina "${routine.name}" cargada para hoy`, 'success');
        refreshRoutineView();
      }
    };
    btn.addEventListener('click', loadHandler);
  });

  // Delete routines
  document.querySelectorAll('.btn-del-routine').forEach(btn => {
    const delHandler = (e) => {
      if(confirm('¿Seguro que querés eliminar esta rutina?')) {
        store.deleteRoutine(e.currentTarget.dataset.id);
        refreshRoutineView();
      }
    };
    btn.addEventListener('click', delHandler);
  });
}

export function unmount() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}
