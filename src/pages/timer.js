import { iconSVG } from '../components/icons.js';
import { store } from '../store.js';
import { openSidebar } from '../components/sidebar.js';

// --- State ---
let currentTab = 'stopwatch'; // stopwatch, timer, pomodoro

// Stopwatch State
let swStartTime = 0;
let swElapsedTime = 0;
let swInterval = null;
let swIsRunning = false;
let swRafId = null;

// Timer State
let tmDuration = 5 * 60 * 1000; // 5 minutes default
let tmStartTime = 0;
let tmRemainingTime = tmDuration;
let tmIsRunning = false;
let tmInterval = null;
let tmRafId = null;
let tmFinished = false;

// Pomodoro State
let pmWorkDuration = 25 * 60 * 1000;
let pmBreakDuration = 5 * 60 * 1000;
let pmPhase = 'work'; // work, break
let pmStartTime = 0;
let pmRemainingTime = pmWorkDuration;
let pmIsRunning = false;
let pmInterval = null;
let pmCycle = 1;
let pmRafId = null;

// --- Formatting Utils ---
function formatTime(ms, includeCentiseconds = false) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    
    if (includeCentiseconds) {
        const centiseconds = Math.floor((ms % 1000) / 10);
        const formattedCentiseconds = String(centiseconds).padStart(2, '0');
        return `${formattedMinutes}:${formattedSeconds}.${formattedCentiseconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
}

// --- Render ---
export function render(params) {
    return `
        <div class="page timer-page" style="padding-bottom: 80px; display: flex; flex-direction: column; min-height: 100vh;">
            <header style="padding: 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--bg-primary); z-index: 10; border-bottom: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <button id="menu-btn" style="background: none; border: none; color: var(--text-primary); padding: 0; cursor: pointer; display: flex; touch-action: manipulation;">
                        ${iconSVG('menu', 22)}
                    </button>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; font-family: var(--font-serif, sans-serif); color: var(--text-primary);">Tiempo</h1>
                </div>
            </header>

            <div style="padding: 20px; display: flex; flex-direction: column; flex-grow: 1;">
                
                <div style="display: flex; background: var(--bg-subtle); border-radius: 12px; padding: 4px; margin-bottom: 30px;">
                    <button class="tab-btn" data-tab="stopwatch" style="flex: 1; padding: 10px 0; border: none; background: ${currentTab === 'stopwatch' ? 'var(--bg-surface)' : 'transparent'}; color: ${currentTab === 'stopwatch' ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: ${currentTab === 'stopwatch' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}; touch-action: manipulation;">Cronómetro</button>
                    <button class="tab-btn" data-tab="timer" style="flex: 1; padding: 10px 0; border: none; background: ${currentTab === 'timer' ? 'var(--bg-surface)' : 'transparent'}; color: ${currentTab === 'timer' ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: ${currentTab === 'timer' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}; touch-action: manipulation;">Temporizador</button>
                    <button class="tab-btn" data-tab="pomodoro" style="flex: 1; padding: 10px 0; border: none; background: ${currentTab === 'pomodoro' ? 'var(--bg-surface)' : 'transparent'}; color: ${currentTab === 'pomodoro' ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: ${currentTab === 'pomodoro' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}; touch-action: manipulation;">Pomodoro</button>
                </div>

                <div id="tab-content-container" style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    ${renderTabContent(currentTab)}
                </div>

            </div>
        </div>
    `;
}

function renderTabContent(tab) {
    if (tab === 'stopwatch') {
        return `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 400px;">
                <div id="sw-display" style="font-size: 64px; font-weight: 300; font-family: monospace; color: var(--text-primary); margin-bottom: 40px; font-variant-numeric: tabular-nums;">
                    ${formatTime(swElapsedTime, true)}
                </div>
                <div style="display: flex; gap: 20px; width: 100%; justify-content: center;">
                    <button id="sw-reset" style="width: 60px; height: 60px; border-radius: 30px; border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; touch-action: manipulation;">Reset</button>
                    ${swIsRunning ? 
                        `<button id="sw-pause" style="width: 80px; height: 80px; border-radius: 40px; border: none; background: #FFF3E0; color: #E65100; font-weight: 600; cursor: pointer; touch-action: manipulation; box-shadow: 0 4px 12px rgba(230,81,0,0.2);">Pausa</button>` :
                        `<button id="sw-start" style="width: 80px; height: 80px; border-radius: 40px; border: none; background: #E8F5E9; color: #2E7D32; font-weight: 600; cursor: pointer; touch-action: manipulation; box-shadow: 0 4px 12px rgba(46,125,50,0.2);">Iniciar</button>`
                    }
                </div>
            </div>
        `;
    } else if (tab === 'timer') {
        const progress = tmDuration > 0 ? (tmDuration - tmRemainingTime) / tmDuration * 100 : 0;
        return `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 400px;">
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 30px;">
                    <input type="number" id="tm-input" value="${Math.floor(tmDuration / 60000)}" min="1" max="999" style="width: 60px; padding: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-surface); color: var(--text-primary); text-align: center; font-size: 16px;">
                    <span style="color: var(--text-secondary);">min</span>
                </div>
                
                <div id="tm-display-container" style="position: relative; margin-bottom: 40px; ${tmFinished ? 'animation: pulse 1.5s infinite;' : ''}">
                    <div id="tm-display" style="font-size: 72px; font-weight: 300; font-family: monospace; color: ${tmFinished ? '#E65100' : 'var(--text-primary)'}; font-variant-numeric: tabular-nums;">
                        ${tmFinished ? '¡Tiempo!' : formatTime(tmRemainingTime, false)}
                    </div>
                </div>

                <div style="width: 100%; height: 8px; background: var(--bg-subtle); border-radius: 4px; margin-bottom: 40px; overflow: hidden;">
                    <div id="tm-progress" style="height: 100%; width: ${progress}%; background: ${tmFinished ? '#E65100' : 'var(--text-primary)'}; transition: width 0.1s linear;"></div>
                </div>

                <div style="display: flex; gap: 20px; width: 100%; justify-content: center;">
                    <button id="tm-reset" style="width: 60px; height: 60px; border-radius: 30px; border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; touch-action: manipulation;">Reset</button>
                    ${tmIsRunning ? 
                        `<button id="tm-pause" style="width: 80px; height: 80px; border-radius: 40px; border: none; background: #FFF3E0; color: #E65100; font-weight: 600; cursor: pointer; touch-action: manipulation; box-shadow: 0 4px 12px rgba(230,81,0,0.2);">Pausa</button>` :
                        `<button id="tm-start" style="width: 80px; height: 80px; border-radius: 40px; border: none; background: #E8F5E9; color: #2E7D32; font-weight: 600; cursor: pointer; touch-action: manipulation; box-shadow: 0 4px 12px rgba(46,125,50,0.2);">Iniciar</button>`
                    }
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            </style>
        `;
    } else if (tab === 'pomodoro') {
        const totalPhaseDuration = pmPhase === 'work' ? pmWorkDuration : pmBreakDuration;
        const progress = totalPhaseDuration > 0 ? (totalPhaseDuration - pmRemainingTime) / totalPhaseDuration : 0;
        const dasharray = 2 * Math.PI * 90;
        const dashoffset = dasharray * (1 - progress);
        const phaseColor = pmPhase === 'work' ? '#2E7D32' : '#1565C0';
        
        return `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 400px;">
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">Enfoque</span>
                        <input type="number" id="pm-work-input" value="${Math.floor(pmWorkDuration / 60000)}" min="1" max="90" style="width: 50px; padding: 4px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface); color: var(--text-primary); text-align: center; font-size: 14px;">
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">Descanso</span>
                        <input type="number" id="pm-break-input" value="${Math.floor(pmBreakDuration / 60000)}" min="1" max="30" style="width: 50px; padding: 4px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface); color: var(--text-primary); text-align: center; font-size: 14px;">
                    </div>
                </div>

                <div style="position: relative; width: 220px; height: 220px; margin-bottom: 30px; display: flex; justify-content: center; align-items: center;">
                    <svg width="220" height="220" style="position: absolute; top: 0; left: 0; transform: rotate(-90deg);">
                        <circle cx="110" cy="110" r="90" fill="none" stroke="var(--bg-subtle)" stroke-width="8" />
                        <circle id="pm-circle" cx="110" cy="110" r="90" fill="none" stroke="${phaseColor}" stroke-width="8" stroke-dasharray="${dasharray}" stroke-dashoffset="${dashoffset}" stroke-linecap="round" style="transition: stroke-dashoffset 0.1s linear, stroke 0.3s;" />
                    </svg>
                    <div style="display: flex; flex-direction: column; align-items: center; z-index: 1;">
                        <span id="pm-phase-label" style="font-size: 16px; font-weight: 500; color: ${phaseColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${pmPhase === 'work' ? 'Enfoque' : 'Descanso'}</span>
                        <div id="pm-display" style="font-size: 48px; font-weight: 300; font-family: monospace; color: var(--text-primary); font-variant-numeric: tabular-nums;">
                            ${formatTime(pmRemainingTime, false)}
                        </div>
                        <span style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">Ciclo ${pmCycle}</span>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; width: 100%; justify-content: center;">
                    <button id="pm-reset" style="width: 60px; height: 60px; border-radius: 30px; border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; touch-action: manipulation;">Reset</button>
                    ${pmIsRunning ? 
                        `<button id="pm-pause" style="width: 80px; height: 80px; border-radius: 40px; border: none; background: #FFF3E0; color: #E65100; font-weight: 600; cursor: pointer; touch-action: manipulation; box-shadow: 0 4px 12px rgba(230,81,0,0.2);">Pausa</button>` :
                        `<button id="pm-start" style="width: 80px; height: 80px; border-radius: 40px; border: none; background: ${pmPhase === 'work' ? '#E8F5E9' : '#E3F2FD'}; color: ${pmPhase === 'work' ? '#2E7D32' : '#1565C0'}; font-weight: 600; cursor: pointer; touch-action: manipulation; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">Iniciar</button>`
                    }
                </div>
            </div>
        `;
    }
}

// --- Mount ---
export function mount(params) {
    document.getElementById('menu-btn')?.addEventListener('click', () => {
        openSidebar();
    });

    setupTabs();
    setupCurrentTabLogic();
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newTab = e.target.dataset.tab;
            if (newTab !== currentTab) {
                currentTab = newTab;
                
                // Update UI state for tabs
                tabBtns.forEach(b => {
                    b.style.background = b.dataset.tab === currentTab ? 'var(--bg-surface)' : 'transparent';
                    b.style.color = b.dataset.tab === currentTab ? 'var(--text-primary)' : 'var(--text-secondary)';
                    b.style.boxShadow = b.dataset.tab === currentTab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none';
                });

                // Update content
                const container = document.getElementById('tab-content-container');
                if (container) {
                    container.innerHTML = renderTabContent(currentTab);
                    setupCurrentTabLogic();
                }
            }
        });
    });
}

function setupCurrentTabLogic() {
    if (currentTab === 'stopwatch') {
        setupStopwatch();
    } else if (currentTab === 'timer') {
        setupTimer();
    } else if (currentTab === 'pomodoro') {
        setupPomodoro();
    }
}

function reRenderButtons() {
    const container = document.getElementById('tab-content-container');
    if (container) {
        container.innerHTML = renderTabContent(currentTab);
        setupCurrentTabLogic();
    }
}

// --- Stopwatch Logic ---
function setupStopwatch() {
    const btnStart = document.getElementById('sw-start');
    const btnPause = document.getElementById('sw-pause');
    const btnReset = document.getElementById('sw-reset');
    
    if (btnStart) btnStart.addEventListener('click', startStopwatch);
    if (btnPause) btnPause.addEventListener('click', pauseStopwatch);
    if (btnReset) btnReset.addEventListener('click', resetStopwatch);

    if (swIsRunning) {
        swRafId = requestAnimationFrame(updateStopwatchUI);
    } else {
        updateStopwatchDisplay();
    }
}

function startStopwatch() {
    if (!swIsRunning) {
        swIsRunning = true;
        swStartTime = Date.now() - swElapsedTime;
        swInterval = setInterval(() => {
            swElapsedTime = Date.now() - swStartTime;
        }, 10);
        swRafId = requestAnimationFrame(updateStopwatchUI);
        reRenderButtons();
    }
}

function pauseStopwatch() {
    if (swIsRunning) {
        swIsRunning = false;
        clearInterval(swInterval);
        cancelAnimationFrame(swRafId);
        reRenderButtons();
    }
}

function resetStopwatch() {
    swIsRunning = false;
    clearInterval(swInterval);
    cancelAnimationFrame(swRafId);
    swElapsedTime = 0;
    updateStopwatchDisplay();
    reRenderButtons();
}

function updateStopwatchUI() {
    if (!swIsRunning || currentTab !== 'stopwatch') return;
    updateStopwatchDisplay();
    swRafId = requestAnimationFrame(updateStopwatchUI);
}

function updateStopwatchDisplay() {
    const display = document.getElementById('sw-display');
    if (display) {
        display.textContent = formatTime(swElapsedTime, true);
    }
}

// --- Timer Logic ---
function setupTimer() {
    const btnStart = document.getElementById('tm-start');
    const btnPause = document.getElementById('tm-pause');
    const btnReset = document.getElementById('tm-reset');
    const input = document.getElementById('tm-input');

    if (btnStart) btnStart.addEventListener('click', startTimer);
    if (btnPause) btnPause.addEventListener('click', pauseTimer);
    if (btnReset) btnReset.addEventListener('click', resetTimer);
    if (input) {
        input.addEventListener('change', (e) => {
            if (!tmIsRunning) {
                let mins = parseInt(e.target.value);
                if (isNaN(mins) || mins < 1) mins = 1;
                if (mins > 999) mins = 999;
                e.target.value = mins;
                tmDuration = mins * 60 * 1000;
                tmRemainingTime = tmDuration;
                tmFinished = false;
                updateTimerDisplay();
            }
        });
    }

    if (tmIsRunning) {
        tmRafId = requestAnimationFrame(updateTimerUI);
    } else {
        updateTimerDisplay();
    }
}

function startTimer() {
    if (!tmIsRunning && tmRemainingTime > 0) {
        tmIsRunning = true;
        tmFinished = false;
        tmStartTime = Date.now() - (tmDuration - tmRemainingTime);
        tmInterval = setInterval(() => {
            tmRemainingTime = tmDuration - (Date.now() - tmStartTime);
            if (tmRemainingTime <= 0) {
                tmRemainingTime = 0;
                finishTimer();
            }
        }, 50);
        tmRafId = requestAnimationFrame(updateTimerUI);
        reRenderButtons();
    }
}

// Visual update handler for Timer
function updateTimerUI() {
    if (!tmIsRunning || currentTab !== 'timer') return;
    updateTimerDisplay();
    tmRafId = requestAnimationFrame(updateTimerUI);
}

function updateTimerDisplay() {
    const display = document.getElementById('tm-display');
    const progress = document.getElementById('tm-progress');
    
    if (display) {
        if (tmFinished) {
            display.textContent = '¡Tiempo!';
        } else {
            display.textContent = formatTime(tmRemainingTime, false);
        }
    }
    
    if (progress) {
        const perc = tmDuration > 0 ? (tmDuration - tmRemainingTime) / tmDuration * 100 : 0;
        progress.style.width = `${perc}%`;
    }
}

// --- Pomodoro Logic ---
function setupPomodoro() {
    const btnStart = document.getElementById('pm-start');
    const btnPause = document.getElementById('pm-pause');
    const btnReset = document.getElementById('pm-reset');
    const workInput = document.getElementById('pm-work-input');
    const breakInput = document.getElementById('pm-break-input');

    if (btnStart) btnStart.addEventListener('click', startPomodoro);
    if (btnPause) btnPause.addEventListener('click', pausePomodoro);
    if (btnReset) btnReset.addEventListener('click', resetPomodoro);
    
    if (workInput) {
        workInput.addEventListener('change', (e) => {
            let mins = parseInt(e.target.value);
            if (isNaN(mins) || mins < 1) mins = 1;
            if (mins > 90) mins = 90;
            e.target.value = mins;
            pmWorkDuration = mins * 60 * 1000;
            if (!pmIsRunning && pmPhase === 'work') {
                pmRemainingTime = pmWorkDuration;
                updatePomodoroDisplay();
            }
        });
    }

    if (breakInput) {
        breakInput.addEventListener('change', (e) => {
            let mins = parseInt(e.target.value);
            if (isNaN(mins) || mins < 1) mins = 1;
            if (mins > 30) mins = 30;
            e.target.value = mins;
            pmBreakDuration = mins * 60 * 1000;
            if (!pmIsRunning && pmPhase === 'break') {
                pmRemainingTime = pmBreakDuration;
                updatePomodoroDisplay();
            }
        });
    }

    if (pmIsRunning) {
        pmRafId = requestAnimationFrame(updatePomodoroUI);
    } else {
        updatePomodoroDisplay();
    }
}

function startPomodoro() {
    if (!pmIsRunning && pmRemainingTime > 0) {
        pmIsRunning = true;
        const totalDuration = pmPhase === 'work' ? pmWorkDuration : pmBreakDuration;
        pmStartTime = Date.now() - (totalDuration - pmRemainingTime);
        
        pmInterval = setInterval(() => {
            const currentTotal = pmPhase === 'work' ? pmWorkDuration : pmBreakDuration;
            pmRemainingTime = currentTotal - (Date.now() - pmStartTime);
            
            if (pmRemainingTime <= 0) {
                switchPomodoroPhase();
            }
        }, 50);
        
        pmRafId = requestAnimationFrame(updatePomodoroUI);
        reRenderButtons();
    }
}

function pausePomodoro() {
    if (pmIsRunning) {
        pmIsRunning = false;
        clearInterval(pmInterval);
        cancelAnimationFrame(pmRafId);
        reRenderButtons();
    }
}

function resetPomodoro() {
    pmIsRunning = false;
    clearInterval(pmInterval);
    cancelAnimationFrame(pmRafId);
    
    pmPhase = 'work';
    pmCycle = 1;
    pmRemainingTime = pmWorkDuration;
    
    reRenderButtons();
}

function switchPomodoroPhase() {
    clearInterval(pmInterval);
    
    if (pmPhase === 'work') {
        pmPhase = 'break';
        pmRemainingTime = pmBreakDuration;
    } else {
        pmPhase = 'work';
        pmCycle++;
        pmRemainingTime = pmWorkDuration;
    }
    
    pmStartTime = Date.now();
    pmInterval = setInterval(() => {
        const currentTotal = pmPhase === 'work' ? pmWorkDuration : pmBreakDuration;
        pmRemainingTime = currentTotal - (Date.now() - pmStartTime);
        
        if (pmRemainingTime <= 0) {
            switchPomodoroPhase();
        }
    }, 50);
    
    reRenderButtons();
}

function updatePomodoroUI() {
    if (!pmIsRunning || currentTab !== 'pomodoro') return;
    updatePomodoroDisplay();
    pmRafId = requestAnimationFrame(updatePomodoroUI);
}

function updatePomodoroDisplay() {
    const display = document.getElementById('pm-display');
    const circle = document.getElementById('pm-circle');
    
    if (display) {
        display.textContent = formatTime(pmRemainingTime, false);
    }
    
    if (circle) {
        const totalPhaseDuration = pmPhase === 'work' ? pmWorkDuration : pmBreakDuration;
        const progress = totalPhaseDuration > 0 ? (totalPhaseDuration - pmRemainingTime) / totalPhaseDuration : 0;
        const dasharray = 2 * Math.PI * 90;
        const dashoffset = dasharray * (1 - progress);
        circle.setAttribute('stroke-dashoffset', dashoffset);
    }
}
