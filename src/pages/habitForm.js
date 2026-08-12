import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { parseTime, formatTime, minutesToTime, getEndTime, checkCollision } from '../utils/time.js';

let currentStep = 1;
let habitData = {};

export function render(props) {
  currentStep = 1;
  const isEdit = !!props?.id;
  if (isEdit) {
    const state = store.getState();
    habitData = JSON.parse(JSON.stringify(state.habits.find(h => h.id === props.id) || {}));
  } else {
    habitData = {
      name: '', icon: '🎯', duration: 15, cue: { time: '08:00', place: '', stackAfter: 'none' },
      craving: { linkedPleasure: '', motivationRitual: '' },
      response: { twoMinVersion: '', environmentTip: '' },
      reward: { tracking: true, partnerName: '', partnerPhone: '', contract: '' }
    };
  }

  return `
    <div class="page habit-form-page" style="padding: 20px 16px 80px 16px; max-width: 580px; margin: 0 auto;">
      <div class="wizard-progress" style="display: flex; align-items: center; justify-content: center; margin-bottom: 28px;">
        <div class="wizard-step-indicator active" data-step="1">1</div>
        <div class="wizard-connector"></div>
        <div class="wizard-step-indicator" data-step="2">2</div>
        <div class="wizard-connector"></div>
        <div class="wizard-step-indicator" data-step="3">3</div>
        <div class="wizard-connector"></div>
        <div class="wizard-step-indicator" data-step="4">4</div>
        <div class="wizard-connector"></div>
        <div class="wizard-step-indicator" data-step="5">5</div>
      </div>
      
      <div id="step-container" class="glass-card form-container" style="padding: 32px 24px; border-radius: 20px; margin-bottom: 24px;">
        ${renderStep1()}
      </div>
      
      <div class="form-actions" style="display: flex; gap: 12px; width: 100%;">
        <button id="btn-back" class="btn-secondary" style="display:none; flex: 1; min-height: 48px; margin: 0; border-radius: 14px;">Atrás</button>
        <button id="btn-next" class="btn-primary" style="flex: 2; min-height: 48px; margin: 0; border-radius: 14px;">Siguiente</button>
      </div>
    </div>
  `;
}

function renderStep1() {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">🔔 1. Hacerlo Obvio (Señal)</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Definí el hábito que querés incorporar a tu rutina.</p>
    </div>

    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">¿Qué hábito querés construir?</label>
      <input type="text" id="habit-name" class="input" value="${habitData.name || ''}" placeholder="Ej. Meditar, Correr, Leer..." style="width:100%; min-height:48px;">
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">¿A qué hora?</label>
        <input type="time" id="habit-time" class="input" value="${habitData.cue?.time || '08:00'}" style="width:100%; min-height:48px;">
      </div>
      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Duración (min)</label>
        <input type="number" id="habit-duration" class="input" value="${habitData.duration || 15}" min="1" max="180" style="width:100%; min-height:48px;">
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">¿En qué lugar?</label>
      <input type="text" id="habit-place" class="input" value="${habitData.cue?.place || ''}" placeholder="Ej. En mi habitación, en el parque..." style="width:100%; min-height:48px;">
    </div>
  `;
}

function renderStep2() {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">✨ 2. Hacerlo Atractivo (Anhelo)</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Vinculá el hábito con algo que ya disfrutás para generar entusiasmo.</p>
    </div>

    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">¿Qué actividad te gusta hacer?</label>
      <input type="text" id="habit-pleasure" class="input" value="${habitData.craving?.linkedPleasure || ''}" placeholder="Ej. Escuchar mi podcast favorito, tomar un buen café..." style="width:100%; min-height:48px;">
      <p class="form-hint" style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Mientras hacés "${habitData.name || 'tu hábito'}", vas a disfrutar de esto.</p>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Ritual de motivación previo</label>
      <input type="text" id="habit-ritual" class="input" value="${habitData.craving?.motivationRitual || ''}" placeholder="Ej. Ponerme la ropa deportiva, servir una taza de té..." style="width:100%; min-height:48px;">
      <p class="form-hint" style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Una pequeña acción antes de empezar para ponerte en sintonía.</p>
    </div>
  `;
}

