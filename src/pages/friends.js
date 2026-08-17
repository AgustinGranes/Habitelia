import { store } from '../store.js';
import { auth, getPublicUserData, addFriendToCloud, removeFriendFromCloud, getFriendsFromCloud, updateFriendAliasInCloud } from '../firebase.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { getTeamForOVR, getCategoryForTeam, calculateMarketValue, getOVRColor, TEAMS_DATA } from '../driverEngine.js';
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
      <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; width: 100%;">
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; margin-top: 2px;">
          ${iconSVG('menu', 20)}
        </button>
        <div style="flex: 1; min-width: 0;">
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Amigos<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Red social de disciplina y competencia de pilotos</div>
        </div>
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
    const originalName = friend.user?.name || friend.user?.displayName || 'Amigo Habitelia';
    const alias = friend.alias || '';
    const friendName = alias ? alias : originalName;
    const friendIdentity = friend.user?.identity || 'Persona disciplinada';
    const driver = friend.driverProfile;
    const hasDriver = driver && driver.active;
    const visibleHabits = (friend.habits || []).filter(h => !h.isPrivate && !h.private);
    const incidents = (friend.incidents || []).filter(inc => {
      const h = (friend.habits || []).find(item => item.id === inc.habitId || item.name === inc.habitName);
      return !h || (!h.isPrivate && !h.private);
    });
    const maxStreak = visibleHabits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

    const category = hasDriver ? getCategoryForTeam(driver.team || 'Williams Racing') : 'F4';

    return `
      <div class="glass-card friend-card" style="padding: 24px; border-radius: 24px; margin-bottom: 20px; border: 1px solid var(--border-subtle); background: var(--bg-surface);">
        
        <!-- Friend Header Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
            <div style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; flex-shrink: 0; background: var(--bg-subtle); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: var(--text-primary);">
              ${friendName.charAt(0).toUpperCase()}
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 17px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${friendName} ${alias ? `<span style="font-size: 12px; color: var(--text-secondary); font-weight: 400;">(${originalName})</span>` : ''}
              </div>
              <div style="font-size: 12.5px; color: var(--text-secondary); font-style: italic;">"${friendIdentity}"</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <button class="btn-edit-alias-friend" data-uid="${friend.uid}" data-name="${originalName}" data-alias="${alias || ''}" title="Editar alias" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 6px;">
              ${iconSVG('pencil', 16)}
            </button>
            <button class="btn-remove-friend" data-uid="${friend.uid}" title="Eliminar amigo" style="background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 6px;">
              ${iconSVG('x', 16)}
            </button>
          </div>
        </div>

        <!-- Discipline Streak Badge -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            ${iconSVG('flame', 15)} Racha Máxima: ${maxStreak} días
          </div>
        </div>

        <!-- Friend Pilot Career Card (If Active) -->
        ${hasDriver ? (() => {
          const ovr = driver.ovr || 50;
          const teamKey = getTeamForOVR(ovr);
          const teamData = TEAMS_DATA[teamKey] || { name: 'Apex', category: 'F4' };
          const category = teamData.category;
          const teamName = teamData.name;
          const ovrBgColor = getOVRColor(ovr);
          const isDarkOvrText = ovr >= 90;
          const marketValue = calculateMarketValue(ovr, driver.titlesDriver || 0, driver.titlesConstructor || 0);
          const surname = driver.surname || friendName.split(' ')[0].toUpperCase();

          return `
            <div class="glass-card" style="padding: 20px 18px; border-radius: 22px; border: 1px solid var(--border-subtle); background: #0A0A0A; box-shadow: 0 12px 30px rgba(0,0,0,0.8); position: relative; margin-bottom: 20px;">
              
              <!-- Top Row: OVR Left + Info/Stats Right -->
              <div style="display: flex; gap: 12px; margin-bottom: 16px; align-items: stretch;">
                
                <!-- OVR Box -->
                <div style="width: 84px; border-radius: 16px; background: ${ovrBgColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 4px; flex-shrink: 0;">
                  <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: ${isDarkOvrText ? '#0F172A' : '#FFFFFF'};">OVR</span>
                  <span style="font-size: 40px; font-weight: 900; line-height: 1; margin-top: 2px; color: ${isDarkOvrText ? '#0F172A' : '#FFFFFF'}; font-family: var(--font-sans);">${ovr}</span>
                </div>

                <!-- Right Column: Pills + Stats -->
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                  
                  <!-- Pills Row -->
                  <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                    <div style="padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 12px;">
                      ${driver.flag || 'AR'}
                    </div>
                    <div style="padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 11px; font-weight: 600; color: var(--text-primary);">
                      Valor <span style="color: var(--text-secondary);">€${marketValue}M</span>
                    </div>
                    <div style="padding: 4px 10px; border-radius: 8px; background: #FFFFFF; color: #000000; font-size: 12px; font-weight: 800;">
                      #${driver.number || 86}
                    </div>
                    <div style="padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 11px; font-weight: 600; color: var(--text-secondary);">
                      ${driver.code || 'PIL'}
                    </div>
                  </div>

                  <!-- Stats Bar -->
                  <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 6px 12px; margin-top: 6px;">
                    <div style="text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: var(--text-tertiary);">TEMP</div>
                      <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${driver.seasons || 1}</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: var(--text-tertiary);">VCT</div>
                      <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${driver.wins || 0}</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: var(--text-tertiary);">POD</div>
                      <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${driver.podiums || 0}</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: var(--text-tertiary);">PTS</div>
                      <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${driver.points || 0}</div>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Surname Centered -->
              <div style="text-align: center; font-size: 22px; font-weight: 900; letter-spacing: 0.12em; color: #FFFFFF; text-transform: uppercase; margin: 10px 0 14px 0;">
                ${surname}
              </div>

              <!-- Trayectoria Box -->
              <div style="padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); text-align: center;">
                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-tertiary); margin-bottom: 8px;">TRAYECTORIA</div>
                <div style="display: inline-block; padding: 4px 14px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid var(--border-subtle); font-size: 13px; font-weight: 900; color: #FFFFFF; margin-bottom: 4px;">
                  ${category}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${teamName}</div>
              </div>

            </div>
          `;
        })() : ''}

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

        <!-- Registered Habits & Chains Section -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 14px;">
          <details style="cursor: pointer;">
            <summary style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); display: flex; align-items: center; justify-content: space-between; outline: none;">
              <span style="display: flex; align-items: center; gap: 6px;">
                ${iconSVG('chain', 14)} Hábitos Registrados y Cadenas (${visibleHabits.length})
              </span>
              <span style="font-size: 11px; color: var(--text-secondary); font-weight: 400;">Ver lista</span>
            </summary>

            <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
              ${visibleHabits.length === 0 ? `
                <div style="font-size: 12.5px; color: var(--text-secondary); font-style: italic; background: var(--bg-primary); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle);">
                  Este usuario no tiene hábitos públicos registrados.
                </div>
              ` : visibleHabits.map(h => {
                const streak = h.streak || 0;
                let freqText = 'Todos los días';
                if (h.frequency && h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
                  freqText = `Días: ${h.frequency.days.join(', ').toUpperCase()}`;
                }
                return `
                  <div class="friend-habit-row" data-friend-name="${friendName}" data-habit-id="${h.id}" style="background: var(--bg-primary); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: background 0.15s ease; user-select: none;">
                    <div>
                      <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">${h.name}</div>
                      <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">Frecuencia: ${freqText}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                      <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 4px 10px; border-radius: 14px; font-size: 12px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 5px; flex-shrink: 0; height: 26px; box-sizing: border-box;">
                        ${iconSVG('flame', 13)} ${streak}d
                      </div>
                      <button class="btn-ghost btn-view-friend-chain" style="padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 11.5px; font-weight: 600; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px; height: 26px; box-sizing: border-box; touch-action: manipulation;">
                        ${iconSVG('chain', 12)} Ver
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </details>
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
        data.alias = doc.alias || '';
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
  document.querySelectorAll('.btn-edit-alias-friend').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const uid = e.currentTarget.dataset.uid;
      const currentName = e.currentTarget.dataset.name;
      const currentAlias = e.currentTarget.dataset.alias;
      const newAlias = prompt(`Ingresá un alias/apodo para "${currentName}":`, currentAlias || currentName);
      if (newAlias !== null) {
        const aliasValue = newAlias.trim();
        await updateFriendAliasInCloud(uid, aliasValue);
        showToast('Alias de amigo actualizado', 'success');
        
        const friend = friendsDataList.find(f => f.uid === uid);
        if (friend) friend.alias = aliasValue;
        
        const container = document.getElementById('friends-list-container');
        if (container) container.innerHTML = renderFriendsList();
        bindFriendActionEvents();
      }
    });
  });

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

  document.querySelectorAll('.friend-habit-row').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const friendName = row.dataset.friendName;
      const habitId = row.dataset.habitId;
      const friend = friendsDataList.find(f => {
        const originalName = f.user?.name || f.user?.displayName || 'Amigo Habitelia';
        const name = f.alias ? f.alias : originalName;
        return name === friendName;
      });
      if (!friend) return;
      const habit = (friend.habits || []).find(h => h.id === habitId);
      if (!habit) return;
      showFriendHabitChainModal(friendName, habit);
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

