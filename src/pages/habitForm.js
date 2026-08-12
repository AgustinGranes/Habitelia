import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { parseTime, formatTime, minutesToTime, getEndTime, checkCollision } from '../utils/time.js';

let currentStep = 1;
let habitData = {};

export function render(props = {}) {
  currentStep = 1;
  const hashId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('id');
  const targetId = props?.id || hashId;

  if (targetId) {
    const state = store.getState();
    const existing = (state.habits || []).find(h => h.id === targetId);
    if (existing) {
      habitData = JSON.parse(JSON.stringify(existing));
    } else {
      habitData = {
        name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '' },
        craving: { linkedPleasure: 'Tomar un té caliente' },
        response: { twoMinVersion: '' }
      };
    }
  } else {
    habitData = {
      name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '' },
      craving: { linkedPleasure: 'Tomar un té caliente' },
      response: { twoMinVersion: '' }
    };
  }

  return `
    <div class="page habit-form-page" style="padding: 20px 16px 80px 16px; max-width: 540px; margin: 0 auto;">
      <div class="wizard-progress" style="display: flex; align-items: center; justify-content: center; margin-bottom: 24px; gap: 12px;">
        <div class="wizard-step-indicator active" data-step="1" style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: var(--accent-gradient); color: #000;">1</div>
        <div class="wizard-connector" style="flex: 1; max-width: 60px; height: 3px; background: rgba(255,255,255,0.15);"></div>
        <div class="wizard-step-indicator" data-step="2" style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: rgba(255,255,255,0.1); color: var(--text-muted);">2</div>
      </div>
      
      <div id="step-container" class="glass-card form-container" style="padding: 28px 24px; border-radius: 20px; margin-bottom: 20px;">
        ${renderStep1()}
      </div>
      
      <div class="form-actions" style="display: flex; gap: 12px; width: 100%;">
        <button id="btn-back" class="btn-secondary" style="display:none; flex: 1; min-height: 48px; margin: 0; border-radius: 14px;">Atrás</button>
        <button id="btn-next" class="btn-primary" style="flex: 2; min-height: 48px; margin: 0; border-radius: 14px;">Siguiente ➔</button>
      </div>
    </div>
  `;
}

function renderStep1() {
  return `
    <div style="margin-bottom: 20px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">⏰ 1. Horario y Detalles del Hábito</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Ingresá el nombre, horario y la duración de tu nuevo hábito.</p>
    </div>

    <div class="form-group" style="margin-bottom: 18px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: #fff; font-size: 14px;">Nombre del Hábito</label>
      <input type="text" id="habit-name" class="input" value="${habitData.name || ''}" placeholder="Ej. Meditar, Correr, Leer..." style="width:100%; min-height:46px;">
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: #fff; font-size: 14px;">Hora de Inicio</label>
        <input type="time" id="habit-time" class="input" value="${habitData.cue?.time || '08:00'}" style="width:100%; min-height:46px;">
      </div>
      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: #fff; font-size: 14px;">Duración (min)</label>
        <input type="number" id="habit-duration" class="input" value="${habitData.duration || 15}" min="1" max="180" style="width:100%; min-height:46px;">
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: #fff; font-size: 14px;">Lugar (Opcional)</label>
      <input type="text" id="habit-place" class="input" value="${habitData.cue?.place || ''}" placeholder="Ej. En mi escritorio, parque..." style="width:100%; min-height:46px;">
    </div>
  `;
}

function renderStep2() {
  const defaultTwoMin = habitData.response?.twoMinVersion || (habitData.name ? `1 minuto de ${habitData.name}` : '');
  const defaultPleasure = habitData.craving?.linkedPleasure || 'Tomar un rico té caliente';

  return `
    <div style="margin-bottom: 20px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">✨ 2. Hábitos Atómicos (Preparación)</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Diseñá la experiencia para que sea imposible fallar.</p>
    </div>

    <div class="glass-card" style="padding: 16px; border-left: 4px solid #F5C518; margin-bottom: 20px; border-radius: 14px; background: rgba(245, 197, 24, 0.08);">
      <div style="font-weight: 700; font-size: 14px; color: #F5C518; margin-bottom: 6px;">💡 Hacerlo Atractivo & Disfrutable</div>
      <div style="font-size: 13px; color: #eee; line-height: 1.5;">
        Recordá hacer actividades que te gusten durante la realización de tu hábito, como tomar un té. Creá un ritual de motivación previo como servir el té.
      </div>
    </div>

    <div class="glass-card" style="padding: 16px; border-left: 4px solid #4CAF50; margin-bottom: 20px; border-radius: 14px; background: rgba(76, 175, 80, 0.08);">
      <div style="font-weight: 700; font-size: 14px; color: #4CAF50; margin-bottom: 6px;">⚡ La Regla de los 2 Minutos</div>
      <div style="font-size: 13px; color: #eee; line-height: 1.5;">
        Cualquier hábito puede reducirse a una versión de 2 minutos para empezar sin esfuerzo. En lugar de "Leer 30 min", empezá con "Leer una página", y prepará tu ambiente.
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 18px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: #fff; font-size: 14px;">Versión de 2 minutos</label>
      <input type="text" id="habit-twomin" class="input" value="${defaultTwoMin}" placeholder="Ej. Leer 1 página / Ponerte las zapatillas" style="width:100%; min-height:46px;">
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: #fff; font-size: 14px;">Placer vinculado / Ritual previo</label>
      <input type="text" id="habit-pleasure" class="input" value="${defaultPleasure}" placeholder="Ej. Tomar un té mientras lo realizo" style="width:100%; min-height:46px;">
    </div>
  `;
}

