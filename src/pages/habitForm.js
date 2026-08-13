import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { parseTime, formatTime, minutesToTime, getEndTime, checkCollision } from '../utils/time.js';

let currentStep = 1;
let habitData = {};

export function render(props = {}) {
  currentStep = 1;
  const hashId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('id');
  const targetId = props?.id || hashId;

  const defaultFreq = { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };

  if (targetId) {
    const state = store.getState();
    const existing = (state.habits || []).find(h => h.id === targetId);
    if (existing) {
      habitData = JSON.parse(JSON.stringify(existing));
      if (!habitData.frequency) habitData.frequency = defaultFreq;
    } else {
      habitData = {
        name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '' },
        frequency: defaultFreq,
        craving: { linkedPleasure: 'Tomar un té caliente' },
        response: { twoMinVersion: '' }
      };
    }
  } else {
    habitData = {
      name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '' },
      frequency: defaultFreq,
      craving: { linkedPleasure: 'Tomar un té caliente' },
      response: { twoMinVersion: '' }
    };
  }

  return `
    <div class="page habit-form-page" style="padding: 24px 16px 80px 16px; max-width: 540px; margin: 0 auto; box-sizing: border-box;">
      <!-- Monochromatic Progress Bar -->
      <div class="wizard-progress" style="display: flex; align-items: center; justify-content: center; margin-bottom: 28px; gap: 12px;">
        <div class="wizard-step-indicator active" data-step="1" style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; background: var(--accent-primary); color: var(--accent-inverted); font-size: 13px;">1</div>
        <div class="wizard-connector" style="flex: 1; max-width: 60px; height: 2px; background: var(--border-subtle);"></div>
        <div class="wizard-step-indicator" data-step="2" style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; background: var(--bg-subtle); color: var(--text-secondary); font-size: 13px; border: 1px solid var(--border-subtle);">2</div>
      </div>
      
      <div id="step-container" class="glass-card form-container" style="padding: 32px 24px; border-radius: 20px; margin-bottom: 20px;">
        ${renderStep1()}
      </div>
      
      <div class="form-actions" style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
        <div style="display: flex; gap: 12px; width: 100%;">
          <button id="btn-back" class="btn-secondary" style="display:none; flex: 1; min-height: 48px; margin: 0; border-radius: 12px;">Atrás</button>
          <button id="btn-next" class="btn-primary" style="flex: 2; min-height: 48px; margin: 0; border-radius: 12px;">
            Siguiente ${iconSVG('arrowRight', 16)}
          </button>
        </div>
        <button id="btn-cancel" class="btn-secondary" style="width: 100%; min-height: 44px; margin: 0; border-radius: 12px; color: var(--text-secondary); border: 1px solid var(--border-subtle);">
          Cancelar
        </button>
      </div>
    </div>
  `;
}

