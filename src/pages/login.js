import { signIn, signUp, signInGoogle } from '../firebase.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function render(props = {}) {
    return `
        <div class="auth-screen page">
            <div class="auth-logo">
                <div class="logo-circle">H</div>
            </div>
            <h1 class="auth-title">Habitelia</h1>
            <p class="auth-subtitle">Construí la mejor versión de vos mismo</p>
            
            <div class="glass-card auth-card">
                <div class="auth-switch">
                    <button type="button" class="switch-btn active" data-tab="login">Ingresar</button>
                    <button type="button" class="switch-btn" data-tab="register">Registrarse</button>
                </div>
                
                <form id="auth-form" class="auth-form">
                    <div class="input-group" id="name-group" style="display: none;">
                        <label class="form-label" for="name">Nombre</label>
                        <input type="text" id="name" class="input" placeholder="Tu nombre">
                    </div>
                    
                    <div class="input-group">
                        <label class="form-label" for="email">Email</label>
                        <input type="email" id="email" class="input" placeholder="tu@email.com" required>
                    </div>
                    
                    <div class="input-group">
                        <label class="form-label" for="password">Contraseña</label>
                        <input type="password" id="password" class="input" placeholder="Min. 6 caracteres" required minlength="6">
                    </div>
                    
                    <button type="submit" class="btn-primary" id="submit-btn">Ingresar</button>
                </form>
                
                <div class="auth-divider">
                    <span>o</span>
                </div>
                
                <button id="google-btn" class="auth-google-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
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

    switchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
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
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Cargando...';

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password, name);
            }
            handleAuthSuccess();
        } catch (error) {
            showToast(error.message || 'Error de autenticación', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isLogin ? 'Ingresar' : 'Registrarse';
        }
    });

    googleBtn.addEventListener('click', async () => {
        try {
            await signInGoogle();
            handleAuthSuccess();
        } catch (error) {
            showToast('Error al iniciar sesión con Google', 'error');
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
