import { store } from '../store.js';
import { auth, getPublicUserData, addFriendToCloud, removeFriendFromCloud, getFriendsFromCloud } from '../firebase.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { getCategoryForTeam } from '../driverEngine.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

let friendsDataList = [];
let loadingFriends = false;

export function render(props = {}) {
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid || 'guest';
  const shareableUrl = `${window.location.origin}${window.location.pathname}#/friends?invite=${currentUid}`;

  return `
    <div class="page friends-page" style="padding: 24px 20px 100px 20px; max-width: 640px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      
      <!-- Editorial Header -->
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Amigos<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Red social de disciplina y competencia de pilotos</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <!-- Personal Invite Link Glass Card -->
      <div class="glass-card" style="padding: 22px 20px; border-radius: 20px; margin-bottom: 24px; background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle);">
        <div style="font-weight: 700; font-size: 14px; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          ${iconSVG('share', 16)} Tu Enlace de Invitación
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">
          Compartí este enlace con tus amigos para ver sus rachas, seguir el rendimiento de sus pilotos F1 y auditar su disciplina.
        </p>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" readonly value="${shareableUrl}" id="share-link-input" class="input" style="flex: 1; min-height: 42px; font-size: 12.5px; background: var(--bg-primary); color: var(--text-secondary); text-overflow: ellipsis;">
          <button id="copy-link-btn" class="btn-primary" style="width: auto; padding: 0 16px; min-height: 42px; font-size: 13px; white-space: nowrap; margin: 0; flex-shrink: 0;">
            ${iconSVG('share', 14)} Copiar
          </button>
        </div>
      </div>

      <!-- Add Friend Bar -->
      <div class="glass-card" style="padding: 18px 20px; border-radius: 18px; margin-bottom: 28px; background: var(--bg-surface);">
        <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          ${iconSVG('userPlus', 15)} Agregar Amigo Manualmente
        </div>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="add-friend-input" class="input" placeholder="Pegá el ID o Enlace de tu amigo..." style="flex: 1; min-height: 44px; font-size: 13px;">
          <button id="add-friend-btn" class="btn-secondary" style="width: auto; padding: 0 18px; min-height: 44px; font-size: 13px; white-space: nowrap; margin: 0; flex-shrink: 0;">
            Agregar
          </button>
        </div>
      </div>

      <!-- Friends List Container -->
      <div id="friends-list-container">
        ${renderFriendsList()}
      </div>

    </div>
  `;
}

