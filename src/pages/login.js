import { signIn, signUp, signInGoogle, resetPassword } from '../firebase.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function render(props = {}) {
    return `
        <div class="auth-screen page" style="padding: 24px 20px; max-width: 440px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
            <div class="auth-logo" style="text-align: center; margin-bottom: 12px;">
                <div class="logo-circle" style="width: 64px; height: 64px; background: var(--accent-gradient); color: #0D0D0F; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-family: 'Playfair Display', serif; font-weight: 800; margin: 0 auto; box-shadow: 0 0 24px rgba(245,197,24,0.4);">H</div>
            </div>
            <h1 class="auth-title" style="text-align: center; font-family: 'Playfair Display', serif; font-size: 32px; color: #fff; margin: 0 0 4px 0;">Habitelia</h1>
            <p class="auth-subtitle" style="text-align: center; color: var(--text-muted); font-size: 14px; margin: 0 0 28px 0;">Construí la mejor versión de vos mismo</p>
            
            <div class="glass-card auth-card" style="padding: 28px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.12);">
                <div class="auth-switch" style="display: flex; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 14px; margin-bottom: 24px;">
                    <button type="button" class="switch-btn active" data-tab="login" style="flex: 1; padding: 10px; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; color: #fff; background: var(--accent-gradient); transition: all 0.2s;">Ingresar</button>
                    <button type="button" class="switch-btn" data-tab="register" style="flex: 1; padding: 10px; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; color: var(--text-muted); background: transparent; transition: all 0.2s;">Registrarse</button>
                </div>
                
                <form id="auth-form" class="auth-form">
                    <div class="input-group" id="name-group" style="display: none; margin-bottom: 16px;">
                        <label class="form-label" for="name" style="display: block; font-weight: 600; margin-bottom: 6px; color: #fff; font-size: 13px;">Nombre completo</label>
                        <input type="text" id="name" class="input" placeholder="Tu nombre" style="width: 100%; min-height: 46px;">
                    </div>
                    
                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="form-label" for="email" style="display: block; font-weight: 600; margin-bottom: 6px; color: #fff; font-size: 13px;">Email</label>
                        <input type="email" id="email" class="input" placeholder="tu@email.com" required style="width: 100%; min-height: 46px;">
                    </div>
                    
                    <div class="input-group" style="margin-bottom: 12px;">
                        <label class="form-label" for="password" style="display: block; font-weight: 600; margin-bottom: 6px; color: #fff; font-size: 13px;">Contraseña</label>
                        <input type="password" id="password" class="input" placeholder="Min. 6 caracteres" required minlength="6" style="width: 100%; min-height: 46px;">
                    </div>
                    
                    <div id="forgot-password-container" style="text-align: right; margin-bottom: 20px;">
                        <button type="button" id="btn-forgot-password" style="background: none; border: none; color: #F5C518; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline;">¿Olvidaste tu contraseña?</button>
                    </div>

                    <button type="submit" class="btn-primary" id="submit-btn" style="width: 100%; min-height: 48px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-bottom: 20px;">Ingresar</button>
                </form>
                
                <div class="auth-divider" style="text-align: center; margin-bottom: 20px; position: relative;">
                    <span style="background: #141419; padding: 0 10px; color: var(--text-muted); font-size: 12px;">o</span>
                </div>
                
                <button id="google-btn" class="auth-google-btn" style="width: 100%; min-height: 48px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer;">
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                        </g>
                    </svg>
                    Continuar con Google
                </button>
            </div>
        </div>
    `;
}

export function mount() {
    let isLogin = true;
    const form = document.getElementById('auth-form');
    const switchBtns = document.querySelectorAll('.switch-btn');
    const nameGroup = document.getElementById('name-group');
    const nameInput = document.getElementById('name');
    const submitBtn = document.getElementById('submit-btn');
    const googleBtn = document.getElementById('google-btn');
    const forgotBtn = document.getElementById('btn-forgot-password');

    switchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchBtns.forEach(b => {
                b.classList.remove('active');
                b.style.color = 'var(--text-muted)';
                b.style.background = 'transparent';
            });
            e.target.classList.add('active');
            e.target.style.color = '#fff';
            e.target.style.background = 'var(--accent-gradient)';
            
            const tab = e.target.dataset.tab;
            if (tab === 'login') {
                isLogin = true;
                nameGroup.style.display = 'none';
                nameInput.removeAttribute('required');
                submitBtn.textContent = 'Ingresar';
            } else {
                isLogin = false;
                nameGroup.style.display = 'block';
                nameInput.setAttribute('required', 'true');
                submitBtn.textContent = 'Registrarse';
            }
        });
    });

    forgotBtn?.addEventListener('click', async () => {
        const emailInput = document.getElementById('email');
        const email = emailInput?.value.trim() || prompt('Ingresá tu correo electrónico para enviar el enlace de recuperación:');
        if (!email) return;

        try {
            await resetPassword(email);
            showToast(`Correo enviado a ${email}. Revisá tu bandeja de entrada.`, 'success');
        } catch (err) {
            showToast(err.message || 'Error al enviar correo de recuperación', 'error');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = isLogin ? null : document.getElementById('name').value;
        
        if (password.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Cargando...';

        try {
            if (isLogin) {
                const user = await signIn(email, password);
                store.saveUserProfile({ email, name: user.displayName || email.split('@')[0] });
            } else {
                const user = await signUp(email, password, name);
                store.saveUserProfile({ email, name: name || 'Viajero' });
            }
            showToast('¡Sesión iniciada con éxito! 🎉', 'success');
            handleAuthSuccess();
        } catch (error) {
            showToast(error.message || 'Error de autenticación', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isLogin ? 'Ingresar' : 'Registrarse';
        }
    });

    googleBtn.addEventListener('click', async () => {
        try {
            const user = await signInGoogle();
            store.saveUserProfile({ email: user.email, name: user.displayName || 'Viajero' });
            showToast('¡Sesión iniciada con Google! 🎉', 'success');
            handleAuthSuccess();
        } catch (error) {
            showToast(error.message || 'Error con Google', 'error');
        }
    });
}

function handleAuthSuccess() {
    const state = store.getState();
    if (state.user?.onboardingCompleted) {
        navigate('/home');
    } else {
        navigate('/onboarding');
    }
}

export function unmount() {
    // cleanup
}
