import { store } from '../store.js';
import { showToast } from './toast.js';

export function showUnskipHabitModal(habitId, habitName, date, onDone) {
  const existing = document.getElementById('unskip-habit-modal');
  if (existing) existing.remove();

  const driverActive = store.getState().driverProfile?.active;

  const html = `
    <div id="unskip-habit-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-ui);">
      <div class="glass-card" style="width: 100%; max-width: 420px; padding: 24px; border-radius: 20px; background: var(--bg-surface); text-align: center; border: 1px solid var(--border-subtle);">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(229, 62, 62, 0.15); color: #E53E3E; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 20px; font-weight: bold;">
          ❓
        </div>
        <h3 class="editorial-title" style="font-size: 19px; margin: 0 0 10px 0; color: var(--text-primary); line-height: 1.4;">¿Quitar salteado del hábito?</h3>
        <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5; text-align: center;">
          ¿Seguro que deseas volver a poner este evento como sin completar? ${driverActive ? 'Se te devolverá el OVR perdido.' : ''}
        </p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="btn-confirm-unskip" class="btn-primary" style="width: 100%; min-height: 44px; border-radius: 12px; font-size: 13.5px; font-weight: 600; cursor: pointer;">
            Sí, poner sin completar
          </button>
          <button id="btn-cancel-unskip" class="btn-ghost" style="margin-top: 4px; font-size: 13px; cursor: pointer; border: none; background: transparent; color: var(--text-secondary);">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('unskip-habit-modal');
  const closeModal = () => modal?.remove();

  document.getElementById('btn-confirm-unskip')?.addEventListener('click', async () => {
    closeModal();
    await store.unskipEvent(habitId, date);
    showToast('Hábito vuelto a sin completar', 'info');
    if (onDone) onDone();
  });

  document.getElementById('btn-cancel-unskip')?.addEventListener('click', closeModal);
}