function showFriendHabitChainModal(friendName, habit, year = new Date().getFullYear(), month = new Date().getMonth()) {
  document.getElementById('friend-chain-modal')?.remove();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const isDaily = !habit?.frequency || habit.frequency.type === 'daily';
  const scheduledDays = isDaily ? dayKeys : (habit.frequency.days || dayKeys);

  const daysData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dayNamesShort[dateObj.getDay()];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = habit?.completions?.[dateStr];
    const isCompletedFull = status === 'completed';
    const isCompleted2Min = status === 'completed_2min';
    const dayKey = dayKeys[dateObj.getDay()];
    const isScheduled = scheduledDays.includes(dayKey);
    
    daysData.push({ dayNumber: d, dayOfWeek, dateStr, isCompletedFull, isCompleted2Min, isScheduled });
  }

  const columnsHtml = daysData.map(item => {
    const isCompleted = item.isCompletedFull || item.isCompleted2Min;
    let cellBg = 'var(--bg-primary)';
    let cellBorder = '1px solid var(--border-subtle)';
    let checkColor = 'var(--bg-primary)';

    if (item.isCompletedFull) {
      cellBg = 'var(--text-primary)';
      cellBorder = '1px solid var(--text-primary)';
      checkColor = 'var(--bg-primary)';
    } else if (item.isCompleted2Min) {
      cellBg = 'rgba(255, 255, 255, 0.45)';
      cellBorder = '1px solid var(--text-secondary)';
      checkColor = 'var(--text-primary)';
    }

    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 32px;">
        <div style="height: 48px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary); display: inline-block; transform: rotate(-45deg); transform-origin: center center; white-space: nowrap;">
            ${item.dayOfWeek} ${item.dayNumber}
          </span>
        </div>
        
        ${(!item.isScheduled && !isCompleted) ? `
        <div class="chain-cell not-scheduled" style="width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border: 1px solid var(--border-subtle); position: relative; overflow: hidden;" title="No programado">
            <svg width="26" height="26" style="position: absolute; top: 0; left: 0;"><line x1="0" y1="26" x2="26" y2="0" stroke="var(--text-tertiary)" stroke-width="1" opacity="0.4"/></svg>
        </div>
        ` : `
        <div title="${item.dateStr}: ${item.isCompletedFull ? 'Completado' : item.isCompleted2Min ? 'Completado (2 Minutos)' : 'No completado'}" 
             style="width: 26px; height: 26px; border-radius: 6px; background: ${cellBg}; border: ${cellBorder}; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
          ${isCompleted ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${checkColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
        `}
      </div>
    `;
  }).join('');

  const modalHtml = `
    <div id="friend-chain-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-ui);">
      <div class="glass-card" style="width: 100%; max-width: 520px; padding: 26px; border-radius: 22px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 90vh; overflow-y: auto;">
        
        <!-- Modal Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <div>
            <h3 class="editorial-title" style="font-size: 20px; margin: 0; color: var(--text-primary);">${habit.name}</h3>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Historial de constancia de <strong>${friendName}</strong></div>
          </div>
          <button id="close-friend-chain-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <!-- Month Navigation Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <button id="friend-chain-prev-month" class="btn-secondary" style="width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('arrowLeft', 16)}
          </button>
          <h4 class="editorial-title" style="font-size: 18px; margin: 0; color: var(--text-primary);">
            ${monthNames[month]} ${year}
          </h4>
          <button id="friend-chain-next-month" class="btn-secondary" style="width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('arrowRight', 16)}
          </button>
        </div>

        <!-- Scrollable Horizontal Grid of All Days -->
        <div style="width: 100%; overflow-x: auto; padding-top: 10px; padding-bottom: 12px; -webkit-overflow-scrolling: touch; border: 1px solid var(--border-subtle); border-radius: 12px; background: rgba(0,0,0,0.1); margin-bottom: 20px;">
          <div style="display: flex; gap: 6px; min-width: max-content; padding: 0 12px;">
            ${columnsHtml}
          </div>
        </div>

        <!-- Legend -->
        <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 16px; font-size: 11.5px; color: var(--text-secondary); margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle); position: relative; overflow: hidden;">
              <svg width="14" height="14" style="position: absolute; top: 0; left: 0;"><line x1="0" y1="14" x2="14" y2="0" stroke="var(--text-tertiary)" stroke-width="1" opacity="0.4"/></svg>
            </div>
            <span>No programado</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle);"></div>
            <span>No completado</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 14px; height: 14px; border-radius: 4px; background: rgba(255,255,255,0.45); border: 1px solid var(--text-secondary);"></div>
            <span>2 minutos</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 14px; height: 14px; border-radius: 4px; background: var(--text-primary); border: 1px solid var(--text-primary);"></div>
            <span>Completado</span>
          </div>
        </div>

        <!-- Close Button -->
        <button id="btn-close-friend-chain" class="btn-secondary" style="width: 100%; min-height: 44px; border-radius: 12px; font-size: 13.5px; font-weight: 600;">
          Volver a Amigos
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const closeModal = () => document.getElementById('friend-chain-modal')?.remove();

  document.getElementById('close-friend-chain-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-close-friend-chain')?.addEventListener('click', closeModal);

  document.getElementById('friend-chain-prev-month')?.addEventListener('click', () => {
    let nextMonth = month - 1;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    showFriendHabitChainModal(friendName, habit, nextYear, nextMonth);
  });

  document.getElementById('friend-chain-next-month')?.addEventListener('click', () => {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    showFriendHabitChainModal(friendName, habit, nextYear, nextMonth);
  });
}