function renderFriendsList() {
  if (loadingFriends) {
    return `
      <div class="glass-card" style="text-align: center; padding: 40px 20px; border-radius: 20px; color: var(--text-secondary); font-size: 14px;">
        Cargando tus amigos desde la nube...
      </div>
    `;
  }

  if (friendsDataList.length === 0) {
    return `
      <div class="glass-card" style="text-align: center; padding: 48px 24px; border-radius: 20px; border: 1px solid var(--border-subtle);">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--text-secondary);">
          ${iconSVG('users', 24)}
        </div>
        <h3 class="editorial-title" style="font-size: 22px; margin-bottom: 8px;">Aún no tienes amigos agregados</h3>
        <p style="color: var(--text-secondary); font-size: 13.5px; max-width: 340px; margin: 0 auto 20px auto; line-height: 1.5;">
          Copiá tu enlace de invitación y enviáselo a tus compañeros de hábitos para competir y auditar su progreso.
        </p>
      </div>
    `;
  }

  return friendsDataList.map(friend => {
    const friendName = friend.user?.name || friend.user?.displayName || 'Amigo Habitelia';
    const friendIdentity = friend.user?.identity || 'Persona disciplinada';
    const driver = friend.driverProfile;
    const hasDriver = driver && driver.active;
    const incidents = friend.incidents || [];
    const maxStreak = (friend.habits || []).reduce((max, h) => Math.max(max, h.streak || 0), 0);

    const category = hasDriver ? getCategoryForTeam(driver.team || 'Williams Racing') : 'F4';

    return `
      <div class="glass-card friend-card" style="padding: 24px; border-radius: 24px; margin-bottom: 20px; border: 1px solid var(--border-subtle); background: var(--bg-surface);">
        
        <!-- Friend Header Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: var(--text-primary);">
              ${friendName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 17px; color: var(--text-primary);">${friendName}</div>
              <div style="font-size: 12.5px; color: var(--text-secondary); font-style: italic;">"${friendIdentity}"</div>
            </div>
          </div>

          <button class="btn-remove-friend" data-uid="${friend.uid}" title="Eliminar amigo" style="background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 6px;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <!-- Discipline Streak Badge -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            ${iconSVG('flame', 15)} Racha Máxima: ${maxStreak} días
          </div>
        </div>

        <!-- Friend Pilot Career Card (If Active) -->
        ${hasDriver ? `
          <div style="padding: 16px; border-radius: 16px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); margin-bottom: 18px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                ${iconSVG('helmet', 18)}
                <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary);">PILOTO F1</span>
              </div>
              <div style="padding: 3px 8px; border-radius: 6px; background: var(--text-primary); color: var(--bg-primary); font-size: 11px; font-weight: 900;">
                ${category}
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 28px; font-weight: 900; color: var(--text-primary); line-height: 1;">${driver.ovr || 50} <span style="font-size: 12px; font-weight: 700; color: var(--text-tertiary);">OVR</span></div>
                <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-top: 4px;">${driver.team || 'Williams Racing'}</div>
              </div>
              <div style="display: flex; gap: 14px; text-align: center;">
                <div>
                  <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">PTS</div>
                  <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">${driver.points || 0}</div>
                </div>
                <div>
                  <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">VCT</div>
                  <div style="font-size: 15px; font-weight: 800; color: #D69E2E;">${driver.wins || 0}</div>
                </div>
                <div>
                  <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">POD</div>
                  <div style="font-size: 15px; font-weight: 800; color: #7CDEDC;">${driver.podiums || 0}</div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Uncompleted Habits / Incident Log Section -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            ${iconSVG('alert', 14)} Historial de Incidentes y Hábitos No Cumplidos (${incidents.length})
          </div>

          ${incidents.length === 0 ? `
            <div style="font-size: 12.5px; color: var(--text-secondary); font-style: italic; background: var(--bg-primary); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle);">
              Sin incidentes registrados. ¡Disciplina perfecta!
            </div>
          ` : `
            <div style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
              ${incidents.map(inc => `
                <div style="font-size: 12.5px; color: var(--text-primary); background: var(--bg-primary); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
                  <span>El <strong>${inc.date}</strong> ${friendName} no completó <strong>"${inc.habitName}"</strong></span>
                  <span style="font-size: 10px; font-weight: 700; color: #E53E3E; background: rgba(229,62,62,0.15); padding: 2px 6px; border-radius: 4px;">NO CUMPLIDO</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    `;
  }).join('');
}

async function loadFriendsData() {
  if (!auth.currentUser) return;
  loadingFriends = true;
  const container = document.getElementById('friends-list-container');
  if (container) container.innerHTML = renderFriendsList();

  try {
    const friendDocs = await getFriendsFromCloud();
    const loadedData = [];
    for (const doc of friendDocs) {
      const friendUid = doc.id;
      const data = await getPublicUserData(friendUid);
      if (data) {
        loadedData.push(data);
      }
    }
    friendsDataList = loadedData;
  } catch (e) {
    console.error('Error loading friends:', e);
  } finally {
    loadingFriends = false;
    if (container) container.innerHTML = renderFriendsList();
    bindFriendActionEvents();
  }
}

function bindFriendActionEvents() {
  document.querySelectorAll('.btn-remove-friend').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const uid = e.currentTarget.dataset.uid;
      if (confirm('¿Estás seguro de que querés eliminar a este amigo de tu lista?')) {
        await removeFriendFromCloud(uid);
        showToast('Amigo eliminado', 'info');
        loadFriendsData();
      }
    });
  });
}

export function mount(params = {}) {
  // Sidebar setup
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

  // Copy Invite Link Handler
  document.getElementById('copy-link-btn')?.addEventListener('click', () => {
    const input = document.getElementById('share-link-input');
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        showToast('¡Enlace de invitación copiado al portapapeles!', 'success');
      }).catch(() => {
        showToast('Enlace seleccionado. Copialo manualmente.', 'info');
      });
    }
  });

  // Manual Add Friend Handler
  document.getElementById('add-friend-btn')?.addEventListener('click', async () => {
    const rawVal = document.getElementById('add-friend-input')?.value.trim();
    if (!rawVal) {
      showToast('Ingresá el ID o Enlace de tu amigo', 'error');
      return;
    }

    let targetUid = rawVal;
    if (rawVal.includes('invite=')) {
      targetUid = rawVal.split('invite=')[1].split('&')[0];
    }

    if (targetUid === auth.currentUser?.uid) {
      showToast('No podés agregarte a vos mismo como amigo', 'error');
      return;
    }

    showToast('Buscando y agregando amigo...', 'info');
    await addFriendToCloud(targetUid);
    showToast('¡Amigo agregado con éxito!', 'success');
    document.getElementById('add-friend-input').value = '';
    loadFriendsData();
  });

  // Handle URL Query Invite Parameter (e.g. #/friends?invite=UID)
  if (params && params.invite) {
    const inviteUid = params.invite;
    if (inviteUid !== auth.currentUser?.uid) {
      addFriendToCloud(inviteUid).then(() => {
        showToast('¡Te has conectado con tu amigo a través del enlace!', 'success');
        loadFriendsData();
      });
    }
  } else {
    loadFriendsData();
  }
}

export function unmount() {
}