function renderStep1() {
  const freq = habitData.frequency || { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
  const freqType = freq.type || 'daily';
  const selectedDays = freq.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 4px;">Paso 1 de 2</div>
      <h2 class="editorial-title" style="font-size: 26px; margin: 0 0 6px 0;">Horario y Detalle.</h2>
      <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Ingresá el nombre, la hora, la duración y la frecuencia de tu hábito.</p>
    </div>

    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Nombre del Hábito</label>
      <input type="text" id="habit-name" class="input" value="${habitData.name || ''}" placeholder="Ej. Meditar, Correr, Leer..." style="width:100%; box-sizing: border-box; min-height:46px;">
    </div>

    <!-- Responsive Grid for Time & Duration to prevent mobile overlap -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px;">
      <div class="form-group" style="margin: 0; min-width: 0;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Hora de Inicio</label>
        <input type="time" id="habit-time" class="input" value="${habitData.cue?.time || '08:00'}" style="width:100%; box-sizing: border-box; min-height:46px;">
      </div>
      <div class="form-group" style="margin: 0; min-width: 0;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Duración (minutos)</label>
        <input type="number" id="habit-duration" class="input" value="${habitData.duration || 15}" min="1" max="180" style="width:100%; box-sizing: border-box; min-height:46px;">
      </div>
    </div>

    <!-- Repetition / Frequency Selector Section -->
    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Frecuencia y Repetición</label>
      <div style="display: flex; gap: 10px; margin-bottom: 12px;">
        <button type="button" id="freq-daily-btn" style="flex: 1; min-height: 42px; border-radius: 12px; font-size: 13px; font-weight: 600; border: 1px solid var(--border-subtle); background: ${freqType === 'daily' ? 'var(--text-primary)' : 'var(--bg-primary)'}; color: ${freqType === 'daily' ? 'var(--bg-primary)' : 'var(--text-primary)'}; cursor: pointer;">
          Todos los Días
        </button>
        <button type="button" id="freq-weekly-btn" style="flex: 1; min-height: 42px; border-radius: 12px; font-size: 13px; font-weight: 600; border: 1px solid var(--border-subtle); background: ${freqType === 'weekly' ? 'var(--text-primary)' : 'var(--bg-primary)'}; color: ${freqType === 'weekly' ? 'var(--bg-primary)' : 'var(--text-primary)'}; cursor: pointer;">
          Días Específicos
        </button>
      </div>

      <div id="weekday-pills-container" style="display: ${freqType === 'weekly' ? 'flex' : 'none'}; justify-content: space-between; gap: 6px; flex-wrap: wrap;">
        ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayName, idx) => {
          const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
          const isSelected = selectedDays.includes(dayName);
          return `
            <button type="button" class="day-pill-btn" data-day="${dayName}" style="flex: 1; min-width: 38px; height: 38px; border-radius: 10px; font-size: 12px; font-weight: 700; border: 1px solid var(--border-subtle); background: ${isSelected ? 'var(--text-primary)' : 'var(--bg-subtle)'}; color: ${isSelected ? 'var(--bg-primary)' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              ${dayLabels[idx]}
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Lugar (Opcional)</label>
      <input type="text" id="habit-place" class="input" value="${habitData.cue?.place || ''}" placeholder="Ej. En mi escritorio, parque..." style="width:100%; box-sizing: border-box; min-height:46px;">
    </div>
  `;
}

function renderStep2() {
  const defaultTwoMin = habitData.response?.twoMinVersion || (habitData.name ? `1 minuto de ${habitData.name}` : '');
  const defaultPleasure = habitData.craving?.linkedPleasure || 'Tomar un té caliente';

  return `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 4px;">Paso 2 de 2</div>
      <h2 class="editorial-title" style="font-size: 26px; margin: 0 0 6px 0;">Hábitos Atómicos.</h2>
      <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Diseñá la experiencia para que sea imposible fallar.</p>
    </div>

    <div class="glass-card" style="padding: 18px; border-left: 3px solid var(--text-primary); margin-bottom: 20px; border-radius: 12px; background: var(--bg-primary);">
      <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        ${iconSVG('star', 14)} Hacerlo Atractivo & Disfrutable
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
        Recordá hacer actividades que te gusten durante la realización de tu hábito, como tomar un té. Creá un ritual previo para entrar en foco.
      </div>
    </div>

    <div class="glass-card" style="padding: 18px; border-left: 3px solid var(--text-secondary); margin-bottom: 20px; border-radius: 12px; background: var(--bg-primary);">
      <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        ${iconSVG('target', 14)} La Regla de los 2 Minutos
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
        Cualquier hábito puede reducirse a una versión de 2 minutos para empezar sin esfuerzo. En lugar de "Leer 30 min", empezá con "Leer 1 página".
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Versión de 2 minutos</label>
      <input type="text" id="habit-twomin" class="input" value="${defaultTwoMin}" placeholder="Ej. Leer 1 página / Ponerte las zapatillas" style="width:100%; box-sizing: border-box; min-height:46px;">
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Placer vinculado / Ritual previo</label>
      <input type="text" id="habit-pleasure" class="input" value="${defaultPleasure}" placeholder="Ej. Tomar un té mientras lo realizo" style="width:100%; box-sizing: border-box; min-height:46px;">
    </div>
  `;
}

function bindFrequencyEvents() {
  const dailyBtn = document.getElementById('freq-daily-btn');
  const weeklyBtn = document.getElementById('freq-weekly-btn');
  const container = document.getElementById('weekday-pills-container');

  if (!habitData.frequency) {
    habitData.frequency = { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
  }

  const updateFreqUI = () => {
    const isDaily = habitData.frequency.type === 'daily';
    if (dailyBtn) {
      dailyBtn.style.background = isDaily ? 'var(--text-primary)' : 'var(--bg-primary)';
      dailyBtn.style.color = isDaily ? 'var(--bg-primary)' : 'var(--text-primary)';
    }
    if (weeklyBtn) {
      weeklyBtn.style.background = !isDaily ? 'var(--text-primary)' : 'var(--bg-primary)';
      weeklyBtn.style.color = !isDaily ? 'var(--bg-primary)' : 'var(--text-primary)';
    }
    if (container) {
      container.style.display = !isDaily ? 'flex' : 'none';
    }
  };

  dailyBtn?.addEventListener('click', () => {
    habitData.frequency = { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
    updateFreqUI();
  });

  weeklyBtn?.addEventListener('click', () => {
    habitData.frequency.type = 'weekly';
    if (!habitData.frequency.days || habitData.frequency.days.length === 0) {
      habitData.frequency.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    }
    updateFreqUI();
  });

  document.querySelectorAll('.day-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const day = e.currentTarget.dataset.day;
      let days = habitData.frequency.days || [];
      if (days.includes(day)) {
        if (days.length > 1) {
          days = days.filter(d => d !== day);
        }
      } else {
        days.push(day);
      }
      habitData.frequency.days = days;
      
      const isSelected = days.includes(day);
      e.currentTarget.style.background = isSelected ? 'var(--text-primary)' : 'var(--bg-subtle)';
      e.currentTarget.style.color = isSelected ? 'var(--bg-primary)' : 'var(--text-secondary)';
    });
  });
}

