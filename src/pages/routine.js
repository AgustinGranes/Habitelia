import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function render() {
  const state = store.getState();
  const habits = state.habits || [];
  const routines = state.routines || [];
  const todayDate = store.getTodayString();
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // Map user habits into today's items
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
      <div class="empty-state glass-card" style="text-align: center; padding: 40px 20px; border-radius: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">📋</div>
        <h3 style="font-family: 'Playfair Display', serif; font-size: 22px; color: #fff; margin-bottom: 8px;">Sin hábitos para hoy</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Creá un hábito o cargá una rutina guardada.</p>
        <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 220px; margin: 0 auto;">+ Crear Hábito</button>
      </div>
    `;
  } else {
    todayListHtml = todayItems.map(item => `
      <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; margin-bottom: 12px; border-radius: 16px; border: 1px solid ${item.completed ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.08)'}; opacity: ${item.completed ? '0.6' : '1'};">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 26px;">${item.icon}</span>
          <div>
            <div style="font-weight: 700; font-size: 16px; color: #fff; ${item.completed ? 'text-decoration: line-through;' : ''}">${item.name}</div>
            <div style="font-size: 13px; color: #F5C518; margin-top: 2px;">⏰ ${item.time} (${item.duration} min)</div>
          </div>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: ${item.completed ? '#4CAF50' : '#F5C518'}; background: ${item.completed ? 'rgba(76, 175, 80, 0.15)' : 'rgba(245, 197, 24, 0.12)'}; padding: 6px 14px; border-radius: 20px;">
          ${item.completed ? '✓ Completado' : 'Pendiente'}
        </div>
      </div>
    `).join('');
  }

  let routinesHtml = '';
  if (routines.length === 0) {
    routinesHtml = `
      <div class="empty-state glass-card" style="text-align: center; padding: 32px 20px; border-radius: 20px; color: var(--text-muted); font-size: 14px;">
        Aún no guardaste ninguna rutina. Guardá la de hoy para reutilizarla cuando quieras.
      </div>
    `;
  } else {
    routinesHtml = routines.map(r => {
      const habitNames = (r.habitIds || []).map(id => habits.find(h => h.id === id)?.name).filter(Boolean).join(', ');
      const repeatDays = (r.repeatDays || []).join(', ') || 'Sin repetición';

      return `
        <div class="glass-card routine-card" style="padding: 20px; margin-bottom: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="margin: 0 0 4px 0; font-family: 'Playfair Display', serif; font-size: 20px; color: #fff;">${r.name}</h4>
              <div style="font-size: 13px; color: var(--text-muted);">${habitNames || `${(r.habitIds || []).length} hábitos`}</div>
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #F5C518; background: rgba(245, 197, 24, 0.12); padding: 4px 10px; border-radius: 20px;">
              🔄 ${repeatDays}
            </span>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
            <button class="btn-primary btn-load-routine" data-id="${r.id}" style="flex: 1; min-height: 40px; padding: 8px 14px; font-size: 13px; margin: 0;">⚡ Cargar Hoy</button>
            <button class="btn-secondary btn-repeat-routine" data-id="${r.id}" style="flex: 1; min-height: 40px; padding: 8px 14px; font-size: 13px; margin: 0; background: rgba(255,255,255,0.06);">📅 Repetir Días</button>
            <button class="btn-danger btn-del-routine" data-id="${r.id}" style="padding: 8px 14px; font-size: 13px; border-radius: 10px; min-height: 40px; margin: 0; background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); color: #FF5252; cursor: pointer;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  return `
    <div class="page routine-page" style="padding: 24px 20px 100px 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box; overflow-y: auto;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
          <div>
            <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Rutina de Hoy</h1>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${dateStr}</div>
          </div>
        </div>
      </header>

      <section class="today-section" style="margin-bottom: 40px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #fff; margin: 0;">Hábitos de Hoy</h3>
          <div style="display: flex; gap: 8px;">
            <button id="btn-save-today-routine" class="btn-ghost" style="padding: 6px 12px; font-size: 12px; border: 1px solid rgba(245, 197, 24, 0.3); color: #F5C518; border-radius: 8px; cursor: pointer;">💾 Guardar Rutina</button>
          </div>
        </div>

        ${todayListHtml}
      </section>

      <section class="saved-routines-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #fff; margin: 0;">Rutinas Guardadas</h3>
        </div>
        ${routinesHtml}
      </section>
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
      const routineId = e.target.dataset.id;
      const routine = state.routines.find(r => r.id === routineId);
      if (routine) {
        // Simple mock load: map habitIds to schedule items spaced by 30 mins starting at 08:00
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
        navigate('/routine');
      }
    };
    btn.addEventListener('click', loadHandler);
    cleanup.push(() => btn.removeEventListener('click', loadHandler));
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
    cleanup.push(() => btn.removeEventListener('click', delHandler));
  });
}

export function unmount() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}
