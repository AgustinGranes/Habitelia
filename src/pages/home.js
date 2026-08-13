import { store } from '../store.js';
import { navigate } from '../router.js';
import { getRandomQuote } from '../quotes.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

export function render(props = {}) {
    const state = store.getState();
    const name = state.user?.displayName || state.user?.name || 'Viajero';
    const identity = state.user?.identity || 'una persona constante y disciplinada';
    const quote = getRandomQuote();
    const todayDate = store.getTodayString();

    const todayLongDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedDate = todayLongDate.charAt(0).toUpperCase() + todayLongDate.slice(1);

    // Map habits from store state into today's events list
    const habits = state.habits || [];
    const todayEvents = habits.map(h => {
        const isCompleted = h.completions?.[todayDate] === 'completed';
        const isSkipped = h.completions?.[todayDate] === 'skipped';
        const streak = h.streak || 0;
        const linkedPleasure = h.craving?.linkedPleasure || h.linkedPleasure || '';

        return {
            id: h.id,
            name: h.name,
            icon: h.icon || '🎯',
            time: h.cue?.time || '08:00',
            duration: h.duration || 15,
            twoMinuteVersion: h.response?.twoMinVersion || '2 minutos',
            linkedPleasure,
            completed: isCompleted,
            skipped: isSkipped,
            streak
        };
    });

    todayEvents.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    const remainingEvents = todayEvents.filter(e => !e.completed && !e.skipped);
    const completedEvents = todayEvents.filter(e => e.completed);
    const totalCount = todayEvents.length;
    const completedCount = completedEvents.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
        habitCardsHtml = todayEvents.map(ev => `
            <div class="glass-card habit-item-card" data-id="${ev.id}" style="padding: 18px 20px; margin-bottom: 12px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: transform 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0;">
                    <!-- Monochromatic Checkbox Mechanism -->
                    <button class="btn-toggle-habit" data-id="${ev.id}" data-completed="${ev.completed}" style="width: 28px; height: 28px; border-radius: 50%; border: 1.75px solid ${ev.completed ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${ev.completed ? 'var(--text-primary)' : 'transparent'}; color: ${ev.completed ? 'var(--bg-primary)' : 'transparent'}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s ease;">
                        ${iconSVG('check', 14)}
                    </button>

                    <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 600; font-size: 16px; color: ${ev.completed ? 'var(--text-tertiary)' : 'var(--text-primary)'}; ${ev.completed ? 'text-decoration: line-through;' : ''} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${ev.name}
                        </div>
                        
                        <!-- Scheduled Time Line -->
                        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 3px; display: flex; align-items: center; gap: 8px;">
                            <span>${iconSVG('clock', 13)} ${ev.time} (${ev.duration} min)</span>
                        </div>

                        <!-- Ritual Previo Line (DEBAJO DEL HORARIO) -->
                        ${ev.linkedPleasure ? `
                        <div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                            <span>Ritual previo: ${ev.linkedPleasure}</span>
                        </div>
                        ` : (ev.twoMinuteVersion ? `
                        <div style="font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">
                            2 min: ${ev.twoMinuteVersion}
                        </div>
                        ` : '')}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                    <!-- Streak Badge Monochromatic -->
                    <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 5px;">
                        ${iconSVG('flame', 13)} ${ev.streak}d
                    </div>

                    <!-- Quick Edit & Delete Buttons -->
                    <button class="btn-ghost btn-edit-habit" data-id="${ev.id}" title="Editar" style="padding: 6px; border-radius: 8px; color: var(--text-secondary);">
                        ${iconSVG('edit', 16)}
                    </button>
                    <button class="btn-ghost btn-delete-habit" data-id="${ev.id}" data-name="${ev.name}" title="Eliminar" style="padding: 6px; border-radius: 8px; color: var(--text-tertiary);">
                        ${iconSVG('trash', 16)}
                    </button>
                </div>
            </div>
        `).join('');
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
                <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease;">
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
                    <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Hábitos de hoy</h3>
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">${todayEvents.length} hábitos</span>
                </div>
                ${habitCardsHtml}
            </section>

            <!-- Monochromatic FAB Button -->
            <button class="btn-fab" id="add-fab" style="position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-primary); color: var(--accent-inverted); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 90; transition: transform 0.2s ease, opacity 0.2s ease;">
                ${iconSVG('plus', 24)}
            </button>
        </div>
    `;
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
        navigate('/habit/new');
    });

    document.getElementById('btn-empty-create')?.addEventListener('click', () => {
        navigate('/habit/new');
    });

    // Toggle complete / uncomplete habit
    document.querySelectorAll('.btn-toggle-habit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const habitId = e.currentTarget.dataset.id;
            const isCompleted = e.currentTarget.dataset.completed === 'true';

            if (isCompleted) {
                await store.uncompleteEvent(habitId, store.getTodayString());
                showToast('Hábito marcado como pendiente', 'info');
            } else {
                const res = await store.completeEvent(habitId, store.getTodayString()) || {};
                const streak = res.newStreak || 1;
                showToast(`Un paso más hacia tu identidad. Racha: ${streak} días`, 'success');
            }

            refreshHomeView();
        });
    });

    // Edit habit action
    document.querySelectorAll('.btn-edit-habit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            navigate('/habit/new', { id });
        });
    });

    // Delete habit action
    document.querySelectorAll('.btn-delete-habit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name || 'Hábito';
            if (confirm(`¿Estás seguro de eliminar el hábito "${name}"?`)) {
                await store.deleteHabit(id);
                showToast(`Hábito "${name}" eliminado`, 'info');
                refreshHomeView();
            }
        });
    });
    
    return () => {
        unsubs.forEach(u => u());
    };
}

export function unmount() {
}
