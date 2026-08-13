import { store } from '../store.js';
import { navigate } from '../router.js';
import { iconSVG } from '../components/icons.js';

export function render(props = {}) {
    return `
        <div class="onboarding-screen page" id="onboarding-container" style="padding: 32px 20px; max-width: 520px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
            <div class="wizard-progress" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 32px;">
                <div class="wizard-step-indicator active" id="dot-1" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: var(--accent-primary); color: var(--accent-inverted);">1</div>
                <div class="wizard-connector" style="flex: 1; max-width: 40px; height: 2px; background: var(--border-subtle);"></div>
                <div class="wizard-step-indicator" id="dot-2" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: var(--bg-subtle); color: var(--text-secondary); border: 1px solid var(--border-subtle);">2</div>
                <div class="wizard-connector" style="flex: 1; max-width: 40px; height: 2px; background: var(--border-subtle);"></div>
                <div class="wizard-step-indicator" id="dot-3" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: var(--bg-subtle); color: var(--text-secondary); border: 1px solid var(--border-subtle);">3</div>
                <div class="wizard-connector" style="flex: 1; max-width: 40px; height: 2px; background: var(--border-subtle);"></div>
                <div class="wizard-step-indicator" id="dot-4" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: var(--bg-subtle); color: var(--text-secondary); border: 1px solid var(--border-subtle);">4</div>
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
            <div class="glass-card" style="padding: 32px 28px; border-radius: 20px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 4px;">Identidad</div>
                <h1 class="editorial-title" style="font-size: 28px; margin-bottom: 8px;">¿Qué tipo de persona quieres ser?</h1>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; line-height: 1.5;">No pienses en metas finales. Piensa en la identidad que deseas construir.</p>
                
                <textarea id="identity-input" class="input" rows="3" placeholder="Quiero ser alguien que..." style="width: 100%; margin-bottom: 16px; font-size: 14px;"></textarea>
                
                <div class="suggestion-chips" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px;">
                    <span class="chip" style="padding: 6px 12px; cursor: pointer; font-size: 13px; border-radius: 20px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary);">Un corredor constante</span>
                    <span class="chip" style="padding: 6px 12px; cursor: pointer; font-size: 13px; border-radius: 20px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary);">Alguien saludable</span>
                    <span class="chip" style="padding: 6px 12px; cursor: pointer; font-size: 13px; border-radius: 20px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary);">Un lector disciplinado</span>
                    <span class="chip" style="padding: 6px 12px; cursor: pointer; font-size: 13px; border-radius: 20px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary);">Alguien organizado</span>
                </div>
                
                <button class="btn-primary" id="next-btn-1">
                    Siguiente ${iconSVG('arrowRight', 16)}
                </button>
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
            <div class="glass-card" style="padding: 32px 28px; border-radius: 20px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 4px;">Diseño de Hábitos</div>
                <h1 class="editorial-title" style="font-size: 28px; margin-bottom: 8px;">Las 4 Leyes del Cambio de Conducta</h1>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; line-height: 1.5;">El método científico de James Clear para formar hábitos duraderos:</p>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px;">
                    <div style="padding: 12px 16px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">1. Señal</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Hazlo obvio definiendo hora y lugar.</div>
                    </div>
                    <div style="padding: 12px 16px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">2. Anhelo</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Hazlo atractivo vinculando placeres.</div>
                    </div>
                    <div style="padding: 12px 16px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">3. Respuesta</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Hazlo fácil aplicando la regla de los 2 minutos.</div>
                    </div>
                    <div style="padding: 12px 16px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px;">
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">4. Recompensa</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">Hazlo satisfactorio registrando tu racha.</div>
                    </div>
                </div>
                
                <button class="btn-primary" id="next-btn-2">
                    Entendido ${iconSVG('arrowRight', 16)}
                </button>
            </div>
        `;

        document.getElementById('next-btn-2').addEventListener('click', () => {
            currentStep = 3;
            updateWizard();
        });
    }

    function renderStep3() {
        container.innerHTML = `
            <div class="glass-card" style="padding: 32px 28px; border-radius: 20px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 4px;">Responsabilidad</div>
                <h1 class="editorial-title" style="font-size: 28px; margin-bottom: 8px;">Socio Corresponsable</h1>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; line-height: 1.5;">Configura una persona que valide tu progreso y te mantenga firme.</p>

                <div class="form-group" style="margin-bottom: 14px;">
                    <label class="form-label">Nombre del Socio</label>
                    <input type="text" id="partner-name" class="input" placeholder="Ej. Carlos, Mamá..." style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                    <label class="form-label">WhatsApp / Teléfono</label>
                    <input type="tel" id="partner-phone" class="input" placeholder="+54 9 11..." style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 24px;">
                    <label class="form-label">Consecuencia (Contrato)</label>
                    <input type="text" id="partner-contract" class="input" placeholder="Ej. Pagar $500 si falto 2 días" style="width: 100%;">
                </div>

                <div style="display: flex; gap: 12px;">
                    <button class="btn-secondary" id="skip-btn-3" style="flex: 1;">Omitir</button>
                    <button class="btn-primary" id="next-btn-3" style="flex: 2;">Guardar Socio</button>
                </div>
            </div>
        `;

        const savePartner = (enabled = true) => {
            const name = document.getElementById('partner-name')?.value.trim();
            const phone = document.getElementById('partner-phone')?.value.trim();
            const contract = document.getElementById('partner-contract')?.value.trim();

            store.saveUserProfile({
                partner: { enabled, name, phone, contract },
                onboardingCompleted: true
            });
            currentStep = 4;
            updateWizard();
        };

        document.getElementById('next-btn-3').addEventListener('click', () => savePartner(true));
        document.getElementById('skip-btn-3').addEventListener('click', () => savePartner(false));
    }

    function renderStep4() {
        container.innerHTML = `
            <div class="glass-card" style="padding: 36px 28px; border-radius: 20px; text-align: center;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--accent-primary); color: var(--accent-inverted); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                    ${iconSVG('check', 24)}
                </div>
                <h1 class="editorial-title" style="font-size: 32px; margin-bottom: 8px;">Todo está listo.</h1>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; line-height: 1.5;">
                    Cada acción que tomas es un voto a favor de la persona en la que deseas convertirte.
                </p>
                
                <button class="btn-primary" id="finish-btn" style="min-height: 50px;">
                    Comenzar mi sistema ${iconSVG('arrowRight', 16)}
                </button>
            </div>
        `;

        document.getElementById('finish-btn').addEventListener('click', () => {
            store.saveUserProfile({ onboardingCompleted: true });
            navigate('/home');
        });
    }

    function updateWizard() {
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`dot-${i}`);
            if (dot) {
                if (i === currentStep) {
                    dot.style.background = 'var(--accent-primary)';
                    dot.style.color = 'var(--accent-inverted)';
                } else if (i < currentStep) {
                    dot.style.background = 'var(--bg-subtle)';
                    dot.style.color = 'var(--text-primary)';
                } else {
                    dot.style.background = 'var(--bg-subtle)';
                    dot.style.color = 'var(--text-secondary)';
                }
            }
        }

        if (currentStep === 1) renderStep1();
        else if (currentStep === 2) renderStep2();
        else if (currentStep === 3) renderStep3();
        else if (currentStep === 4) renderStep4();
    }

    updateWizard();
}

export function unmount() {
}