function checkAndShowCollisions(newHabit, onConfirmed) {
  const habits = store.getState().habits || [];
  const conflictingHabits = habits.filter(h => h.id !== newHabit.id && checkCollision(newHabit, h));

  if (conflictingHabits.length === 0) {
    onConfirmed(newHabit);
    return;
  }

  const conflict = conflictingHabits[0];
  const newStartMin = parseTime(newHabit.cue.time);
  const confStartMin = parseTime(conflict.cue.time);
  const confEndMin = confStartMin + parseInt(conflict.duration || 15);
  const newEndMin = newStartMin + parseInt(newHabit.duration || 15);

  const sugg1NewTime = minutesToTime(Math.max(0, confStartMin - newHabit.duration));
  const sugg2NewTime = minutesToTime(confEndMin);
  const sugg3ConfTime = minutesToTime(Math.max(0, newStartMin - conflict.duration));
  const sugg4ConfTime = minutesToTime(newEndMin);

  document.getElementById('collision-modal')?.remove();

  const modalHtml = `
    <div id="collision-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 500px; padding: 28px; border-radius: 20px; border: 1px solid var(--border-subtle); max-height: 88vh; overflow-y: auto; background: var(--bg-surface);">
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
            ${iconSVG('alert', 22)}
          </div>
          <h3 class="editorial-title" style="font-size: 22px; margin: 0 0 6px 0;">Conflicto de Horarios</h3>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">El hábito que deseas guardar se solapa con otro evento existente.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Nuevo Hábito</div>
            <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-top: 4px;">${newHabit.name || 'Hábito Nuevo'}</div>
            <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">⏰ ${newHabit.cue.time} - ${getEndTime(newHabit.cue.time, newHabit.duration)}</div>
          </div>

          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Existente</div>
            <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-top: 4px;">${conflict.name}</div>
            <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">⏰ ${conflict.cue.time} - ${getEndTime(conflict.cue.time, conflict.duration)}</div>
          </div>
        </div>

        <h4 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin: 0 0 12px 0;">Sugerencias de corrección:</h4>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
          <button class="btn-collision-opt" data-opt="1" style="text-align: left; padding: 12px 16px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer; transition: background 0.2s ease;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Mover "${newHabit.name}" antes</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Cambiar a ⏰ ${sugg1NewTime} - ${getEndTime(sugg1NewTime, newHabit.duration)}</div>
          </button>

          <button class="btn-collision-opt" data-opt="2" style="text-align: left; padding: 12px 16px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer; transition: background 0.2s ease;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Mover "${newHabit.name}" después</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Cambiar a ⏰ ${sugg2NewTime} - ${getEndTime(sugg2NewTime, newHabit.duration)}</div>
          </button>

          <button class="btn-collision-opt" data-opt="3" style="text-align: left; padding: 12px 16px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer; transition: background 0.2s ease;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Mover "${conflict.name}" antes</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Mover "${conflict.name}" a ⏰ ${sugg3ConfTime}</div>
          </button>

          <button class="btn-collision-opt" data-opt="4" style="text-align: left; padding: 12px 16px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer; transition: background 0.2s ease;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Mover "${conflict.name}" después</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Mover "${conflict.name}" a ⏰ ${sugg4ConfTime}</div>
          </button>
        </div>

        <button id="btn-cancel-collision" class="btn-secondary" style="width: 100%;">Ajustar Manualmente</button>

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
      el.style.background = 'var(--accent-primary)';
      el.style.color = 'var(--accent-inverted)';
    } else if (step < currentStep) {
      el.style.background = 'var(--bg-subtle)';
      el.style.color = 'var(--text-primary)';
    } else {
      el.style.background = 'var(--bg-subtle)';
      el.style.color = 'var(--text-secondary)';
    }
  });
}

export function mount() {
  const container = document.getElementById('step-container');
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');

  bindFrequencyEvents();

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
      btnNext.innerHTML = `Guardar Hábito ${iconSVG('check', 16)}`;
      updateStepIndicators();
    } else if (currentStep === 2) {
      checkAndShowCollisions(habitData, async (finalHabit) => {
        await store.saveHabit(finalHabit);
        showToast('¡Hábito guardado con éxito!', 'success');
        navigate('/home');
      });
    }
  });

  btnBack?.addEventListener('click', () => {
    saveCurrentStepData();
    if (currentStep === 2) {
      currentStep = 1;
      container.innerHTML = renderStep1();
      bindFrequencyEvents();
      btnBack.style.display = 'none';
      btnNext.innerHTML = `Siguiente ${iconSVG('arrowRight', 16)}`;
      updateStepIndicators();
    }
  });

  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    navigate('/home');
  });
}

export function unmount() {
}
