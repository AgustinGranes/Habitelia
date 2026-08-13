import { signIn, signUp, signInGoogle, resetPassword } from '../firebase.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';

export function render(props = {}) {
    return `
        <div class="auth-screen page" style="padding: 24px 20px; max-width: 440px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
            <div class="auth-logo" style="text-align: center; margin-bottom: 16px;">
                <div style="font-family: var(--font-serif); font-size: 38px; color: var(--text-primary); letter-spacing: -0.03em;">
                    HABITELIA<span style="color: var(--text-primary);">.</span>
                </div>
            </div>
            <p class="auth-subtitle" style="text-align: center; color: var(--text-secondary); font-size: 14px; margin: 0 0 32px 0;">Construye tu identidad a través de hábitos atómicos</p>
            
            <div class="glass-card auth-card" style="padding: 32px 28px; border-radius: 20px;">
                <div class="auth-switch" style="display: flex; background: var(--bg-primary); padding: 4px; border-radius: 12px; margin-bottom: 24px; border: 1px solid var(--border-subtle);">
                    <button type="button" class="switch-btn active" data-tab="login" style="flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: var(--accent-inverted); background: var(--accent-primary); transition: all 0.2s;">Ingresar</button>
                    <button type="button" class="switch-btn" data-tab="register" style="flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: var(--text-secondary); background: transparent; transition: all 0.2s;">Registrarse</button>
                </div>
                
                <form id="auth-form" class="auth-form">
                    <div class="input-group" id="name-group" style="display: none; margin-bottom: 16px;">
                        <label class="form-label" for="name" style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 13px;">Nombre completo</label>
                        <input type="text" id="name" class="input" placeholder="Tu nombre" style="width: 100%; min-height: 46px;">
                    </div>
                    
                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="form-label" for="email" style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 13px;">Email</label>
                        <input type="email" id="email" class="input" placeholder="tu@email.com" required style="width: 100%; min-height: 46px;">
                    </div>
                    
                    <div class="input-group" style="margin-bottom: 12px;">
                        <label class="form-label" for="password" style="display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 13px;">Contraseña</label>
                        <input type="password" id="password" class="input" placeholder="Min. 6 caracteres" required minlength="6" style="width: 100%; min-height: 46px;">
                    </div>
                    
                    <div id="forgot-password-container" style="text-align: right; margin-bottom: 20px;">
                        <button type="button" id="btn-forgot-password" style="background: none; border: none; color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: underline;">¿Olvidaste tu contraseña?</button>
                    </div>

                    <button type="submit" class="btn-primary" id="submit-btn" style="width: 100%; min-height: 48px; font-size: 14px; margin-bottom: 20px;">Ingresar</button>
                </form>
                
                <div class="auth-divider" style="text-align: center; margin-bottom: 20px; position: relative;">
                    <span style="background: var(--bg-surface); padding: 0 12px; color: var(--text-tertiary); font-size: 12px;">o</span>
                </div>
                
                <button id="google-btn" class="btn-secondary" style="width: 100%; min-height: 46px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    ${iconSVG('user', 18)} Continuar con Google
                </button>
            </div>
        </div>
    `;
}

export function mount() {
    let mode = 'login';

    const switchBtns = document.querySelectorAll('.switch-btn');
    const nameGroup = document.getElementById('name-group');
    const submitBtn = document.getElementById('submit-btn');
    const forgotContainer = document.getElementById('forgot-password-container');
    const authForm = document.getElementById('auth-form');
    const googleBtn = document.getElementById('google-btn');

    switchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--text-secondary)';
            });
            e.target.classList.add('active');
            e.target.style.background = 'var(--accent-primary)';
            e.target.style.color = 'var(--accent-inverted)';

            mode = e.target.dataset.tab;
            if (mode === 'register') {
                if (nameGroup) nameGroup.style.display = 'block';
                if (submitBtn) submitBtn.textContent = 'Crear Cuenta';
                if (forgotContainer) forgotContainer.style.display = 'none';
            } else {
                if (nameGroup) nameGroup.style.display = 'none';
                if (submitBtn) submitBtn.textContent = 'Ingresar';
                if (forgotContainer) forgotContainer.style.display = 'block';
            }
        });
    });

    document.getElementById('btn-forgot-password')?.addEventListener('click', async () => {
        const email = document.getElementById('email')?.value.trim();
        if (!email) {
            showToast('Ingresá tu email para recuperar la contraseña', 'info');
            return;
        }
        const res = await resetPassword(email);
        if (res.success) {
            showToast('Email de recuperación enviado', 'success');
        } else {
            showToast('Error al enviar email: ' + (res.error || ''), 'error');
        }
    });

    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const name = document.getElementById('name')?.value.trim();

        if (!email || !password) return;

        if (mode === 'register') {
            const res = await signUp(email, password, name || 'Usuario');
            if (res.user) {
                await store.saveUserProfile({ email, name: name || 'Usuario', onboardingCompleted: false });
                showToast('Cuenta creada con éxito', 'success');
                navigate('/onboarding');
            } else {
                showToast(res.error || 'Error en el registro', 'error');
            }
        } else {
            const res = await signIn(email, password);
            if (res.user) {
                await store.loadUserData();
                showToast('¡Bienvenido de nuevo!', 'success');
                const state = store.getState();
                const isObs = state.user?.onboardingCompleted === true;
                navigate(isObs ? '/home' : '/onboarding');
            } else {
                showToast(res.error || 'Error al iniciar sesión', 'error');
            }
        }
    });

    googleBtn?.addEventListener('click', async () => {
        const res = await signInGoogle();
        if (res.user) {
            await store.loadUserData();
            showToast('Sesión iniciada con Google', 'success');
            const state = store.getState();
            const isObs = state.user?.onboardingCompleted === true;
            navigate(isObs ? '/home' : '/onboarding');
        } else {
            showToast(res.error || 'Error con Google', 'error');
        }
    });
}

export function unmount() {
}
