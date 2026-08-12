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
            <div class="habit-bubble glass-card" id="main-habit-bubble" data-id="${nextEvent.id}" style="position: relative; overflow: hidden; padding: 36px 24px; text-align: center; border-radius: 24px; border: 1px solid rgba(245, 197, 24, 0.4); background: linear-gradient(145deg, rgba(35,35,42,0.85), rgba(20,20,25,0.95)); box-shadow: 0 10px 32px rgba(0,0,0,0.4), 0 0 25px rgba(245,197,24,0.12); touch-action: none; transition: transform 0.3s ease; cursor: pointer;">
                <div class="habit-bubble-content" style="position: relative; z-index: 2;">
                    <div style="font-size: 52px; margin-bottom: 12px; line-height: 1;">${nextEvent.icon}</div>
                    <h3 style="margin: 0 0 6px 0; font-size: 28px; font-family: 'Playfair Display', serif; color: #fff; font-weight: 700;">${nextEvent.name}</h3>
                    <div style="font-size: 15px; color: #F5C518; font-weight: 600; margin-bottom: 14px;">⏰ ${nextEvent.time}</div>
                    <div style="font-size: 13px; font-style: italic; color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 8px 16px; border-radius: 20px; display: inline-block;">Versión 2 min: ${nextEvent.twoMinuteVersion}</div>
                </div>
                <div class="habit-bubble-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle, rgba(245,197,24,0.25) 0%, rgba(0,0,0,0) 70%); opacity: 0; transition: opacity 0.3s ease;"></div>
            </div>
            <div style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
                💡 Mantén presionado para completar • Desliza a la izquierda para omitir
            </div>
        `;
    } else if (todayEvents.length > 0) {
        nextEventHtml = `
            <div class="empty-state glass-card" style="text-align: center; padding: 48px 24px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 56px; margin-bottom: 16px;">🎉</div>
                <h3 style="font-family: 'Playfair Display', serif; font-size: 26px; margin-bottom: 8px; color: #fff;">¡Objetivos cumplidos!</h3>
                <p style="color: var(--text-muted); font-size: 15px; margin: 0;">Completaste todos tus hábitos de hoy.</p>
            </div>
        `;
    } else {
        nextEventHtml = `
            <div class="empty-state glass-card" style="text-align: center; padding: 48px 24px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 56px; margin-bottom: 16px;">🌱</div>
                <h3 style="font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 8px; color: #fff;">Aún no tenés hábitos</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Tocá el botón (+) para crear tu primer hábito guiado.</p>
                <button class="btn-primary" onclick="window.location.hash='/habit/new'" style="max-width: 240px; margin: 0 auto;">Crear mi primer hábito</button>
            </div>
        `;
    }

    const remainingListHtml = remainingEvents.slice(1).map(ev => `
        <div class="glass-card compact-habit-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; margin-bottom: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
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
        <div class="glass-card compact-habit-item completed-item" data-id="${ev.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; margin-bottom: 12px; border-radius: 16px; opacity: 0.8; border: 1px solid rgba(76, 175, 80, 0.3); background: rgba(76, 175, 80, 0.08);">
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
        <div class="page home-page" style="padding: 24px 20px 100px 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box;">
            <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="menu-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">☰</button>
                    <div>
                        <h1 style="font-family: 'Playfair Display', serif; margin: 0; font-size: 26px; color: #fff; font-weight: 700;">Hola, ${name}</h1>
                        <div style="font-style: italic; color: var(--text-muted); font-size: 14px; margin-top: 2px;">Estás construyendo: ${identity}</div>
                    </div>
                </div>
            </header>

            <div class="quote-banner glass-card" style="border-left: 4px solid #F5C518; padding: 20px 24px; margin-bottom: 24px; font-style: italic; font-size: 15px; line-height: 1.6; color: #e0e0e0; border-radius: 16px; background: rgba(26,26,30,0.6);">
                "${quote}"
            </div>

            <div class="next-event-section" style="margin-bottom: 24px;">
                ${nextEventHtml}
            </div>

            ${(remainingEvents.length > 1 || completedEvents.length > 0) ? `
            <div class="remaining-events-list" style="margin-bottom: 24px;">
                <h3 style="font-size: 18px; font-family: 'Playfair Display', serif; margin-bottom: 14px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Resto del día</h3>
                ${remainingListHtml}
                ${completedListHtml}
            </div>
            ` : ''}

            ${todayEvents.length > 0 ? `
            <div class="streak-summary" style="margin-top: 24px; text-align: center; font-size: 14px; color: var(--text-muted); padding: 20px; border-top: 1px solid rgba(255,255,255,0.06);">
                <span style="color: #F5C518; font-weight: 700; font-size: 18px;">${completedEvents.length}</span> de <span style="font-weight: 700; color: #fff;">${todayEvents.length}</span> hábitos completados hoy
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
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        const overlay = bubble.querySelector('.habit-bubble-overlay');

        const habitId = bubble.dataset.id;

        const completeAction = async () => {
            bubble.classList.add('habit-bubble-completed');
            bubble.style.transform = 'scale(0.9)';
            bubble.style.opacity = '0';
            
            const state = store.getState();
            const identity = state.user?.identity || 'una persona increíble';
            
            const res = await store.completeEvent(habitId, store.getTodayString()) || {};
            const streak = res.newStreak || 1;
            
            showToast(`Un paso más como el ${identity} que sos. Racha: ${streak} 🔥`, 'success');
            
            setTimeout(() => {
                refreshHomeView();
            }, 350);
        };

        const skipAction = async () => {
            await store.skipEvent(habitId, store.getTodayString());
            showToast('Hábito omitido', 'info');
            refreshHomeView();
        };

        const onPointerDown = (e) => {
            isPressing = true;
            bubble.classList.add('habit-bubble-pressing');
            bubble.style.transform = 'scale(0.95)';
            if (overlay) overlay.style.opacity = '1';
            
            pressTimer = setTimeout(() => {
                if (isPressing) {
                    isPressing = false;
                    completeAction();
                }
            }, 800);
        };

        const onPointerUp = (e) => {
            isPressing = false;
            bubble.classList.remove('habit-bubble-pressing');
            bubble.style.transform = 'scale(1)';
            if (overlay) overlay.style.opacity = '0';
            clearTimeout(pressTimer);
        };

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
                bubble.style.transform = 'translateX(-100%)';
                bubble.style.opacity = '0';
                setTimeout(skipAction, 300);
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
    }
    
    return () => {
        unsubs.forEach(u => u());
    };
}

export function unmount() {
}
