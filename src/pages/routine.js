import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

let cleanup = [];

export function render() {
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const todayDate = store.getTodayString();
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // 1. Today's Items
  const todayItems = habits.map(h => {
    const status = h.completions?.[todayDate];
    const isCompleted = status === 'completed' || status === 'completed_2min';
    const isTwoMin = status === 'completed_2min';
    const isSkipped = status === 'skipped';
    const linkedPleasure = h.craving?.linkedPleasure || h.linkedPleasure || '';
    return {
      id: h.id,
      name: h.name,
      icon: h.icon || '🎯',
      time: h.cue?.time || '08:00',
      duration: h.duration || 15,
      linkedPleasure,
      completed: isCompleted,
      isTwoMin,
      skipped: isSkipped
    };
  });
  todayItems.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

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
    todayListHtml = todayItems.map(item => `
      <div class="glass-card btn-toggle-routine-today" data-id="${item.id}" data-completed="${item.completed}" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 10px; border-radius: 14px; border: 1px solid var(--border-subtle); cursor: pointer; opacity: ${item.completed ? '0.75' : '1'}; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; border: 1.75px solid ${item.completed ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${item.completed ? (item.isTwoMin ? 'rgba(255,255,255,0.45)' : 'var(--text-primary)') : 'transparent'}; color: ${item.completed ? 'var(--bg-primary)' : 'transparent'}; display: flex; align-items: center; justify-content: center;">
            ${iconSVG('check', 13)}
          </div>
          <div>
            <div style="font-weight: 600; font-size: 15px; color: var(--text-primary); ${item.completed ? 'text-decoration: line-through;' : ''}">${item.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${iconSVG('clock', 12)} ${item.time} (${item.duration} min)</div>
            ${item.linkedPleasure ? `<div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">Ritual previo: ${item.linkedPleasure}</div>` : ''}
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: ${item.completed ? 'var(--text-primary)' : 'var(--text-secondary)'}; background: var(--bg-subtle); padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border-subtle);">
          ${item.completed ? (item.isTwoMin ? '✓ 2 Minutos' : '✓ Completado') : 'Pendiente'}
        </div>
      </div>
    `).join('');
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
      return `
        <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 10px; border-radius: 14px; border: 1px solid var(--border-subtle);">
          <div>
            <div style="font-weight: 600; font-size: 15px; color: var(--text-primary);">${h.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Duración: ${h.duration || 15} min ${h.cue?.place ? `• ${h.cue.place}` : ''}</div>
            ${linkedPleasure ? `<div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">Ritual previo: ${linkedPleasure}</div>` : ''}
          </div>
          <button class="btn-ghost btn-edit-habit-routine" data-id="${h.id}" style="padding: 6px 12px; font-size: 12px; border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            ${iconSVG('edit', 14)} Editar
          </button>
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
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Rutina<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${dateStr}</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <!-- Section 1: Today's Routine -->
      <section class="today-section" style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Rutina de Hoy</h3>
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
          <span style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${h.name} (${h.cue?.time || '08:00'})</span>
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
      const habitId = e.currentTarget.dataset.id;
      const isCompleted = e.currentTarget.dataset.completed === 'true';
      const todayDate = store.getTodayString();

      if (isCompleted) {
        await store.uncompleteEvent(habitId, todayDate);
        showToast('Hábito desmarcado como pendiente', 'info');
        refreshRoutineView();
      } else {
        const habit = store.getState().habits?.find(h => h.id === habitId);
        openCompletionModeModal(habitId, habit?.name || 'Hábito', async (mode) => {
          const res = await store.completeEvent(habitId, todayDate, mode) || {};
          const streak = res.newStreak || 1;
          const modeText = mode === 'completed_2min' ? ' (2 minutos)' : ' (Completo)';
          showToast(`¡Excelente! Racha: ${streak} días${modeText}`, 'success');
          refreshRoutineView();
        });
      }
    });
  });

  document.getElementById('btn-create-custom-routine')?.addEventListener('click', () => {
    openCreateRoutineModal();
  });

  document.querySelectorAll('.btn-edit-habit-routine').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      navigate('/habit/new', { id });
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
      const routine = {
        id: store.generateId(),
        name,
        habitIds: habits.map(h => h.id),
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
        const newSchedule = routine.habitIds.map((id, i) => {
          const habit = state.habits.find(h => h.id === id);
          return {
            habitId: id,
            startTime: `0${8 + Math.floor(i/2)}:${i%2===0?'00':'30'}`,
            duration: habit ? habit.duration : 15,
            completed: false,
            skipped: false
          };
        });
        store.saveTodaySchedule(newSchedule);
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
