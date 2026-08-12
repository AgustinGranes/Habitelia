import { store } from '../store.js';
import { navigate } from '../router.js';
import { getRandomQuote } from '../quotes.js';
import { showToast } from '../components/toast.js';

export function render(props = {}) {
    const state = store.getState();
    const name = state.user?.displayName || state.user?.name || 'Viajero';
    const identity = state.user?.identity || 'una persona increíble';
    const quote = getRandomQuote();
    const todayDate = store.getTodayString();

    // Map habits from store state into today's events list
    const habits = state.habits || [];
    const todayEvents = habits.map(h => {
        const isCompleted = h.completions?.[todayDate] === 'completed';
        const isSkipped = h.completions?.[todayDate] === 'skipped';
        return {
            id: h.id,
            name: h.name,
            icon: h.icon || '🎯',
            time: h.cue?.time || '08:00',
            duration: h.duration || 15,
            twoMinuteVersion: h.response?.twoMinVersion || '2 minutos',
            completed: isCompleted,
            skipped: isSkipped
        };
    });

    // Sort events by scheduled time
    todayEvents.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    const remainingEvents = todayEvents.filter(e => !e.completed && !e.skipped);
    const completedEvents = todayEvents.filter(e => e.completed);
    const nextEvent = remainingEvents.length > 0 ? remainingEvents[0] : null;

    let nextEventHtml = '';
    if (nextEvent) {
        nextEventHtml = `
            <div class="habit-bubble glass-card" id="main-habit-bubble" data-id="${nextEvent.id}" style="position: relative; overflow: hidden; padding: 32px 24px; text-align: center; border-radius: 24px; border: 1px solid rgba(245, 197, 24, 0.4); background: linear-gradient(145deg, rgba(35,35,42,0.85), rgba(20,20,25,0.95)); box-shadow: 0 10px 32px rgba(0,0,0,0.4), 0 0 25px rgba(245,197,24,0.12); touch-action: none; transition: transform 0.3s ease; cursor: pointer;">
                <div class="habit-fill-overlay" style="position: absolute; top: 0; left: 0; bottom: 0; width: 0%; background: linear-gradient(90deg, rgba(46,125,50,0.85), rgba(76,175,80,0.95)); z-index: 1; transition: width 0.8s linear;"></div>
                <div class="habit-bubble-content" style="position: relative; z-index: 2;">
                    <div style="font-size: 52px; margin-bottom: 10px; line-height: 1;">${nextEvent.icon}</div>
                    <h3 style="margin: 0 0 6px 0; font-size: 28px; font-family: 'Playfair Display', serif; color: #fff; font-weight: 700;">${nextEvent.name}</h3>
                    <div style="font-size: 15px; color: #F5C518; font-weight: 600; margin-bottom: 12px;">⏰ ${nextEvent.time}</div>
                    <div style="font-size: 13px; font-style: italic; color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 6px 14px; border-radius: 20px; display: inline-block;">Versión 2 min: ${nextEvent.twoMinuteVersion}</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 14px;">
                <button id="btn-edit-main-habit" data-id="${nextEvent.id}" style="flex: 1; min-height: 44px; padding: 8px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ✏️ Editar Hábito
                </button>
                <button id="btn-delete-main-habit" data-id="${nextEvent.id}" data-name="${nextEvent.name}" style="flex: 1; min-height: 44px; padding: 8px 16px; border-radius: 12px; border: 1px solid rgba(244,67,54,0.3); background: rgba(244,67,54,0.12); color: #FF5252; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    🗑️ Eliminar Hábito
                </button>
            </div>
        `;
    } else if (todayEvents.length > 0) {
        nextEventHtml = `
            <div class="empty-state glass-card" style="text-align: center; padding: 40px 24px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 52px; margin-bottom: 12px;">🎉</div>
                <h3 style="font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 6px; color: #fff;">¡Objetivos cumplidos!</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Completaste todos tus hábitos de hoy.</p>
            </div>
        `;
    } else {
        nextEventHtml = `
            <div class="empty-state glass-card" style="text-align: center; padding: 40px 24px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 52px; margin-bottom: 12px;">🌱</div>
                <h3 style="font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 6px; color: #fff;">Aún no tenés hábitos</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Tocá el botón (+) para crear tu primer hábito guiado.</p>
                <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 240px; margin: 0 auto;">Crear mi primer hábito</button>
            </div>
        `;
    }

    const remainingListHtml = remainingEvents.slice(1).map(ev => `
        <div class="glass-card compact-habit-item" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; margin-bottom: 10px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 26px;">${ev.icon}</span>
                <div>
                    <div style="font-weight: 700; font-size: 16px; color: #fff;">${ev.name}</div>
                    <div style="font-size: 13px; color: #F5C518; margin-top: 2px;">⏰ ${ev.time}</div>
                </div>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Pendiente</div>
        </div>
    `).join('');

    const completedListHtml = completedEvents.map(ev => `
        <div class="glass-card compact-habit-item completed-item" data-id="${ev.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; margin-bottom: 10px; border-radius: 16px; opacity: 0.8; border: 1px solid rgba(76, 175, 80, 0.3); background: rgba(76, 175, 80, 0.08);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 26px; filter: grayscale(50%);">${ev.icon}</span>
                <div>
                    <div style="font-weight: 700; font-size: 16px; text-decoration: line-through; color: #ccc;">${ev.name}</div>
                    <div style="font-size: 13px; color: #4CAF50; margin-top: 2px;">✓ Completado (⏰ ${ev.time})</div>
                </div>
            </div>
            <button class="btn-undo-event" data-id="${ev.id}" data-name="${ev.name}" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #F5C518; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s;">Deshacer</button>
        </div>
    `).join('');

    return `
        <div class="page home-page" style="padding: 16px 20px 100px 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box;">
            <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; width: 100%;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
                    <div>
                        <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 24px; color: #fff; font-weight: 700;">Hola, ${name}</h1>
                        <div style="font-style: italic; color: var(--text-muted); font-size: 13px; margin-top: 2px;">Estás construyendo: ${identity}</div>
                    </div>
                </div>
            </header>

            <div class="quote-banner glass-card" style="border-left: 4px solid #F5C518; padding: 16px 20px; margin-bottom: 16px; font-style: italic; font-size: 14px; line-height: 1.5; color: #e0e0e0; border-radius: 16px; background: rgba(26,26,30,0.6);">
                "${quote}"
            </div>

            <div class="next-event-section" style="margin-bottom: 16px;">
                ${nextEventHtml}
            </div>

            ${(remainingEvents.length > 1 || completedEvents.length > 0) ? `
            <div class="remaining-events-list" style="margin-bottom: 16px;">
                <h3 style="font-size: 17px; font-family: 'Playfair Display', serif; margin-bottom: 12px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">Resto del día</h3>
                ${remainingListHtml}
                ${completedListHtml}
            </div>
            ` : ''}

            ${todayEvents.length > 0 ? `
            <div class="streak-summary" style="margin-top: 16px; text-align: center; font-size: 13px; color: var(--text-muted); padding: 16px; border-top: 1px solid rgba(255,255,255,0.06);">
                <span style="color: #F5C518; font-weight: 700; font-size: 16px;">${completedEvents.length}</span> de <span style="font-weight: 700; color: #fff;">${todayEvents.length}</span> hábitos completados hoy
            </div>
            ` : ''}

            <button class="btn-fab" id="add-fab" style="position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: var(--accent-gradient); color: #000; font-size: 32px; font-weight: 300; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 24px rgba(245,197,24,0.4); z-index: 90; transition: transform 0.2s, box-shadow 0.2s;">+</button>
        </div>
    `;
}

