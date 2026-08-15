import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { parseTime, formatTime, minutesToTime, getEndTime, checkCollision } from '../utils/time.js';

let currentStep = 1;
let habitData = {};
let formReturnPath = '/home';

export function render(props = {}) {
  currentStep = 1;
  const hashStr = window.location.hash || '';
  const hashParams = new URLSearchParams(hashStr.split('?')[1] || '');
  const hashId = hashParams.get('id');
  const fromParam = props?.from || hashParams.get('from');
  
  if (fromParam === 'routine' || hashStr.includes('from=routine')) {
    formReturnPath = '/routine';
  } else {
    formReturnPath = '/home';
  }

  const targetId = props?.id || hashId;

  const defaultFreq = { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
  const defaultRepetition = { enabled: false, time: '18:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };

  if (targetId) {
    const state = store.getState();
    const existing = (state.habits || []).find(h => h.id === targetId);
    if (existing) {
      habitData = JSON.parse(JSON.stringify(existing));
      if (!habitData.frequency) habitData.frequency = defaultFreq;
      if (!habitData.repetition) habitData.repetition = defaultRepetition;
    } else {
      habitData = {
        name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '' },
        frequency: defaultFreq,
        repetition: defaultRepetition,
        craving: { linkedPleasure: '' },
        response: { twoMinVersion: '' },
        stackedAfterId: ''
      };
    }
  } else {
    habitData = {
      name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '' },
      frequency: defaultFreq,
      repetition: defaultRepetition,
      craving: { linkedPleasure: '' },
      response: { twoMinVersion: '' },
      stackedAfterId: ''
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

function renderRepetitionInputs() {
  const count = habitData.repetition?.count || 1;
  const reps = habitData.repetitions || [];
  
  let html = '';
  for (let i = 0; i < count; i++) {
    const rep = reps[i] || { name: '', time: '18:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
    const nameVal = rep.name || '';
    const timeVal = rep.time || '18:00';
    const repDays = rep.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    html += `
      <div class="repetition-item-box" data-index="${i}" style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 8px;">
        <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
          Repetición #${i + 1}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
          <span style="font-size: 12.5px; font-weight: 600; color: var(--text-secondary); width: 90px;">Etiqueta (opc)</span>
          <input type="text" class="input habit-rep-name" data-index="${i}" value="${nameVal}" placeholder="Ej. Tarde, Noche..." style="flex: 1; min-height: 36px; font-size: 13px;">
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
          <span style="font-size: 12.5px; font-weight: 600; color: var(--text-secondary); width: 90px;">Hora</span>
          <input type="time" class="input habit-rep-time" data-index="${i}" value="${timeVal}" style="flex: 1; min-height: 36px; text-align: center; font-size: 13.5px;">
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Días que se repite:</div>
          <div class="repetition-weekday-pills" data-index="${i}" style="display: flex; justify-content: space-between; gap: 4px; flex-wrap: wrap;">
            ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayName, idx) => {
              const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
              const isSelected = repDays.includes(dayName);
              return `
                <button type="button" class="rep-item-day-pill-btn" data-rep-index="${i}" data-day="${dayName}" style="flex: 1; min-width: 28px; height: 28px; border-radius: 6px; font-size: 10px; font-weight: 700; border: 1px solid var(--border-subtle); background: ${isSelected ? 'var(--text-primary)' : 'var(--bg-subtle)'}; color: ${isSelected ? 'var(--bg-primary)' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                  ${dayLabels[idx]}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
  return html;
}

function renderStep1() {
  const freq = habitData.frequency || { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
  const freqType = freq.type || 'daily';
  const selectedDays = freq.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const existingHabits = (store.getState().habits || []).filter(h => h.id !== habitData.id);

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

    <!-- Time & Duration Form Groups (Strictly bounded for iOS Safari) -->
    <div class="form-group" style="margin-bottom: 20px; width: 100%; max-width: 100%; box-sizing: border-box;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Hora de Inicio</label>
      <div style="width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; border-radius: 10px;">
         <input type="time" id="habit-time" class="input" value="${habitData.cue?.time || '08:00'}" style="width: 100%; max-width: 100%; box-sizing: border-box; min-height: 46px; font-size: 16px; text-align: center; display: block; ${!habitData.cue?.time ? 'text-decoration: line-through; opacity: 0.4; pointer-events: none;' : ''}" ${!habitData.cue?.time ? 'disabled' : ''}>
      </div>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
        <label style="font-weight: 600; font-size: 13px; color: var(--text-primary); cursor: pointer;"><input type="checkbox" id="habit-no-schedule" ${habitData.cue?.time ? '' : 'checked'}> Sin horario</label>
        <label style="font-weight: 600; font-size: 13px; color: var(--text-primary); cursor: pointer;"><input type="checkbox" id="habit-custom-per-day" ${habitData.cue?.timePerDay ? 'checked' : ''}> Horario distinto por día</label>
      </div>

      <div id="per-day-times-container" style="display: ${habitData.cue?.timePerDay ? 'flex' : 'none'}; flex-direction: column; gap: 8px; margin-top: 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">Horario por día:</div>
        ${[
          { key: 'mon', label: 'Lunes' },
          { key: 'tue', label: 'Martes' },
          { key: 'wed', label: 'Miércoles' },
          { key: 'thu', label: 'Jueves' },
          { key: 'fri', label: 'Viernes' },
          { key: 'sat', label: 'Sábado' },
          { key: 'sun', label: 'Domingo' }
        ].map(d => `
          <div class="day-time-row" data-day="${d.key}" style="display: ${freqType === 'daily' || selectedDays.includes(d.key) ? 'flex' : 'none'}; align-items: center; justify-content: space-between; gap: 10px;">
            <span style="font-size: 13px; font-weight: 600; color: var(--text-primary); width: 80px;">${d.label}</span>
            <input type="time" class="input habit-time-per-day" data-day="${d.key}" value="${habitData.cue?.timePerDay?.[d.key] || habitData.cue?.time || '08:00'}" style="flex: 1; min-height: 38px; text-align: center; font-size: 14px;">
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 8px;">
        <label style="font-weight: 600; font-size: 13px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <input type="checkbox" id="habit-repetition-enabled" ${habitData.repetition?.enabled ? 'checked' : ''}> 
          Repetir hábito más de una vez en el día
        </label>
      </div>

      <div id="repetition-settings-container" style="display: ${habitData.repetition?.enabled ? 'flex' : 'none'}; flex-direction: column; gap: 12px; margin-top: 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">Configuración de la Repetición:</div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary); width: 140px;">Repeticiones (1-10)</span>
          <select id="habit-repetition-count" class="input" style="flex: 1; min-height: 38px; text-align: center; font-size: 14px; padding: 0 8px;">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
              <option value="${n}" ${ (habitData.repetition?.count || 1) === n ? 'selected' : '' }>${n}</option>
            `).join('')}
          </select>
        </div>

        <div id="repetition-list-container" style="display: flex; flex-direction: column; gap: 8px;">
          ${renderRepetitionInputs()}
        </div>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 20px; width: 100%; max-width: 100%; box-sizing: border-box;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Duración (minutos)</label>
      <input type="number" id="habit-duration" class="input" value="${habitData.duration || 15}" min="1" max="180" style="width: 100%; max-width: 100%; box-sizing: border-box; min-height: 46px; ${habitData.noDuration || habitData.duration === 0 ? 'text-decoration: line-through; opacity: 0.4; pointer-events: none;' : ''}" ${habitData.noDuration || habitData.duration === 0 ? 'disabled' : ''}>
      <div style="margin-top: 8px;">
        <label style="font-weight: 600; font-size: 13px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <input type="checkbox" id="habit-no-duration" ${habitData.noDuration || habitData.duration === 0 ? 'checked' : ''}> Sin duración (opcional)
        </label>
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

    <!-- Habit Stacking Dropdown -->
    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Acumular con otro hábito (Habit Stacking)</label>
      <select id="habit-stacked-after" class="input" style="width: 100%; min-height: 46px;">
        <option value="">Ninguno (Hábito independiente)</option>
        ${existingHabits.map(h => `<option value="${h.id}" ${habitData.stackedAfterId === h.id ? 'selected' : ''}>Acumular después de: "${h.name}"</option>`).join('')}
      </select>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">
        Principio de James Clear: "Después de [hábito actual], haré [nuevo hábito]".
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Lugar (Opcional)</label>
      <input type="text" id="habit-place" class="input" value="${habitData.cue?.place || ''}" placeholder="Ej. En mi escritorio, parque..." style="width:100%; box-sizing: border-box; min-height:46px;">
    </div>

    <!-- Habit Privacy Toggle -->
    <div class="form-group" style="margin-bottom: 12px; background: var(--bg-subtle); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-subtle);">
      <label style="font-weight: 600; font-size: 13.5px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 6px;">${iconSVG('lock', 16)} Hábito Privado <span style="font-size: 12px; color: var(--text-secondary); font-weight: 400;">(Esconder a Amigos)</span></span>
        <input type="checkbox" id="habit-is-private" ${habitData.isPrivate ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
      </label>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
        Este hábito no será visible para tus amigos en su lista de hábitos ni cadenas.
      </div>
    </div>
  `;
}

function renderStep2() {
  const defaultTwoMin = habitData.response?.twoMinVersion || (habitData.name ? `1 minuto de ${habitData.name}` : '');
  const defaultPleasure = habitData.craving?.linkedPleasure || '';

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
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 13.5px;">Placer vinculado / Ritual previo (Opcional)</label>
      <input type="text" id="habit-pleasure" class="input" value="${defaultPleasure}" placeholder="Ej. Tomar un té mientras lo realizo (opcional)" style="width:100%; box-sizing: border-box; min-height:46px;">
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

    const days = habitData.frequency.days || [];
    document.querySelectorAll('.day-time-row').forEach(row => {
      const day = row.dataset.day;
      row.style.display = (isDaily || days.includes(day)) ? 'flex' : 'none';
    });
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

      const row = document.querySelector(`.day-time-row[data-day="${day}"]`);
      if (row) {
        row.style.display = isSelected ? 'flex' : 'none';
      }
    });
  });
}

function checkAndShowCollisions(newHabit, onConfirmed) {
  const collision = findCollidingHabit(newHabit);
  if (collision) {
    if (collision.conflict === newHabit) {
      showToast(`Conflicto: la repetición colisiona con ${collision.detail}.`, 'error');
    } else {
      showToast(`Conflicto de horario: se superpone con ${collision.detail}.`, 'error');
    }
    return;
  }
  onConfirmed(newHabit);
}

function daysOverlap(arr1, arr2) {
  return arr1.some(x => arr2.includes(x));
}

function findCollidingHabit(newHabit) {
  const habits = store.getState().habits || [];
  
  const getMainDays = (h) => {
    if (!h.frequency) return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    if (h.frequency.type === 'daily') return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return h.frequency.days || [];
  };

  const getRepList = (h) => {
    if (!h.repetition?.enabled) return [];
    return h.repetitions || [];
  };

  const newMainDays = getMainDays(newHabit);
  const newReps = getRepList(newHabit);

  // 1. Check main occurrence of newHabit against other habits
  if (newHabit.cue?.time) {
    const mainEvent = { startTime: newHabit.cue.time, duration: newHabit.duration };
    for (const h of habits) {
      if (h.id === newHabit.id) continue;
      
      const otherMainDays = getMainDays(h);
      const otherReps = getRepList(h);

      // Check against other's main
      if (h.cue?.time && daysOverlap(newMainDays, otherMainDays)) {
        const otherMain = { startTime: h.cue.time, duration: h.duration };
        if (checkCollision(mainEvent, otherMain).collides) {
          return { conflict: h, detail: `el horario principal de "${h.name}"` };
        }
      }
      // Check against other's repetitions
      for (let j = 0; j < otherReps.length; j++) {
        const otherRep = otherReps[j];
        if (otherRep.time && daysOverlap(newMainDays, otherRep.days || [])) {
          const otherRepEvent = { startTime: otherRep.time, duration: h.duration };
          if (checkCollision(mainEvent, otherRepEvent).collides) {
            return { conflict: h, detail: `la repetición #${j+1} de "${h.name}"` };
          }
        }
      }
    }
  }

  // 2. Check repetitions of newHabit
  for (let i = 0; i < newReps.length; i++) {
    const rep = newReps[i];
    if (!rep.time) continue;
    const repEvent = { startTime: rep.time, duration: newHabit.duration };
    const repDays = rep.days || [];

    // Check against newHabit's own main
    if (newHabit.cue?.time && daysOverlap(repDays, newMainDays)) {
      const mainEvent = { startTime: newHabit.cue.time, duration: newHabit.duration };
      if (checkCollision(repEvent, mainEvent).collides) {
        return { conflict: newHabit, detail: `el horario principal de este mismo hábito` };
      }
    }

    // Check against newHabit's own other repetitions
    for (let j = 0; j < newReps.length; j++) {
      if (i === j) continue;
      const otherRep = newReps[j];
      if (otherRep.time && daysOverlap(repDays, otherRep.days || [])) {
        const otherRepEvent = { startTime: otherRep.time, duration: newHabit.duration };
        if (checkCollision(repEvent, otherRepEvent).collides) {
          return { conflict: newHabit, detail: `la repetición #${j+1} de este mismo hábito` };
        }
      }
    }

    // Check against other habits
    for (const h of habits) {
      if (h.id === newHabit.id) continue;
      
      const otherMainDays = getMainDays(h);
      const otherReps = getRepList(h);

      // Check against other's main
      if (h.cue?.time && daysOverlap(repDays, otherMainDays)) {
        const otherMain = { startTime: h.cue.time, duration: h.duration };
        if (checkCollision(repEvent, otherMain).collides) {
          return { conflict: h, detail: `el horario principal de "${h.name}"` };
        }
      }
      // Check against other's repetitions
      for (let j = 0; j < otherReps.length; j++) {
        const otherRep = otherReps[j];
        if (otherRep.time && daysOverlap(repDays, otherRep.days || [])) {
          const otherRepEvent = { startTime: otherRep.time, duration: h.duration };
          if (checkCollision(repEvent, otherRepEvent).collides) {
            return { conflict: h, detail: `la repetición #${j+1} de "${h.name}"` };
          }
        }
      }
    }
  }

  return null;
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

function saveRepetitionsFromUI() {
  const countSelect = document.getElementById('habit-repetition-count');
  if (!countSelect) return;
  const count = parseInt(countSelect.value, 10);
  const reps = [];
  
  for (let i = 0; i < count; i++) {
    const nameInput = document.querySelector(`.habit-rep-name[data-index="${i}"]`);
    const timeInput = document.querySelector(`.habit-rep-time[data-index="${i}"]`);
    const name = nameInput ? nameInput.value.trim() : '';
    const time = timeInput ? timeInput.value : '18:00';
    
    // Get active days for this repetition item
    const days = [];
    document.querySelectorAll(`.rep-item-day-pill-btn[data-rep-index="${i}"]`).forEach(btn => {
      // check color / styles
      const isSelected = btn.style.background === 'var(--text-primary)';
      if (isSelected) {
        days.push(btn.dataset.day);
      }
    });
    
    reps.push({ name, time, days });
  }
  
  habitData.repetitions = reps;
}

function bindRepetitionItemEvents() {
  document.querySelectorAll('.habit-rep-name, .habit-rep-time').forEach(inp => {
    inp.addEventListener('input', () => {
      saveRepetitionsFromUI();
    });
  });

  document.querySelectorAll('.rep-item-day-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const repIndex = parseInt(e.currentTarget.dataset.repIndex, 10);
      const day = e.currentTarget.dataset.day;
      
      // Get current selection style
      const isSelected = e.currentTarget.style.background === 'var(--text-primary)';
      e.currentTarget.style.background = isSelected ? 'var(--bg-subtle)' : 'var(--text-primary)';
      e.currentTarget.style.color = isSelected ? 'var(--text-secondary)' : 'var(--bg-primary)';
      
      saveRepetitionsFromUI();
    });
  });
}

