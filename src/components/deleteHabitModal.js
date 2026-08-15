import { store } from '../store.js';
import { showToast } from './toast.js';

export function showDeleteHabitModal(habitId, habitName, onDone) {
  const existing = document.getElementById('delete-habit-modal');
  if (existing) existing.remove();

  const html = `
    <div id="delete-habit-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-ui);">
      <div class="glass-card" style="width: 100%; max-width: 400px; padding: 24px; border-radius: 20px; background: var(--bg-surface); text-align: center;">
        <h3 class="editorial-title" style="font-size: 20px; margin: 0 0 10px 0; color: var(--text-primary);">¿Eliminar Hábito?</h3>
        <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.4;">
          ¿Cómo deseas eliminar el hábito <strong>"${habitName}"</strong>?
        </p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="btn-skip-today" class="btn-primary" style="background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-subtle); font-size: 13px;">
            Solo por el día de hoy (No descuenta OVR)
          </button>
          <button id="btn-delete-forever" class="btn-danger" style="background: #E53E3E; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 13px;">
            Para siempre (Eliminar hábito)
          </button>
          <button id="btn-cancel-delete" class="btn-ghost" style="margin-top: 4px; font-size: 13px;">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('delete-habit-modal');
  const closeModal = () => modal?.remove();

  document.getElementById('btn-skip-today')?.addEventListener('click', async () => {
    closeModal();
    await store.skipEvent(habitId, store.getTodayString());
    showToast(`Hábito "${habitName}" salteado por hoy`, 'info');
    if (onDone) onDone();
  });

  document.getElementById('btn-delete-forever')?.addEventListener('click', async () => {
    closeModal();
    await store.deleteHabit(habitId);
    showToast(`Hábito "${habitName}" eliminado para siempre`, 'info');
    if (onDone) onDone();
  });

  document.getElementById('btn-cancel-delete')?.addEventListener('click', closeModal);
}
