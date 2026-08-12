import { findNextFreeSlot, getTimeRange } from '../utils/time.js';

export function showCollisionModal(newEvent, collidingEvents, existingSchedule) {
  return new Promise((resolve) => {
    const existing = collidingEvents[0]; // simplify to handle first collision
    
    const suggestedTime = findNextFreeSlot(newEvent.duration, existingSchedule, newEvent.startTime);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
      <div class="modal-content glass-card">
        <h3>⚠️ Conflicto de Horario</h3>
        <p>[Nuevo] ( ${getTimeRange(newEvent.startTime, newEvent.duration)} ) se superpone con un evento existente ( ${getTimeRange(existing.startTime, existing.duration)} )</p>
        
        <div class="collision-actions" style="margin-top: 1rem;">
          ${suggestedTime ? `
            <div class="glass-card" style="margin-bottom:1rem; padding:1rem;">
              <p>Horario libre sugerido: <strong>${getTimeRange(suggestedTime, newEvent.duration)}</strong></p>
              <button id="btn-suggested" class="btn-primary">Aceptar sugerencia</button>
            </div>
          ` : ''}
          <div class="glass-card" style="margin-bottom:1rem; padding:1rem;">
            <p>O podés reemplazar el evento existente</p>
            <button id="btn-replace" class="btn-ghost" style="color:var(--accent);">Reemplazar existente</button>
          </div>
        </div>
        <button id="btn-cancel" class="btn-ghost">Cancelar</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    if (suggestedTime) {
      overlay.querySelector('#btn-suggested').addEventListener('click', () => {
        cleanup();
        resolve({ resolved: true, adjustedEvent: { ...newEvent, startTime: suggestedTime } });
      });
    }

    overlay.querySelector('#btn-replace').addEventListener('click', () => {
      // In a real app, we'd remove 'existing' from the schedule
      const index = existingSchedule.findIndex(e => e.habitId === existing.habitId);
      if (index > -1) existingSchedule.splice(index, 1);
      cleanup();
      resolve({ resolved: true, adjustedEvent: newEvent });
    });

    overlay.querySelector('#btn-cancel').addEventListener('click', () => {
      cleanup();
      resolve({ resolved: false });
    });
  });
}