function renderStep3() {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">🎯 3. Hacerlo Sencillo (Respuesta)</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Reducí la fricción inicial para que sea imposible decir que no.</p>
    </div>

    <div class="explanation-card glass-card" style="padding: 16px; border-left: 3px solid #F5C518; margin-bottom: 20px; border-radius: 12px; background: rgba(245, 197, 24, 0.05);">
      <div style="font-weight: 700; font-size: 14px; color: #F5C518; margin-bottom: 4px;">💡 La Regla de los 2 Minutos</div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">Cualquier hábito puede reducirse a una versión de 2 minutos para empezar sin esfuerzo. En lugar de "Leer 30 min", empezá con "Leer una página".</div>
    </div>

    <div class="form-group" style="margin-bottom: 20px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Versión de 2 minutos</label>
      <input type="text" id="habit-twomin" class="input" value="${habitData.response?.twoMinVersion || ''}" placeholder="Ej. Ponerme las zapatillas / Leer 1 página" style="width:100%; min-height:48px;">
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Preparación del ambiente</label>
      <input type="text" id="habit-env" class="input" value="${habitData.response?.environmentTip || ''}" placeholder="Ej. Dejar el libro en la mesa de noche la noche anterior" style="width:100%; min-height:48px;">
    </div>
  `;
}

function renderStep4() {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">🏆 4. Hacerlo Satisfactorio (Recompensa)</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Celebrá cada repetición y reforzá tu compromiso.</p>
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
      <label class="form-label" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
        <input type="checkbox" id="habit-tracking" ${habitData.reward?.tracking !== false ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #F5C518;">
        <span style="font-weight: 600; color: var(--text-primary);">Activar seguimiento de racha diario</span>
      </label>
    </div>

    <div style="border-top: 1px solid var(--border-subtle); padding-top: 20px; margin-top: 20px;">
      <h4 style="font-size: 15px; margin: 0 0 12px 0; color: #fff;">Socio Corresponsable (Opcional)</h4>
      
      <div class="form-group" style="margin-bottom: 12px;">
        <input type="text" id="habit-partner-name" class="input" value="${habitData.reward?.partnerName || ''}" placeholder="Nombre del socio (amigo, pareja...)" style="width:100%; min-height:48px;">
      </div>
      
      <div class="form-group" style="margin-bottom: 16px;">
        <input type="tel" id="habit-partner-phone" class="input" value="${habitData.reward?.partnerPhone || ''}" placeholder="WhatsApp (ej. +54911...)" style="width:100%; min-height:48px;">
      </div>

      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Consecuencia / Compromiso</label>
        <input type="text" id="habit-contract" class="input" value="${habitData.reward?.contract || ''}" placeholder="Ej. Invito a cenar a mi socio si rompo la racha" style="width:100%; min-height:48px;">
      </div>
    </div>
  `;
}

