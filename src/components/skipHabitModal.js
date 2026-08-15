import { store } from '../store.js';
import { showToast } from './toast.js';

export function showSkipHabitModal(habitId, habitName, onDone) {
  const existing = document.getElementById('skip-habit-modal');
  if (existing) existing.remove();

  const driverActive = store.getState().driverProfile?.active;

  const html = `
    <div id="skip-habit-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-ui);">
      <div class="glass-card" style="width: 100%; max-width: 420px; padding: 24px; border-radius: 20px; background: var(--bg-surface); text-align: center;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(229, 62, 62, 0.15); color: #E53E3E; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 20px; font-weight: bold;">
          ⚠️
        </div>
        <h3 class="editorial-title" style="font-size: 20px; margin: 0 0 10px 0; color: var(--text-primary);">¿Saltar el hábito "${habitName}"?</h3>
        <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
          Saltar este hábito <strong>cortará tu racha/cadena a 0</strong>${driverActive ? ', <strong>te restará 1 OVR</strong> en tu perfil de piloto' : ''} y figurará en el historial de incidentes que ven tus amigos.
        </p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="btn-confirm-skip" class="btn-danger" style="background: #E53E3E; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 13.5px;">
            Sí, saltar hábito
          </button>
          <button id="btn-cancel-skip" class="btn-ghost" style="margin-top: 4px; font-size: 13px;">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('skip-habit-modal');
  const closeModal = () => modal?.remove();

  document.getElementById('btn-confirm-skip')?.addEventListener('click', async () => {
    closeModal();
    await store.skipEvent(habitId, store.getTodayString());
    showToast(`Hábito "${habitName}" marcado como Salteado`, 'warning');
    if (onDone) onDone();
  });

  document.getElementById('btn-cancel-skip')?.addEventListener('click', closeModal);
}
