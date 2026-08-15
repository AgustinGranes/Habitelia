import { store } from '../store.js';
import { navigate } from '../router.js';
import { getRandomQuote } from '../quotes.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';
import { showDeleteHabitModal } from '../components/deleteHabitModal.js';
import { showInstallPromptIfNeeded } from '../components/installPrompt.js';

let isReorderingHome = false;

export function render(props = {}) {
    const state = store.getState();
    const name = state.user?.displayName || state.user?.name || 'Viajero';
    const identity = state.user?.identity || 'una persona constante y disciplinada';
    const quote = getRandomQuote();
    const todayDate = store.getTodayString();

    const todayLongDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedDate = todayLongDate.charAt(0).toUpperCase() + todayLongDate.slice(1);

    const habits = state.habits || [];

    // Filter habits for today's day of week
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayDayKey = dayKeys[new Date().getDay()];
    const todayHabits = habits.filter(h => {
        if (!h.frequency) return true;
        if (h.frequency.type === 'daily') return true;
        if (h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
            return h.frequency.days.includes(todayDayKey);
        }
        return true;
    });

    const todayEvents = [];

    // Main occurrences
    todayHabits.forEach(h => {
        const isCompleted = h.completions?.[todayDate] === 'completed' || h.completions?.[todayDate] === 'completed_2min';
        const isSkipped = h.completions?.[todayDate] === 'skipped';
        const streak = h.streak || 0;
        const linkedPleasure = h.craving?.linkedPleasure || h.linkedPleasure || '';
        const habitTime = (h.cue?.timePerDay && h.cue.timePerDay[todayDayKey]) || h.cue?.time || null;
        const parentHabit = h.stackedAfterId ? habits.find(item => item.id === h.stackedAfterId) : null;

        todayEvents.push({
            id: h.id,
            name: h.name,
            icon: h.icon || '🎯',
            time: habitTime,
            duration: h.duration || 15,
            twoMinuteVersion: h.response?.twoMinVersion || '2 minutos',
            linkedPleasure,
            stackedAfterId: h.stackedAfterId || '',
            stackedAfterName: parentHabit?.name || '',
            completed: isCompleted,
            skipped: isSkipped,
            streak
        });
    });

    // Repetition occurrences (if scheduled for today)
    habits.forEach(h => {
        if (h.repetition?.enabled && Array.isArray(h.repetitions)) {
            h.repetitions.forEach((rep, idx) => {
                const repDays = rep.days || [];
                if (repDays.includes(todayDayKey)) {
                    const repDateKey = todayDate + '_rep_' + idx;
                    const isCompleted = h.completions?.[repDateKey] === 'completed' || h.completions?.[repDateKey] === 'completed_2min';
                    const isSkipped = h.completions?.[repDateKey] === 'skipped';
                    const streak = h.streak || 0;
                    const linkedPleasure = h.craving?.linkedPleasure || h.linkedPleasure || '';
                    const parentHabit = h.stackedAfterId ? habits.find(item => item.id === h.stackedAfterId) : null;

                    todayEvents.push({
                        id: h.id + '_rep_' + idx,
                        name: `${h.name} (Repetición ${idx + 1})`,
                        icon: h.icon || '🎯',
                        time: rep.time || '18:00',
                        duration: h.duration || 15,
                        twoMinuteVersion: h.response?.twoMinVersion || '2 minutos',
                        linkedPleasure,
                        stackedAfterId: h.stackedAfterId ? h.stackedAfterId + '_rep_' + idx : '',
                        stackedAfterName: parentHabit?.name ? `${parentHabit.name} (Repetición ${idx + 1})` : '',
                        completed: isCompleted,
                        skipped: isSkipped,
                        streak
                    });
                }
            });
        }
    });

    // Build Stacked Groups
    const eventsMap = new Map(todayEvents.map(e => [e.id, e]));
    const childrenMap = new Map();
    todayEvents.forEach(e => {
        if (e.stackedAfterId && eventsMap.has(e.stackedAfterId)) {
            if (!childrenMap.has(e.stackedAfterId)) childrenMap.set(e.stackedAfterId, []);
            childrenMap.get(e.stackedAfterId).push(e);
        }
    });

    const rootEvents = todayEvents.filter(e => !e.stackedAfterId || !eventsMap.has(e.stackedAfterId));

    const savedOrder = store.getHabitOrder(todayDate);
    if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
        rootEvents.sort((a, b) => {
            const idxA = savedOrder.indexOf(a.id);
            const idxB = savedOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            if (a.time && b.time) return a.time.localeCompare(b.time);
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            return 0;
        });
    } else {
        rootEvents.sort((a, b) => {
            if (a.time && b.time) return a.time.localeCompare(b.time);
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            return 0;
        });
    }

    const remainingEvents = todayEvents.filter(e => !e.completed && !e.skipped);
    const completedEvents = todayEvents.filter(e => e.completed);
    const totalCount = todayEvents.length;
    const completedCount = completedEvents.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    function renderSingleHabitInner(ev, isStackedChild = false) {
        return `
            <div class="habit-item-card" data-id="${ev.id}" style="padding: ${isStackedChild ? '12px 14px' : '16px 18px'}; ${isStackedChild ? 'background: var(--bg-primary); border-radius: 14px; border: 1px solid var(--border-subtle); margin-top: 8px;' : ''} display: flex; align-items: center; justify-content: space-between; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <button class="btn-toggle-habit" data-id="${ev.id}" data-completed="${ev.completed}" style="width: 28px; height: 28px; border-radius: 50%; border: 1.75px solid ${ev.completed ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${ev.completed ? 'var(--text-primary)' : 'transparent'}; color: ${ev.completed ? 'var(--bg-primary)' : 'transparent'}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s ease;">
                        ${iconSVG('check', 14)}
                    </button>

                    <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 600; font-size: ${isStackedChild ? '15px' : '16px'}; color: ${ev.completed ? 'var(--text-tertiary)' : 'var(--text-primary)'}; ${ev.completed ? 'text-decoration: line-through;' : ''} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${isStackedChild ? `↳ ${ev.name}` : ev.name}
                        </div>
                        
                        ${ev.time ? `
                        <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px;">
                            <span>${iconSVG('clock', 12)} ${ev.time} (${ev.duration} min)</span>
                        </div>` : ''}

                        ${ev.linkedPleasure ? `
                        <div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">
                            Ritual previo: ${ev.linkedPleasure}
                        </div>` : ''}

                        ${ev.twoMinuteVersion ? `
                        <div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">
                            2 min: ${ev.twoMinuteVersion}
                        </div>` : ''}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 3px 8px; border-radius: 16px; font-size: 11.5px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
                        ${iconSVG('flame', 12)} ${ev.streak}d
                    </div>
                    <button class="btn-ghost btn-edit-habit" data-id="${ev.id}" title="Editar" style="padding: 5px; border-radius: 6px; color: var(--text-secondary);">
                        ${iconSVG('edit', 15)}
                    </button>
                    <button class="btn-ghost btn-delete-habit" data-id="${ev.id}" data-name="${ev.name}" title="Eliminar" style="padding: 5px; border-radius: 6px; color: var(--text-tertiary);">
                        ${iconSVG('trash', 15)}
                    </button>
                </div>
            </div>
        `;
    }

    let habitCardsHtml = '';
    if (todayEvents.length === 0) {
        habitCardsHtml = `
            <div class="glass-card" style="text-align: center; padding: 48px 24px; border-radius: 18px; margin-bottom: 24px;">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--text-secondary);">
                    ${iconSVG('target', 24)}
                </div>
                <h3 class="editorial-title" style="font-size: 22px; margin-bottom: 8px;">Aún no tienes hábitos</h3>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; max-width: 320px; margin-left: auto; margin-right: auto;">
                    Diseña tu primer hábito atómico para construir la identidad que deseas.
                </p>
                <button class="btn-primary" id="btn-empty-create" style="max-width: 240px; margin: 0 auto;">
                    ${iconSVG('plus', 16)} Crear mi primer hábito
                </button>
            </div>
        `;
    } else {
        habitCardsHtml = rootEvents.map((rootEv, idx) => {
            const children = childrenMap.get(rootEv.id) || [];
            const isStack = children.length > 0;

            if (!isStack) {
                return `
                    <div class="glass-card habit-group-card" data-root-id="${rootEv.id}" style="margin-bottom: 12px; border-radius: 16px; overflow: hidden;">
                        ${isReorderingHome ? `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle);">
                                <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${rootEv.name}</span>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn-ghost btn-move-up-group" data-idx="${idx}" style="padding: 4px 8px;" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>
                                        ${iconSVG('arrowUp', 16)}
                                    </button>
                                    <button class="btn-ghost btn-move-down-group" data-idx="${idx}" style="padding: 4px 8px;" ${idx === rootEvents.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
                                        ${iconSVG('arrowDown', 16)}
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                        ${renderSingleHabitInner(rootEv, false)}
                    </div>
                `;
            }

            return `
                <div class="glass-card habit-group-card" data-root-id="${rootEv.id}" style="padding: 16px; margin-bottom: 16px; border-radius: 20px; border: 1.5px solid var(--border-subtle); background: var(--bg-surface); box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                            ${iconSVG('chain', 14)} Secuencia de Acumulación (Habit Stack)
                        </span>
                        ${isReorderingHome ? `
                            <div style="display: flex; gap: 4px;">
                                <button class="btn-ghost btn-move-up-group" data-idx="${idx}" style="padding: 4px 8px;" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>
                                    ${iconSVG('arrowUp', 16)}
                                </button>
                                <button class="btn-ghost btn-move-down-group" data-idx="${idx}" style="padding: 4px 8px;" ${idx === rootEvents.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
                                    ${iconSVG('arrowDown', 16)}
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    ${renderSingleHabitInner(rootEv, false)}

                    <div style="border-left: 2px dashed var(--border-subtle); margin-left: 18px; padding-left: 10px; margin-top: 6px;">
                        ${children.map(child => renderSingleHabitInner(child, true)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    const showTodosInHome = state.user?.settings?.showTodosInHome !== false;
    const todos = state.todos || [];
    // Filter todos that should appear in the routine today:
    // - showInRoutine must be true (or not set, for backwards compat with old todos)
    // - routineMode 'daily': show every day until completed
    // - routineMode 'dueDate': show only on the due date
    const todayTodos = todos.filter(t => {
        if (t.completed) return false;
        // Legacy todos without showInRoutine field: show if dueDate matches today or no dueDate
        if (t.showInRoutine === undefined) {
            return t.dueDate === todayDate || !t.dueDate;
        }
        if (!t.showInRoutine) return false;
        if (t.routineMode === 'dueDate') {
            return t.dueDate === todayDate;
        }
        // 'daily' mode: show every day until completed
        return true;
    });

    let todosSectionHtml = '';
    if (showTodosInHome && todayTodos.length > 0) {
        todosSectionHtml = `
            <!-- Today To-Dos Section -->
            <section class="todos-section" style="margin-bottom: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Tareas de hoy (To-Do)</h3>
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">${todayTodos.length} tareas</span>
                </div>
                ${todayTodos.map(todo => `
                    <div class="glass-card todo-home-card" data-id="${todo.id}" style="padding: 16px 18px; margin-bottom: 10px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid var(--border-subtle);">
                        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                            <button class="btn-toggle-todo-home" data-id="${todo.id}" style="width: 26px; height: 26px; border-radius: 50%; border: 1.75px solid var(--border-subtle); background: transparent; color: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${iconSVG('check', 13)}
                            </button>
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-weight: 600; font-size: 15px; color: var(--text-primary);">
                                    ${todo.name}
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    ${todo.time ? `<span style="display:flex;align-items:center;gap:3px;">${iconSVG('clock', 12)} ${todo.time}</span>` : ''} ${todo.tag ? `<span style="display:flex;align-items:center;gap:3px;">${iconSVG('tag', 12)} ${todo.tag}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </section>
        `;
    }

    return `
        <div class="page home-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
            <!-- Header Editorial -->
            <header style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; width: 100%;">
                <div>
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 4px;">
                        ${formattedDate}
                    </div>
                    <h1 class="editorial-title" style="margin: 0; font-size: 34px;">Construye tu identidad<span style="color: var(--text-secondary); font-family: var(--font-serif);">.</span></h1>
                    <div style="font-family: var(--font-serif); font-style: italic; color: var(--text-secondary); font-size: 15px; margin-top: 4px;">
                        Estás convirtiéndote en: "${identity}"
                    </div>
                </div>
                <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; margin-top: 4px;">
                    ${iconSVG('menu', 20)}
                </button>
            </header>

            <!-- Daily Progress Card (Monochrome) -->
            ${totalCount > 0 ? `
            <div class="glass-card" style="padding: 24px; margin-bottom: 24px; border-radius: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary);">Progreso Diario</div>
                        <div style="font-family: var(--font-serif); font-size: 42px; line-height: 1; color: var(--text-primary); margin-top: 4px;">
                            ${progressPercent}%
                        </div>
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">
                        ${completedCount} de ${totalCount} completados
                    </div>
                </div>
                <div style="width: 100%; height: 4px; background: var(--bg-subtle); border-radius: 2px; overflow: hidden;">
                    <div style="width: ${progressPercent}%; height: 100%; background: var(--accent-primary); transition: width 0.4s ease-out;"></div>
                </div>
            </div>
            ` : ''}

            <!-- Quote Banner Editorial -->
            <div class="quote-banner glass-card" style="border-left: 3px solid var(--text-primary); padding: 18px 22px; margin-bottom: 28px; font-family: var(--font-serif); font-style: italic; font-size: 16px; line-height: 1.5; color: var(--text-primary); border-radius: 14px;">
                "${quote}"
            </div>

            <!-- Today Habits Section -->
            <section class="habits-section" style="margin-bottom: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Hábitos de hoy</h3>
                        ${todayEvents.length > 1 ? `
                            <button id="btn-reorder-home" class="btn-ghost" style="padding: 4px 10px; font-size: 12px; border: 1px solid ${isReorderingHome ? 'var(--text-primary)' : 'var(--border-subtle)'}; color: ${isReorderingHome ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                ${isReorderingHome ? `${iconSVG('check', 12)} Listo` : `${iconSVG('edit', 12)} Editar Orden`}
                            </button>
                        ` : ''}
                    </div>
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">${todayEvents.length} hábitos</span>
                </div>
                ${habitCardsHtml}
            </section>

            ${todosSectionHtml}

            <!-- Monochromatic FAB Button -->
            <button class="btn-fab" id="add-fab" style="position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-primary); color: var(--accent-inverted); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 90; transition: transform 0.2s ease, opacity 0.2s ease;">
                ${iconSVG('plus', 24)}
            </button>
        </div>
    `;
}

function openFabChoiceModal() {
  document.getElementById('fab-choice-modal')?.remove();
  const state = store.getState();
  const habits = state.habits || [];

  const modalHtml = `
    <div id="fab-choice-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 20px; border: 1px solid var(--border-subtle); background: var(--bg-surface);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 class="editorial-title" style="font-size: 22px; margin: 0; color: var(--text-primary);">¿Qué deseas agregar?</h3>
          <button id="close-fab-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
          <button id="btn-fab-option-new" class="btn-primary" style="min-height: 48px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('plus', 18)} Crear Hábito Nuevo
          </button>

          <button id="btn-fab-option-existing" class="btn-secondary" style="min-height: 48px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('routine', 18)} Seleccionar Hábito Existente
          </button>
        </div>

        <div id="existing-habits-container" style="display: none; margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
          <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">Elegí un hábito guardado:</div>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
            ${habits.length === 0 ? `<div style="font-size: 13px; color: var(--text-secondary);">No hay hábitos creados aún.</div>` : habits.map(h => `
              <button class="btn-pick-existing-habit" data-id="${h.id}" style="text-align: left; padding: 12px 14px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-weight: 600; font-size: 14px;">${h.name}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">⏰ ${h.cue?.time || '08:00'} (${h.duration || 15} min)</div>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">+ Agregar</span>
              </button>
            `).join('')}
          </div>
        </div>

        <button id="btn-cancel-fab-modal" class="btn-secondary" style="width: 100%; margin-top: 16px; min-height: 44px; color: var(--text-secondary);">
          Cancelar
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-fab-modal')?.addEventListener('click', () => {
    document.getElementById('fab-choice-modal')?.remove();
  });
  document.getElementById('btn-cancel-fab-modal')?.addEventListener('click', () => {
    document.getElementById('fab-choice-modal')?.remove();
  });

  document.getElementById('btn-fab-option-new')?.addEventListener('click', () => {
    document.getElementById('fab-choice-modal')?.remove();
    navigate('/habit/new');
  });

  document.getElementById('btn-fab-option-existing')?.addEventListener('click', () => {
    const existingContainer = document.getElementById('existing-habits-container');
    if (existingContainer) existingContainer.style.display = 'block';
  });

  document.querySelectorAll('.btn-pick-existing-habit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const habitId = e.currentTarget.dataset.id;
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const todayDayKey = dayKeys[new Date().getDay()];
        
        let freq = habit.frequency || { type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
        if (freq.type === 'weekly') {
          let days = freq.days || [];
          if (!days.includes(todayDayKey)) {
            days = [...days, todayDayKey];
            const updatedHabit = {
              ...habit,
              frequency: { ...freq, days }
            };
            await store.saveHabit(updatedHabit);
          }
        }

        showToast(`Hábito "${habit.name}" listo en tu lista de hoy`, 'success');
        document.getElementById('fab-choice-modal')?.remove();
        refreshHomeView();
      }
    });
  });
}

function openCompletionModeModal(habitId, habitName, onSelectMode) {
  document.getElementById('completion-mode-modal')?.remove();

  const modalHtml = `
    <div id="completion-mode-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 28px; border-radius: 20px; border: 1px solid var(--border-subtle); background: var(--bg-surface); text-align: center;">
        
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          ${iconSVG('check', 22)}
        </div>

        <h3 class="editorial-title" style="font-size: 24px; margin: 0 0 6px 0;">¡Excelente trabajo!</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 24px 0;">¿Qué versión completaste de "${habitName}"?</p>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          <button id="btn-mode-full" class="btn-primary" style="min-height: 50px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('star', 18)} Versión Completa (Normal)
          </button>

          <button id="btn-mode-2min" class="btn-secondary" style="min-height: 50px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${iconSVG('clock', 18)} Versión 2 Minutos
          </button>
        </div>

        <button id="btn-cancel-mode" class="btn-secondary" style="width: 100%; min-height: 44px; color: var(--text-secondary);">
          Cancelar
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-cancel-mode')?.addEventListener('click', () => {
    document.getElementById('completion-mode-modal')?.remove();
  });

  document.getElementById('btn-mode-full')?.addEventListener('click', () => {
    document.getElementById('completion-mode-modal')?.remove();
    onSelectMode('completed');
  });

  document.getElementById('btn-mode-2min')?.addEventListener('click', () => {
    document.getElementById('completion-mode-modal')?.remove();
    onSelectMode('completed_2min');
  });
}

function refreshHomeView() {
    const pageContent = document.querySelector('.home-page');
    if (pageContent) {
        pageContent.outerHTML = render();
        mount();
    } else {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = render();
            mount();
            const sidebarHTML = renderSidebar();
            app.insertAdjacentHTML('beforeend', sidebarHTML);
            mountSidebar();
        }
    }
}

export function mount() {
    let unsubs = [];
    
    showInstallPromptIfNeeded();
    
    // Ensure sidebar is present and mount sidebar trigger
    let overlay = document.getElementById('sidebar-overlay');
    let panel = document.getElementById('sidebar-panel');
    if (!overlay || !panel) {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            const sidebarHTML = renderSidebar();
            appContainer.insertAdjacentHTML('beforeend', sidebarHTML);
            mountSidebar();
        }
    }

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

    document.getElementById('add-fab')?.addEventListener('click', () => {
        openFabChoiceModal();
    });

    document.querySelectorAll('.habit-bubble').forEach(bubble => {
        const rawId = bubble.dataset.id;
        const isRep = rawId.includes('_rep_');
        const habitId = isRep ? rawId.split('_rep_')[0] : rawId;
        const repIndex = isRep ? rawId.split('_rep_')[1] : null;
        const completionDateKey = isRep ? store.getTodayString() + '_rep_' + repIndex : store.getTodayString();

        const fillOverlay = bubble.querySelector('.fill-overlay');
        let isPressing = false;
        let pressTimer = null;

        const completeAction = async () => {
            const habit = store.getState().habits?.find(h => h.id === habitId);
            openCompletionModeModal(rawId, habit?.name || 'Hábito', async (mode) => {
                const res = await store.completeEvent(habitId, completionDateKey, mode) || {};
                const streak = res.newStreak || 1;
                const modeText = mode === 'completed_2min' ? ' (2 minutos)' : ' (Completo)';
                showToast(`¡Excelente! Racha: ${streak} días${modeText}`, 'success');
                refreshHomeView();
            });
        };

        const onPointerDown = (e) => {
            isPressing = true;
            if (fillOverlay) {
                fillOverlay.style.transition = 'width 0.8s linear';
                fillOverlay.style.width = '100%';
            }
            
            pressTimer = setTimeout(() => {
                if (isPressing) {
                    completeAction();
                }
            }, 800);
        };

        const onPointerUp = (e) => {
            isPressing = false;
            clearTimeout(pressTimer);
            if (fillOverlay) {
                fillOverlay.style.transition = 'width 0.2s ease-out';
                fillOverlay.style.width = '0%';
            }
        };

        const skipAction = async () => {
            bubble.style.transform = 'translateX(-100%)';
            bubble.style.opacity = '0';
            setTimeout(async () => {
                await store.skipEvent(habitId, completionDateKey);
                showToast('Hábito omitido', 'info');
                refreshHomeView();
            }, 300);
        };

        let startX = 0;
        let startY = 0;
        let currentX = 0;

        const onTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            bubble.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!startX || !startY) return;
            currentX = e.touches[0].clientX;
            const diffX = startX - currentX;
            const diffY = startY - e.touches[0].clientY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                e.preventDefault(); 
                if (diffX > 0) {
                    const translateX = Math.min(diffX, 150);
                    bubble.style.transform = `translateX(-${translateX}px)`;
                    bubble.style.backgroundColor = `rgba(244, 67, 54, ${Math.min(diffX/150, 0.4)})`;
                }
            }
        };

        const onTouchEnd = (e) => {
            bubble.style.transition = 'transform 0.3s ease, background-color 0.3s ease, opacity 0.3s ease';
            const diffX = startX - currentX;
            if (startX > 0 && currentX > 0 && diffX > 100) { 
                skipAction();
            } else {
                bubble.style.transform = 'translateX(0) scale(1)';
                bubble.style.backgroundColor = '';
            }
            startX = 0;
            currentX = 0;
            onPointerUp(e);
        };

        bubble.addEventListener('pointerdown', onPointerDown);
        bubble.addEventListener('pointerup', onPointerUp);
        bubble.addEventListener('pointerleave', onPointerUp);
        
        bubble.addEventListener('touchstart', onTouchStart, { passive: false });
        bubble.addEventListener('touchmove', onTouchMove, { passive: false });
        bubble.addEventListener('touchend', onTouchEnd);
    });

    document.getElementById('btn-empty-create')?.addEventListener('click', () => {
        openFabChoiceModal();
    });

    // Toggle complete / uncomplete habit
    document.querySelectorAll('.btn-toggle-habit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const rawId = e.currentTarget.dataset.id;
            const isRep = rawId.includes('_rep_');
            const habitId = isRep ? rawId.split('_rep_')[0] : rawId;
            const repIndex = isRep ? rawId.split('_rep_')[1] : null;
            const completionDateKey = isRep ? store.getTodayString() + '_rep_' + repIndex : store.getTodayString();
            const isCompleted = e.currentTarget.dataset.completed === 'true';

            if (isCompleted) {
                await store.uncompleteEvent(habitId, completionDateKey);
                showToast('Hábito marcado como pendiente', 'info');
                refreshHomeView();
            } else {
                const habit = store.getState().habits?.find(h => h.id === habitId);
                openCompletionModeModal(rawId, habit?.name || 'Hábito', async (mode) => {
                    const res = await store.completeEvent(habitId, completionDateKey, mode) || {};
                    const streak = res.newStreak || 1;
                    const modeText = mode === 'completed_2min' ? ' (2 minutos)' : ' (Completo)';
                    showToast(`¡Excelente! Racha: ${streak} días${modeText}`, 'success');
                    refreshHomeView();
                });
            }
        });
    });

    // Edit habit action
    document.querySelectorAll('.btn-edit-habit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rawId = e.currentTarget.dataset.id;
            const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
            navigate('/habit/new', { id });
        });
    });

    document.getElementById('btn-reorder-home')?.addEventListener('click', () => {
        isReorderingHome = !isReorderingHome;
        refreshHomeView();
    });

    document.querySelectorAll('.btn-move-up-group').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            if (idx > 0) {
                const groupCards = Array.from(document.querySelectorAll('.habit-group-card'));
                const ids = groupCards.map(c => c.dataset.rootId);
                const temp = ids[idx];
                ids[idx] = ids[idx - 1];
                ids[idx - 1] = temp;
                store.saveHabitOrder(store.getTodayString(), ids);
                refreshHomeView();
            }
        });
    });

    document.querySelectorAll('.btn-move-down-group').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            const groupCards = Array.from(document.querySelectorAll('.habit-group-card'));
            const ids = groupCards.map(c => c.dataset.rootId);
            if (idx < ids.length - 1) {
                const temp = ids[idx];
                ids[idx] = ids[idx + 1];
                ids[idx + 1] = temp;
                store.saveHabitOrder(store.getTodayString(), ids);
                refreshHomeView();
            }
        });
    });

    document.querySelectorAll('.btn-toggle-todo-home').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            await store.toggleTodo(id);
            showToast('Tarea completada', 'success');
            refreshHomeView();
        });
    });

    // Delete habit action
    document.querySelectorAll('.btn-delete-habit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const rawId = e.currentTarget.dataset.id;
            const id = rawId.includes('_rep_') ? rawId.split('_rep_')[0] : rawId;
            const name = e.currentTarget.dataset.name || 'Hábito';
            
            showDeleteHabitModal(id, name, () => {
                refreshHomeView();
            });
        });
    });
    
    return () => {
        unsubs.forEach(u => u());
    };
}

export function unmount() {
}