function renderStep5() {
  const newTime = habitData.cue?.time || '08:00';
  const newDuration = habitData.duration || 15;
  const newEnd = getEndTime(newTime, newDuration);
  
  const habits = store.getState().habits || [];
  const existingHabits = habits.filter(h => h.id !== habitData.id);
  
  const newSlot = { startTime: newTime, duration: newDuration };
  const collidingHabits = existingHabits.filter(h => {
    const slot = { startTime: h.cue?.time || '08:00', duration: h.duration || 15 };
    return checkCollision(newSlot, slot).collides;
  });

  if (collidingHabits.length === 0) {
    return `
      <div style="margin-bottom: 24px;">
        <div style="display: inline-block; font-size: 12px; font-weight: 700; color: #4CAF50; background: rgba(76,175,80,0.15); padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
          ✓ Horario Libre & Verificado
        </div>
        <h2 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0 0 6px 0; color: #fff;">🚀 5. Confirmación Final</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Todo está listo y sin superposiciones de horario.</p>
      </div>

      <div class="glass-card" style="padding: 20px; border-radius: 16px; border: 1px solid rgba(245,197,24,0.3); margin-bottom: 20px; background: rgba(245, 197, 24, 0.05);">
        <div style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">${habitData.name || 'Nuevo Hábito'}</div>
        <div style="font-size: 14px; color: #F5C518; margin-bottom: 6px; font-weight: 600;">⏰ Horario: ${newTime} - ${newEnd} (${newDuration} min)</div>
        ${habitData.cue?.place ? `<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">📍 Lugar: ${habitData.cue.place}</div>` : ''}
        ${habitData.response?.twoMinVersion ? `<div style="font-size: 13px; color: var(--text-muted); font-style: italic;">⚡ Versión 2 min: "${habitData.response.twoMinVersion}"</div>` : ''}
      </div>

      <div style="font-size: 13px; color: var(--text-muted); text-align: center;">
        Presioná "Finalizar" para guardar e incorporar este hábito a tu rutina diaria.
      </div>
    `;
  }

  // COLLISION DETECTED
  const firstCol = collidingHabits[0];
  const colTime = firstCol.cue?.time || '08:00';
  const colDur = firstCol.duration || 15;
  const colEnd = getEndTime(colTime, colDur);

  // Suggestion 1: Move after conflicting habit
  const suggTime1 = colEnd;
  const suggEnd1 = getEndTime(suggTime1, newDuration);

  // Suggestion 2: Move before conflicting habit
  const colStartMin = parseTime(colTime).totalMinutes;
  const suggMin2 = Math.max(0, colStartMin - newDuration);
  const suggTime2 = minutesToTime(suggMin2);
  const suggEnd2 = getEndTime(suggTime2, newDuration);

  return `
    <div style="margin-bottom: 20px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: #FF5252; background: rgba(244,67,54,0.15); padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
        ⚠️ Conflicto de Horarios Solapados
      </div>
      <h2 style="font-family: 'Playfair Display', serif; font-size: 22px; margin: 0 0 6px 0; color: #fff;">⚡ 5. Resolver Superposición</h2>
      <p style="color: var(--text-muted); font-size: 13px; margin: 0;">Los horarios de estos dos hábitos se chocan. Corregilo antes de guardar.</p>
    </div>

    <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
      <div class="glass-card" style="padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(244,67,54,0.4); background: rgba(244,67,54,0.08);">
        <div style="font-size: 11px; font-weight: 700; color: #FF5252; text-transform: uppercase; margin-bottom: 2px;">🆕 Nuevo Hábito</div>
        <div style="font-weight: 700; color: #fff; font-size: 15px;">${habitData.name || 'Nuevo Hábito'}</div>
        <div style="font-size: 13px; color: #F5C518; margin-top: 2px; font-weight: 600;">⏰ ${newTime} - ${newEnd} (${newDuration} min)</div>
      </div>

      <div class="glass-card" style="padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04);">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;">📌 Hábito Existente Solapado</div>
        <div style="font-weight: 700; color: #fff; font-size: 15px;">${firstCol.name}</div>
        <div style="font-size: 13px; color: #F5C518; margin-top: 2px; font-weight: 600;">⏰ ${colTime} - ${colEnd} (${colDur} min)</div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <div style="font-weight: 700; font-size: 13px; color: #F5C518; margin-bottom: 10px;">💡 Sugerencias Automáticas de Horario:</div>
      
      <button type="button" class="btn-sugg btn-secondary" data-time="${suggTime1}" style="width:100%; text-align:left; padding: 12px 14px; margin-bottom: 8px; border-radius: 12px; font-size: 13px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: space-between;">
        <span>👉 Mover después de "${firstCol.name}"</span>
        <strong style="color: #F5C518;">${suggTime1} - ${suggEnd1}</strong>
      </button>

      <button type="button" class="btn-sugg btn-secondary" data-time="${suggTime2}" style="width:100%; text-align:left; padding: 12px 14px; margin-bottom: 8px; border-radius: 12px; font-size: 13px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: space-between;">
        <span>👈 Mover antes de "${firstCol.name}"</span>
        <strong style="color: #F5C518;">${suggTime2} - ${suggEnd2}</strong>
      </button>
    </div>

    <div class="form-group" style="margin: 0;">
      <label class="form-label" style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 13px;">O elegí un horario manual:</label>
      <input type="time" id="step5-adjust-time" class="input" value="${newTime}" style="width:100%; min-height:44px;">
    </div>
  `;
}

function saveCurrentStep() {
  if (currentStep === 1) {
    habitData.name = document.getElementById('habit-name')?.value || habitData.name;
    habitData.cue.time = document.getElementById('habit-time')?.value || habitData.cue.time;
    habitData.duration = parseInt(document.getElementById('habit-duration')?.value) || habitData.duration;
    habitData.cue.place = document.getElementById('habit-place')?.value || habitData.cue.place;
    habitData.cue.stackAfter = 'none';
  } else if (currentStep === 2) {
    habitData.craving.linkedPleasure = document.getElementById('habit-pleasure')?.value || habitData.craving.linkedPleasure;
    habitData.craving.motivationRitual = document.getElementById('habit-ritual')?.value || habitData.craving.motivationRitual;
  } else if (currentStep === 3) {
    habitData.response.twoMinVersion = document.getElementById('habit-twomin')?.value || habitData.response.twoMinVersion;
    habitData.response.environmentTip = document.getElementById('habit-env')?.value || habitData.response.environmentTip;
  } else if (currentStep === 4) {
    habitData.reward.tracking = document.getElementById('habit-tracking')?.checked;
    habitData.reward.partnerName = document.getElementById('habit-partner-name')?.value || '';
    habitData.reward.partnerPhone = document.getElementById('habit-partner-phone')?.value || '';
    habitData.reward.contract = document.getElementById('habit-contract')?.value || '';
  } else if (currentStep === 5) {
    const timeInput = document.getElementById('step5-adjust-time');
    if (timeInput && timeInput.value) {
      habitData.cue.time = timeInput.value;
    }
  }
}

function handleNext() {
  saveCurrentStep();

  if (currentStep < 5) {
    currentStep++;
    updateUI();
  } else {
    // Save habit on Step 5
    if (!habitData.id) habitData.id = store.generateId();
    habitData.createdAt = habitData.createdAt || new Date();
    store.saveHabit(habitData);

    showToast('¡Hábito finalizado y guardado! 🎉', 'success');
    navigate('/home');
  }
}

function handleBack() {
  if (currentStep > 1) {
    saveCurrentStep();
    currentStep--;
    updateUI();
  }
}

function updateUI() {
  const container = document.getElementById('step-container');
  if (currentStep === 1) container.innerHTML = renderStep1();
  else if (currentStep === 2) container.innerHTML = renderStep2();
  else if (currentStep === 3) container.innerHTML = renderStep3();
  else if (currentStep === 4) container.innerHTML = renderStep4();
  else if (currentStep === 5) container.innerHTML = renderStep5();

  document.querySelectorAll('.wizard-step-indicator').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.step) <= currentStep);
  });

  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  btnBack.style.display = currentStep > 1 ? 'block' : 'none';
  btnNext.textContent = currentStep === 5 ? '🎉 Finalizar' : 'Siguiente';

  // Bind Step 5 suggestions buttons if present
  if (currentStep === 5) {
    document.querySelectorAll('.btn-sugg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const time = e.currentTarget.dataset.time;
        if (time) {
          habitData.cue.time = time;
          updateUI();
        }
      });
    });

    document.getElementById('step5-adjust-time')?.addEventListener('change', (e) => {
      if (e.target.value) {
        habitData.cue.time = e.target.value;
        updateUI();
      }
    });
  }
}

export function mount() {
  const btnNext = document.getElementById('btn-next');
  const btnBack = document.getElementById('btn-back');
  
  btnNext?.addEventListener('click', () => handleNext());
  btnBack?.addEventListener('click', () => handleBack());

  updateUI();
}

export function unmount() {
}