function checkAndShowCollisions(newHabit, onConfirmed) {
  const habits = store.getState().habits || [];
  const conflictingHabits = habits.filter(h => h.id !== newHabit.id && checkCollision(newHabit, h));

  if (conflictingHabits.length === 0) {
    onConfirmed(newHabit);
    return;
  }

  // COLLISION DETECTED -> Open Multi-Suggestion Assistant Modal
  const conflict = conflictingHabits[0];
  
  const newStartMin = parseTime(newHabit.cue.time);
  const newEndMin = newStartMin + parseInt(newHabit.duration || 15);
  
  const confStartMin = parseTime(conflict.cue.time);
  const confEndMin = confStartMin + parseInt(conflict.duration || 15);

  // Compute suggestions
  const sugg1NewTime = minutesToTime(Math.max(0, confStartMin - newHabit.duration));
  const sugg2NewTime = minutesToTime(confEndMin);
  const sugg3ConfTime = minutesToTime(Math.max(0, newStartMin - conflict.duration));
  const sugg4ConfTime = minutesToTime(newEndMin);

  document.getElementById('collision-modal')?.remove();

  const modalHtml = `
    <div id="collision-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 520px; padding: 28px; border-radius: 24px; border: 1px solid rgba(244,67,54,0.4); max-height: 88vh; overflow-y: auto;">
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 44px; margin-bottom: 8px;">⚠️</div>
          <h3 style="font-family: 'Playfair Display', serif; font-size: 22px; color: #FF5252; margin: 0 0 6px 0;">Conflicto de Horarios Solapados</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin: 0;">El hábito que querés guardar se solapa con otro hábito en tu agenda.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: rgba(245, 197, 24, 0.1); border: 1px solid rgba(245, 197, 24, 0.3); padding: 14px; border-radius: 14px;">
            <div style="font-size: 11px; font-weight: 700; color: #F5C518; text-transform: uppercase;">Nuevo Hábito</div>
            <div style="font-weight: 700; font-size: 15px; color: #fff; margin-top: 4px;">${newHabit.name || 'Hábito Nuevo'}</div>
            <div style="font-size: 13px; color: #eee; margin-top: 2px;">⏰ ${newHabit.cue.time} - ${getEndTime(newHabit.cue.time, newHabit.duration)}</div>
          </div>

          <div style="background: rgba(244, 67, 54, 0.1); border: 1px solid rgba(244, 67, 54, 0.3); padding: 14px; border-radius: 14px;">
            <div style="font-size: 11px; font-weight: 700; color: #FF5252; text-transform: uppercase;">Hábito Existente</div>
            <div style="font-weight: 700; font-size: 15px; color: #fff; margin-top: 4px;">${conflict.name}</div>
            <div style="font-size: 13px; color: #eee; margin-top: 2px;">⏰ ${conflict.cue.time} - ${getEndTime(conflict.cue.time, conflict.duration)}</div>
          </div>
        </div>

        <h4 style="font-size: 14px; font-family: 'Playfair Display', serif; color: #fff; margin: 0 0 12px 0;">💡 Múltiples Sugerencias de Corrección Automática:</h4>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          <button class="btn-collision-opt" data-opt="1" style="text-align: left; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; transition: background 0.2s;">
            <div style="font-weight: 700; font-size: 13px; color: #F5C518;">👉 Mover "${newHabit.name}" antes</div>
            <div style="font-size: 12px; color: var(--text-muted);">Cambiar horario a ⏰ ${sugg1NewTime} - ${getEndTime(sugg1NewTime, newHabit.duration)}</div>
          </button>

          <button class="btn-collision-opt" data-opt="2" style="text-align: left; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; transition: background 0.2s;">
            <div style="font-weight: 700; font-size: 13px; color: #F5C518;">👉 Mover "${newHabit.name}" después</div>
            <div style="font-size: 12px; color: var(--text-muted);">Cambiar horario a ⏰ ${sugg2NewTime} - ${getEndTime(sugg2NewTime, newHabit.duration)}</div>
          </button>

          <button class="btn-collision-opt" data-opt="3" style="text-align: left; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; transition: background 0.2s;">
            <div style="font-weight: 700; font-size: 13px; color: #4CAF50;">👈 Mover "${conflict.name}" antes</div>
            <div style="font-size: 12px; color: var(--text-muted);">Mover "${conflict.name}" a ⏰ ${sugg3ConfTime}</div>
          </button>

          <button class="btn-collision-opt" data-opt="4" style="text-align: left; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; transition: background 0.2s;">
            <div style="font-weight: 700; font-size: 13px; color: #4CAF50;">👈 Mover "${conflict.name}" después</div>
            <div style="font-size: 12px; color: var(--text-muted);">Mover "${conflict.name}" a ⏰ ${sugg4ConfTime}</div>
          </button>
        </div>

        <div style="display: flex; gap: 12px;">
          <button id="btn-cancel-collision" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #ccc; font-weight: 600; cursor: pointer;">Ajustar Manualmente</button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-cancel-collision')?.addEventListener('click', () => {
    document.getElementById('collision-modal')?.remove();
  });

  document.querySelectorAll('.btn-collision-opt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const opt = e.currentTarget.dataset.opt;
      document.getElementById('collision-modal')?.remove();

      if (opt === '1') {
        newHabit.cue.time = sugg1NewTime;
        await onConfirmed(newHabit);
      } else if (opt === '2') {
        newHabit.cue.time = sugg2NewTime;
        await onConfirmed(newHabit);
      } else if (opt === '3') {
        conflict.cue.time = sugg3ConfTime;
        await store.saveHabit(conflict);
        await onConfirmed(newHabit);
      } else if (opt === '4') {
        conflict.cue.time = sugg4ConfTime;
        await store.saveHabit(conflict);
        await onConfirmed(newHabit);
      }
    });
  });
}

function updateStepIndicators() {
  document.querySelectorAll('.wizard-step-indicator').forEach(el => {
    const step = parseInt(el.dataset.step);
    if (step === currentStep) {
      el.style.background = 'var(--accent-gradient)';
      el.style.color = '#000';
    } else if (step < currentStep) {
      el.style.background = '#4CAF50';
      el.style.color = '#fff';
    } else {
      el.style.background = 'rgba(255,255,255,0.1)';
      el.style.color = 'var(--text-muted)';
    }
  });
}

export function mount() {
  const container = document.getElementById('step-container');
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');

  const saveCurrentStepData = () => {
    if (currentStep === 1) {
      const name = document.getElementById('habit-name')?.value.trim();
      const time = document.getElementById('habit-time')?.value || '08:00';
      const duration = parseInt(document.getElementById('habit-duration')?.value) || 15;
      const place = document.getElementById('habit-place')?.value.trim() || '';

      habitData.name = name;
      habitData.cue = { ...(habitData.cue || {}), time, place };
      habitData.duration = duration;
    } else if (currentStep === 2) {
      const twoMin = document.getElementById('habit-twomin')?.value.trim() || '';
      const pleasure = document.getElementById('habit-pleasure')?.value.trim() || '';

      habitData.response = { ...(habitData.response || {}), twoMinVersion: twoMin };
      habitData.craving = { ...(habitData.craving || {}), linkedPleasure: pleasure };
    }
  };

  btnNext?.addEventListener('click', async () => {
    saveCurrentStepData();

    if (currentStep === 1) {
      if (!habitData.name) {
        showToast('Ingresá el nombre del hábito', 'error');
        return;
      }
      currentStep = 2;
      container.innerHTML = renderStep2();
      btnBack.style.display = 'block';
      btnNext.textContent = 'Guardar Hábito ✓';
      updateStepIndicators();
    } else if (currentStep === 2) {
      // Confirm Habit Save with Collision Assistant
      checkAndShowCollisions(habitData, async (finalHabit) => {
        await store.saveHabit(finalHabit);
        showToast('¡Hábito guardado con éxito! 🎉', 'success');
        navigate('/home');
      });
    }
  });

  btnBack?.addEventListener('click', () => {
    saveCurrentStepData();
    if (currentStep === 2) {
      currentStep = 1;
      container.innerHTML = renderStep1();
      btnBack.style.display = 'none';
      btnNext.textContent = 'Siguiente ➔';
      updateStepIndicators();
    }
  });
}

export function unmount() {
}
