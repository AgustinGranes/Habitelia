import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

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
    daysHtml += `<div class="calendar-day other-month" style="opacity: 0.2; pointer-events: none;"></div>`;
  }
  
  const today = new Date();
  const routines = store.getState().routines || [];

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const assignedRoutineId = localStorage.getItem(`assigned_routine_${dateStr}`);
    const assignedRoutine = routines.find(r => r.id === assignedRoutineId);

    daysHtml += `
      <div class="calendar-day ${isToday ? 'today-day' : ''}" data-day="${i}" data-date="${dateStr}" style="aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid ${isToday ? '#F5C518' : 'rgba(255,255,255,0.08)'}; background: ${isToday ? 'rgba(245, 197, 24, 0.12)' : 'var(--bg-glass)'}; cursor: pointer; position: relative; transition: all 0.2s;">
        <span style="font-weight: ${isToday ? '700' : '500'}; color: ${isToday ? '#F5C518' : '#fff'}; font-size: 15px;">${i}</span>
        ${assignedRoutine ? `<span style="font-size: 9px; color: #F5C518; background: rgba(245, 197, 24, 0.2); padding: 2px 4px; border-radius: 4px; margin-top: 4px; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${assignedRoutine.name}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="page calendar-page" style="padding: 24px 20px 100px 20px; max-width: 650px; margin: 0 auto; width: 100%; box-sizing: border-box; overflow-y: auto;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
          <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Calendario</h1>
        </div>
      </header>

      <div class="glass-card" style="padding: 24px; border-radius: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <button id="prev-month" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 40px; height: 40px; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">◀</button>
          <h2 style="font-family: 'Playfair Display', serif; font-size: 22px; margin: 0; color: #fff;">${monthNames[month]} ${year}</h2>
          <button id="next-month" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 40px; height: 40px; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">▶</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 12px;">
          ${weekdays.map(d => `<div>${d}</div>`).join('')}
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
          ${daysHtml}
        </div>
      </div>
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

  // Month navigation
  document.getElementById('prev-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    navigate('/calendar');
  });

  document.getElementById('next-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    navigate('/calendar');
  });

  // Day selection modal for assigning routine or habit
  document.querySelectorAll('.calendar-day[data-date]').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const dateStr = dayEl.dataset.date;
      openPresetModal(dateStr);
    });
  });
}

function openPresetModal(dateStr) {
  // Remove existing modal if any
  document.getElementById('preset-modal-overlay')?.remove();

  const routines = store.getState().routines || [];
  const habits = store.getState().habits || [];

  let routinesCardsHtml = '';
  if (routines.length === 0) {
    routinesCardsHtml = `
      <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 14px; background: rgba(255,255,255,0.03); border-radius: 14px; margin-bottom: 16px;">
        Aún no tenés rutinas guardadas. Podés crear una en "Rutina de Hoy" o agregar hábitos individuales.
      </div>
    `;
  } else {
    routinesCardsHtml = routines.map(r => {
      const habitNames = (r.habitIds || []).map(id => habits.find(h => h.id === id)?.name).filter(Boolean).join(', ');
      return `
        <div class="glass-card routine-preset-card" data-routine-id="${r.id}" style="padding: 16px; margin-bottom: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: transform 0.2s, border-color 0.2s;">
          <div>
            <div style="font-weight: 700; font-size: 16px; color: #fff; margin-bottom: 4px;">⚡ ${r.name}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${habitNames || `${(r.habitIds || []).length} hábitos`}</div>
          </div>
          <button class="btn-primary" style="padding: 8px 14px; font-size: 12px; min-height: 36px; margin: 0; border-radius: 8px;">Cargar</button>
        </div>
      `;
    }).join('');
  }

  const modalHtml = `
    <div id="preset-modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 480px; padding: 28px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.15); max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="font-family: 'Playfair Display', serif; font-size: 22px; margin: 0; color: #fff;">Asignar a Fecha</h3>
            <div style="font-size: 13px; color: #F5C518; margin-top: 2px;">📅 ${dateStr}</div>
          </div>
          <button id="close-preset-modal" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 12px;">Rutinas Guardadas (Presets)</label>
          ${routinesCardsHtml}
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
          <button id="btn-add-individual-habit" class="btn-secondary" style="width: 100%; min-height: 48px; border-radius: 12px; font-weight: 600; font-size: 14px; margin: 0;">
            ➕ Agregar / Crear Hábito Individual
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Close modal event
  document.getElementById('close-preset-modal')?.addEventListener('click', () => {
    document.getElementById('preset-modal-overlay')?.remove();
  });

  // Assign routine preset event
  document.querySelectorAll('.routine-preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const routineId = card.dataset.routineId;
      const routine = (store.getState().routines || []).find(r => r.id === routineId);
      if (routine) {
        localStorage.setItem(`assigned_routine_${dateStr}`, routine.id);
        showToast(`Rutina "${routine.name}" cargada para el ${dateStr}`, 'success');
        document.getElementById('preset-modal-overlay')?.remove();
        navigate('/calendar');
      }
    });
  });

  // Add individual habit event
  document.getElementById('btn-add-individual-habit')?.addEventListener('click', () => {
    document.getElementById('preset-modal-overlay')?.remove();
    navigate('/habit/new');
  });
}

export function unmount() {
}
