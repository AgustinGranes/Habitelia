import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

let cleanup = [];

export function render() {
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const todayDate = store.getTodayString();
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // 1. Today's Items
  const todayItems = habits.map(h => {
    const isCompleted = h.completions?.[todayDate] === 'completed';
    const isSkipped = h.completions?.[todayDate] === 'skipped';
    return {
      id: h.id,
      name: h.name,
      icon: h.icon || '🎯',
      time: h.cue?.time || '08:00',
      duration: h.duration || 15,
      completed: isCompleted,
      skipped: isSkipped
    };
  });
  todayItems.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  let todayListHtml = '';
  if (todayItems.length === 0) {
    todayListHtml = `
      <div class="empty-state glass-card" style="text-align: center; padding: 32px 20px; border-radius: 20px;">
        <div style="font-size: 40px; margin-bottom: 8px;">📋</div>
        <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #fff; margin-bottom: 6px;">Sin hábitos programados para hoy</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">Creá un hábito o cargá una rutina guardada.</p>
        <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 200px; margin: 0 auto; font-size: 13px; min-height: 40px;">+ Crear Hábito</button>
      </div>
    `;
  } else {
    todayListHtml = todayItems.map(item => `
      <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 10px; border-radius: 16px; border: 1px solid ${item.completed ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.08)'}; opacity: ${item.completed ? '0.6' : '1'};">
        <div style="display: flex; align-items: center; gap: 14px;">
          <span style="font-size: 24px;">${item.icon}</span>
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #fff; ${item.completed ? 'text-decoration: line-through;' : ''}">${item.name}</div>
            <div style="font-size: 12px; color: #F5C518; margin-top: 2px;">⏰ ${item.time} (${item.duration} min)</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: ${item.completed ? '#4CAF50' : '#F5C518'}; background: ${item.completed ? 'rgba(76, 175, 80, 0.15)' : 'rgba(245, 197, 24, 0.12)'}; padding: 4px 12px; border-radius: 20px;">
          ${item.completed ? '✓ Completado' : 'Pendiente'}
        </div>
      </div>
    `).join('');
  }

  // 2. All Habits Ever Created (without date/time)
  let allHabitsHtml = '';
  if (habits.length === 0) {
    allHabitsHtml = `
      <div class="empty-state glass-card" style="text-align: center; padding: 24px 20px; border-radius: 16px; color: var(--text-muted); font-size: 13px;">
        Aún no creaste ningún hábito. Tocá (+) para empezar.
      </div>
    `;
  } else {
    allHabitsHtml = habits.map(h => `
      <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; margin-bottom: 10px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <span style="font-size: 24px;">${h.icon || '🎯'}</span>
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #fff;">${h.name}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Duración: ${h.duration || 15} min ${h.cue?.place ? `• 📍 ${h.cue.place}` : ''}</div>
          </div>
        </div>
        <button class="btn-ghost btn-edit-habit-routine" data-id="${h.id}" style="padding: 6px 12px; font-size: 12px; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; cursor: pointer;">✏️ Editar</button>
      </div>
    `).join('');
  }

  // 3. Saved Routines
  let routinesHtml = '';
  if (routines.length === 0) {
    routinesHtml = `
      <div class="empty-state glass-card" style="text-align: center; padding: 24px 20px; border-radius: 16px; color: var(--text-muted); font-size: 13px; margin-bottom: 14px;">
        Aún no guardaste ninguna rutina personalizada.
      </div>
    `;
  } else {
    routinesHtml = routines.map(r => {
      const habitNames = (r.habitIds || []).map(id => habits.find(h => h.id === id)?.name).filter(Boolean).join(', ');
      return `
        <div class="glass-card routine-card" style="padding: 18px; margin-bottom: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <h4 style="margin: 0 0 4px 0; font-family: 'Playfair Display', serif; font-size: 18px; color: #fff;">${r.name}</h4>
              <div style="font-size: 12px; color: var(--text-muted);">${habitNames || `${(r.habitIds || []).length} hábitos`}</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
            <button class="btn-primary btn-load-routine" data-id="${r.id}" style="flex: 1; min-height: 38px; padding: 6px 12px; font-size: 12px; margin: 0;">⚡ Cargar Rutina</button>
            <button class="btn-danger btn-del-routine" data-id="${r.id}" style="padding: 6px 12px; font-size: 12px; border-radius: 8px; min-height: 38px; margin: 0; background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); color: #FF5252; cursor: pointer;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  return `
    <div class="page routine-page" style="padding: 24px 20px 100px 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box; overflow-y: auto;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
          <div>
            <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Rutina</h1>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${dateStr}</div>
          </div>
        </div>
      </header>

      <!-- Section 1: Today's Routine -->
      <section class="today-section" style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 19px; color: #fff; margin: 0;">Rutina de Hoy</h3>
          <button id="btn-save-today-routine" class="btn-ghost" style="padding: 6px 12px; font-size: 12px; border: 1px solid rgba(245, 197, 24, 0.3); color: #F5C518; border-radius: 8px; cursor: pointer;">💾 Guardar Rutina</button>
        </div>
        ${todayListHtml}
      </section>

      <!-- Section 2: All Habits Ever Created -->
      <section class="all-habits-section" style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 19px; color: #fff; margin: 0;">Todos tus Hábitos</h3>
          <button onclick="window.location.hash='/habit/new'" class="btn-ghost" style="padding: 6px 12px; font-size: 12px; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; cursor: pointer;">+ Nuevo</button>
        </div>
        ${allHabitsHtml}
      </section>

      <!-- Section 3: Saved Routines -->
      <section class="saved-routines-section" style="margin-bottom: 24px;">
        <div style="margin-bottom: 14px;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 19px; color: #fff; margin: 0;">Rutinas Guardadas</h3>
        </div>

        ${routinesHtml}

        <div style="text-align: center; margin-top: 14px;">
          <button id="btn-create-custom-routine" class="btn-primary" style="padding: 8px 18px; font-size: 13px; min-height: 38px; border-radius: 10px; margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">➕ Crear Nueva Rutina</button>
        </div>
      </section>
    </div>
  `;
}

function openCreateRoutineModal() {
  document.getElementById('create-routine-modal')?.remove();
  const habits = store.getState().habits || [];
  
  const habitsCheckboxes = habits.length === 0 
    ? `<div style="font-size: 13px; color: var(--text-muted);">Primero tenés que crear algún hábito.</div>`
    : habits.map(h => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.04); border-radius: 10px; cursor: pointer;">
          <input type="checkbox" class="routine-habit-checkbox" value="${h.id}" checked style="width: 18px; height: 18px; accent-color: #F5C518;">
          <span style="font-size: 20px;">${h.icon || '🎯'}</span>
          <span style="font-weight: 600; font-size: 14px; color: #fff;">${h.name} (${h.cue?.time || '08:00'})</span>
        </label>
      `).join('');

  const modalHtml = `
    <div id="create-routine-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 480px; padding: 26px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.15); max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 22px; margin: 0; color: #fff;">➕ Crear Nueva Rutina</h3>
          <button id="close-routine-modal" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; color: #fff; margin-bottom: 8px; font-size: 14px;">Nombre de la Rutina</label>
          <input type="text" id="custom-routine-name" class="input" placeholder="Ej. Rutina Mañana / Noche..." style="width: 100%; min-height: 46px;">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; color: #fff; margin-bottom: 10px; font-size: 14px;">Seleccionar Hábitos para incluir</label>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto;">
            ${habitsCheckboxes}
          </div>
        </div>

        <button id="btn-save-modal-routine" class="btn-primary" style="width: 100%; min-height: 48px; border-radius: 12px; font-size: 15px; font-weight: 700; margin: 0;">Guardar Rutina</button>
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
    showToast(`Rutina "${name}" guardada con éxito 🎉`, 'success');
    document.getElementById('create-routine-modal')?.remove();
    navigate('/routine');
  });
}

export function mount() {
  cleanup = [];

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
      navigate('/routine');
    }
  });

  // Load Routine
  document.querySelectorAll('.btn-load-routine').forEach(btn => {
    const loadHandler = (e) => {
      const state = store.getState();
      const routineId = e.target.dataset.id;
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
        showToast(`Rutina "${routine.name}" cargada para hoy ⚡`, 'success');
        navigate('/routine');
      }
    };
    btn.addEventListener('click', loadHandler);
  });

  // Delete routines
  document.querySelectorAll('.btn-del-routine').forEach(btn => {
    const delHandler = (e) => {
      if(confirm('¿Seguro que querés eliminar esta rutina?')) {
        store.deleteRoutine(e.target.dataset.id);
        navigate('/routine');
      }
    };
    btn.addEventListener('click', delHandler);
  });
}

export function unmount() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}