export function mount() {
  const container = document.getElementById('step-container');
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');

  bindFrequencyEvents();

  const handleNoScheduleToggle = () => {
    const checkbox = document.getElementById('habit-no-schedule');
    const timeInput = document.getElementById('habit-time');
    const customPerDay = document.getElementById('habit-custom-per-day');
    const repetitionEnabled = document.getElementById('habit-repetition-enabled');
    const perDayContainer = document.getElementById('per-day-times-container');
    const repContainer = document.getElementById('repetition-settings-container');

    if (checkbox) {
      const isNoSchedule = checkbox.checked;
      
      if (timeInput) {
        timeInput.disabled = isNoSchedule;
        timeInput.style.textDecoration = isNoSchedule ? 'line-through' : 'none';
        timeInput.style.opacity = isNoSchedule ? '0.4' : '1';
        timeInput.style.pointerEvents = isNoSchedule ? 'none' : 'auto';
      }
      
      if (customPerDay) {
        customPerDay.disabled = isNoSchedule;
        if (isNoSchedule) {
          customPerDay.checked = false;
          if (perDayContainer) perDayContainer.style.display = 'none';
        }
      }
      
      if (repetitionEnabled) {
        repetitionEnabled.disabled = isNoSchedule;
        if (isNoSchedule) {
          repetitionEnabled.checked = false;
          if (repContainer) repContainer.style.display = 'none';
        }
      }
    }
  };

  const handleNoDurationToggle = () => {
    const durationInput = document.getElementById('habit-duration');
    const checkbox = document.getElementById('habit-no-duration');
    if (checkbox && durationInput) {
      const isNoDuration = checkbox.checked;
      durationInput.disabled = isNoDuration;
      durationInput.style.textDecoration = isNoDuration ? 'line-through' : 'none';
      durationInput.style.opacity = isNoDuration ? '0.4' : '1';
      durationInput.style.pointerEvents = isNoDuration ? 'none' : 'auto';
    }
  };

  const scheduleCheckbox = document.getElementById('habit-no-schedule');
  scheduleCheckbox?.addEventListener('change', handleNoScheduleToggle);

  const durationCheckbox = document.getElementById('habit-no-duration');
  durationCheckbox?.addEventListener('change', handleNoDurationToggle);

  // Call initially to enforce disabled states on load
  handleNoScheduleToggle();
  handleNoDurationToggle();

  const customPerDayCheckbox = document.getElementById('habit-custom-per-day');
  const perDayContainer = document.getElementById('per-day-times-container');
  customPerDayCheckbox?.addEventListener('change', () => {
    if (perDayContainer) {
      perDayContainer.style.display = customPerDayCheckbox.checked ? 'flex' : 'none';
    }
  });

  const repCheckbox = document.getElementById('habit-repetition-enabled');
  const repContainer = document.getElementById('repetition-settings-container');
  repCheckbox?.addEventListener('change', () => {
    if (repContainer) {
      repContainer.style.display = repCheckbox.checked ? 'flex' : 'none';
    }
  });

  // Repetition Count Dropdown change
  const countSelect = document.getElementById('habit-repetition-count');
  countSelect?.addEventListener('change', () => {
    const newCount = parseInt(countSelect.value, 10);
    saveRepetitionsFromUI();
    
    if (!habitData.repetition) habitData.repetition = {};
    habitData.repetition.count = newCount;
    
    const repList = document.getElementById('repetition-list-container');
    if (repList) {
      repList.innerHTML = renderRepetitionInputs();
      bindRepetitionItemEvents();
    }
  });

  // Bind initial repetition item event listeners
  bindRepetitionItemEvents();

  const saveCurrentStepData = () => {
    if (currentStep === 1) {
      const name = document.getElementById('habit-name')?.value.trim();
      const noSchedule = document.getElementById('habit-no-schedule')?.checked;
      const noDuration = document.getElementById('habit-no-duration')?.checked;
      const customPerDay = document.getElementById('habit-custom-per-day')?.checked;
      const time = noSchedule ? null : (document.getElementById('habit-time')?.value || '08:00');
      const duration = noDuration ? 0 : (parseInt(document.getElementById('habit-duration')?.value) || 15);
      const place = document.getElementById('habit-place')?.value.trim() || '';

      let timePerDay = null;
      if (!noSchedule && customPerDay) {
        timePerDay = {};
        document.querySelectorAll('.habit-time-per-day').forEach(inp => {
          const day = inp.dataset.day;
          timePerDay[day] = inp.value || time || '08:00';
        });
      }

      const repEnabled = !!document.getElementById('habit-repetition-enabled')?.checked;
      const repCount = parseInt(document.getElementById('habit-repetition-count')?.value || 1, 10);
      
      saveRepetitionsFromUI();

      const stackedAfterId = document.getElementById('habit-stacked-after')?.value || '';
      const isPrivate = !!document.getElementById('habit-is-private')?.checked;

      habitData.name = name;
      habitData.cue = { ...(habitData.cue || {}), time, timePerDay, place };
      habitData.noDuration = noDuration;
      habitData.duration = duration;
      habitData.repetition = { enabled: repEnabled, count: repCount };
      habitData.stackedAfterId = stackedAfterId;
      habitData.isPrivate = isPrivate;
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
        navigate(formReturnPath);
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
    navigate(formReturnPath);
  });
}

export function unmount() {
}