function refreshHomeView() {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = render();
        mount();
    }
}

export function mount() {
    let unsubs = [];
    
    // Direct sidebar trigger handler
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

    // Action buttons for main event: Edit & Delete
    document.getElementById('btn-edit-main-habit')?.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        navigate('/habit/new', { id });
    });

    document.getElementById('btn-delete-main-habit')?.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name || 'Hábito';
        if (confirm(`¿Estás seguro de que querés eliminar el hábito "${name}"?`)) {
            await store.deleteHabit(id);
            showToast(`Hábito "${name}" eliminado`, 'info');
            refreshHomeView();
        }
    });

    // Undo completed event button handler
    document.querySelectorAll('.btn-undo-event').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const habitId = e.currentTarget.dataset.id;
            const habitName = e.currentTarget.dataset.name || 'Hábito';
            await store.uncompleteEvent(habitId, store.getTodayString());
            showToast(`Hábito "${habitName}" restaurado a pendiente ↩️`, 'info');
            refreshHomeView();
        });
    });

    const bubble = document.getElementById('main-habit-bubble');
    if (bubble) {
        let pressTimer;
        let isPressing = false;
        const fillOverlay = bubble.querySelector('.habit-fill-overlay');
        const habitId = bubble.dataset.id;

        const completeAction = async () => {
            bubble.style.transform = 'scale(0.95)';
            bubble.style.opacity = '0';
            
            const state = store.getState();
            const identity = state.user?.identity || 'una persona increíble';
            
            const res = await store.completeEvent(habitId, store.getTodayString()) || {};
            const streak = res.newStreak || 1;
            
            showToast(`Un paso más como el ${identity} que sos. Racha: ${streak} 🔥`, 'success');
            
            setTimeout(() => {
                refreshHomeView();
            }, 300);
        };

        const onPointerDown = (e) => {
            isPressing = true;
            if (fillOverlay) {
                fillOverlay.style.transition = 'width 0.8s linear';
                fillOverlay.style.width = '100%';
            }
            
            pressTimer = setTimeout(() => {
                if (isPressing) {
                    isPressing = false;
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

        bubble.addEventListener('pointerdown', onPointerDown);
        bubble.addEventListener('pointerup', onPointerUp);
        bubble.addEventListener('pointerleave', onPointerUp);
    }
    
    return () => {
        unsubs.forEach(u => u());
    };
}

export function unmount() {
}
