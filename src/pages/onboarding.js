import { store } from '../store.js';
import { navigate } from '../router.js';

export function render(props = {}) {
    return `
        <div class="onboarding-screen page" id="onboarding-container">
            <div class="wizard-progress">
                <div class="wizard-step-indicator active" id="dot-1"></div>
                <div class="wizard-connector"></div>
                <div class="wizard-step-indicator" id="dot-2"></div>
                <div class="wizard-connector"></div>
                <div class="wizard-step-indicator" id="dot-3"></div>
            </div>
            <div id="step-content"></div>
        </div>
    `;
}

export function mount() {
    let currentStep = 1;
    const container = document.getElementById('step-content');
    
    function renderStep1() {
        container.innerHTML = `
            <div class="step-container slide-in">
                <h1 class="onboarding-question" style="font-family: 'Playfair Display', serif; font-size: 32px; margin-bottom: 10px;">¿Qué tipo de persona querés ser?</h1>
                <p class="auth-subtitle" style="margin-bottom: 30px;">No pienses en metas. Pensá en quién querés convertirte.</p>
                
                <textarea id="identity-input" class="input" rows="4" placeholder="Quiero ser alguien que..."></textarea>
                
                <div class="suggestion-chips" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:15px; margin-bottom:30px;">
                    <span class="chip glass-card" style="padding:8px 12px; cursor:pointer; font-size:14px; border-radius:20px;">Un corredor</span>
                    <span class="chip glass-card" style="padding:8px 12px; cursor:pointer; font-size:14px; border-radius:20px;">Alguien saludable</span>
                    <span class="chip glass-card" style="padding:8px 12px; cursor:pointer; font-size:14px; border-radius:20px;">Un lector</span>
                    <span class="chip glass-card" style="padding:8px 12px; cursor:pointer; font-size:14px; border-radius:20px;">Alguien disciplinado</span>
                    <span class="chip glass-card" style="padding:8px 12px; cursor:pointer; font-size:14px; border-radius:20px;">Un buen estudiante</span>
                    <span class="chip glass-card" style="padding:8px 12px; cursor:pointer; font-size:14px; border-radius:20px;">Alguien organizado</span>
                </div>
                
                <button class="btn-primary" id="next-btn-1">Siguiente</button>
            </div>
        `;

        const textarea = document.getElementById('identity-input');
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                textarea.value = `Quiero ser ${chip.textContent.toLowerCase()}`;
            });
        });

        document.getElementById('next-btn-1').addEventListener('click', () => {
            const identity = textarea.value.trim();
            if (identity) {
                store.saveUserProfile({ identity, onboardingCompleted: true });
                currentStep = 2;
                updateWizard();
            }
        });
    }

    function renderStep2() {
        container.innerHTML = `
            <div class="step-container fade-in" style="width: 100%; max-width: 840px; margin: 0 auto; text-align: center;">
                <h2 class="auth-title" style="font-size: 30px; margin-bottom: 8px;">Las 4 Leyes del Cambio</h2>
                <p class="auth-subtitle" style="margin-bottom: 32px;">Cada hábito que crees en Habitelia seguirá este ciclo fundamental</p>
                
                <div class="onboarding-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 36px; text-align: center;">
                    
                    <div class="glass-card law-vertical-card" style="padding: 24px 16px; display: flex; flex-direction: column; align-items: center; border-radius: 18px; border-top: 3px solid #F5C518;">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #F5C518; background: rgba(245,197,24,0.12); padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">Ley 1</span>
                        <div style="font-size: 36px; margin-bottom: 12px; line-height: 1;">🔔</div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 18px; margin: 0 0 4px 0; color: #fff;">Hacerlo Obvio</h3>
                        <span style="font-size: 12px; color: #F5C518; font-weight: 600; margin-bottom: 12px;">(Señal)</span>
                        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin: 0;">Definí cuándo, dónde y después de qué hábito actuarás.</p>
                    </div>

                    <div class="glass-card law-vertical-card" style="padding: 24px 16px; display: flex; flex-direction: column; align-items: center; border-radius: 18px; border-top: 3px solid #F5C518;">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #F5C518; background: rgba(245,197,24,0.12); padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">Ley 2</span>
                        <div style="font-size: 36px; margin-bottom: 12px; line-height: 1;">✨</div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 18px; margin: 0 0 4px 0; color: #fff;">Hacerlo Atractivo</h3>
                        <span style="font-size: 12px; color: #F5C518; font-weight: 600; margin-bottom: 12px;">(Anhelo)</span>
                        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin: 0;">Vinculá el hábito con algo que disfrutás.</p>
                    </div>

                    <div class="glass-card law-vertical-card" style="padding: 24px 16px; display: flex; flex-direction: column; align-items: center; border-radius: 18px; border-top: 3px solid #F5C518;">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #F5C518; background: rgba(245,197,24,0.12); padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">Ley 3</span>
                        <div style="font-size: 36px; margin-bottom: 12px; line-height: 1;">🎯</div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 18px; margin: 0 0 4px 0; color: #fff;">Hacerlo Sencillo</h3>
                        <span style="font-size: 12px; color: #F5C518; font-weight: 600; margin-bottom: 12px;">(Respuesta)</span>
                        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin: 0;">Empezá con 2 minutos. Lo ridículo sostenido se vuelve imparable.</p>
                    </div>

                    <div class="glass-card law-vertical-card" style="padding: 24px 16px; display: flex; flex-direction: column; align-items: center; border-radius: 18px; border-top: 3px solid #F5C518;">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #F5C518; background: rgba(245,197,24,0.12); padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">Ley 4</span>
                        <div style="font-size: 36px; margin-bottom: 12px; line-height: 1;">🏆</div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 18px; margin: 0 0 4px 0; color: #fff;">Hacerlo Satisfactorio</h3>
                        <span style="font-size: 12px; color: #F5C518; font-weight: 600; margin-bottom: 12px;">(Recompensa)</span>
                        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin: 0;">Medí tu progreso. Nunca rompas la cadena.</p>
                    </div>

                </div>
                
                <button class="btn-primary" id="next-btn-2" style="max-width: 320px; margin: 0 auto;">Siguiente</button>
            </div>
        `;
        
        document.getElementById('next-btn-2').addEventListener('click', () => {
            currentStep = 3;
            updateWizard();
        });
    }

    function renderStep3() {
        container.innerHTML = `
            <div class="step-container slide-in" style="text-align:center;">
                <h1 class="auth-title" style="margin-bottom: 10px;">¡Creá tu primer hábito!</h1>
                <p class="auth-subtitle">Empezamos con algo pequeño</p>
                
                <div style="margin-top:40px; display:flex; flex-direction:column; gap:15px;">
                    <button class="btn-primary" id="create-habit-btn">Crear mi primer hábito</button>
                    <button class="btn-ghost" id="explore-btn" style="background:transparent; border:none; color:#F5C518; font-weight:bold; cursor:pointer; padding: 12px; width: 100%;">Explorar primero</button>
                </div>
            </div>
        `;

        document.getElementById('create-habit-btn').addEventListener('click', () => {
            store.saveUserProfile({ onboardingCompleted: true });
            navigate('/habit/new');
        });
        document.getElementById('explore-btn').addEventListener('click', () => {
            store.saveUserProfile({ onboardingCompleted: true });
            navigate('/home');
        });
    }

    function updateWizard() {
        document.querySelectorAll('.wizard-step-indicator').forEach((dot, index) => {
            if (index < currentStep) dot.classList.add('active');
            else dot.classList.remove('active');
        });
        
        if (currentStep === 1) renderStep1();
        else if (currentStep === 2) renderStep2();
        else if (currentStep === 3) renderStep3();
    }

    updateWizard();
}

export function unmount() {}
