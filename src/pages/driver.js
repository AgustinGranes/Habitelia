import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';
import { getTeamForOVR, calculateMarketValue, getOVRColor, computeAccumulatedStats, getCategoryForTeam, TEAMS_DATA } from '../driverEngine.js';

export function render() {
  const state = store.getState();
  const driver = state.driverProfile || {};

  if (!driver.active) {
    return renderOnboardingSummaryCard();
  }

  // Active Driver Card Dashboard
  const ovr = driver.ovr || 50;
  const ovrBgColor = getOVRColor(ovr);
  const isDarkOvrText = ovr >= 90; // Neon teal background uses dark text like reference image

  const marketValue = driver.marketValue || calculateMarketValue(ovr, driver.titlesDriver || 0, driver.titlesConstructor || 0);
  const stats = computeAccumulatedStats(ovr, driver.seasons || 1, driver.completedHabitsCounter || 0);
  
  const wins = driver.wins || stats.wins;
  const podiums = driver.podiums || stats.podiums;
  const points = driver.points || stats.points;
  const seasons = driver.seasons || 1;

  const lastName = (driver.lastName || 'GRANES').toUpperCase();
  const initials = (driver.initials || 'AGR').toUpperCase();
  const number = driver.number || '86';
  const flag = driver.countryFlag || '🇦🇷';

  const historyTeams = driver.teamsHistory || ['Apex'];

  const trajectoryHtml = historyTeams.map(tKey => {
    const tData = TEAMS_DATA[tKey] || { name: tKey, category: 'F4' };
    const category = getCategoryForTeam(tKey);
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-width: 64px;">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 900; letter-spacing: 0.05em; font-family: var(--font-sans);">
          ${category}
        </div>
        <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary); text-align: center; max-width: 75px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${tData.name.split(' ')[0]}
        </span>
      </div>
    `;
  }).join('');

  const hasTitles = (driver.titlesDriver || 0) > 0 || (driver.titlesConstructor || 0) > 0;

  return `
    <div class="page driver-page" style="padding: 24px 20px 100px 20px; max-width: 520px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Tu Piloto<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Ficha profesional de rendimiento F1</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <!-- Main Driver FIFA/F1 Card (Matching reference image) -->
      <div class="glass-card" style="padding: 28px 24px; border-radius: 28px; border: 1px solid var(--border-subtle); background: #0A0A0A; box-shadow: 0 20px 50px rgba(0,0,0,0.9); position: relative; margin-bottom: 20px;">
        
        <!-- Header Row: OVR Box Left + Info/Stats Right -->
        <div style="display: flex; gap: 14px; margin-bottom: 24px; align-items: stretch;">
          
          <!-- OVR Square (Left) -->
          <div style="width: 100px; border-radius: 20px; background: ${ovrBgColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px 8px; flex-shrink: 0; transition: background 0.3s ease;">
            <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.05em; color: ${isDarkOvrText ? '#0F172A' : '#FFFFFF'};">OVR</span>
            <span style="font-size: 50px; font-weight: 900; line-height: 1; margin-top: 2px; color: ${isDarkOvrText ? '#0F172A' : '#FFFFFF'}; font-family: var(--font-sans);">${ovr}</span>
          </div>

          <!-- Top & Stats Column (Right) -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            
            <!-- Pills Row -->
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <div style="padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 14px; display: flex; align-items: center;">
                ${flag}
              </div>
              <div style="padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 12px; font-weight: 600; color: var(--text-primary);">
                Valor <span style="color: var(--text-secondary);">€${marketValue}M</span>
              </div>
              <div style="padding: 6px 12px; border-radius: 10px; background: #FFFFFF; color: #000000; font-size: 13px; font-weight: 800;">
                #${number}
              </div>
              <div style="padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); font-size: 12px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.05em;">
                ${initials}
              </div>
            </div>

            <!-- Stats Bar Row -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 10px 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 14px; text-align: center; margin-top: 8px;">
              <div>
                <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">TEMP</div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${seasons}</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">VCT</div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${wins}</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">POD</div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${podiums}</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; color: var(--text-tertiary);">PTS</div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${points}</div>
              </div>
            </div>

          </div>
        </div>

        <!-- Driver Name Prominent Center -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 32px; font-weight: 900; letter-spacing: 0.06em; margin: 0; color: #FFFFFF; font-family: var(--font-sans); text-transform: uppercase;">
            ${lastName}
          </h2>
        </div>

        <!-- TRAYECTORIA Section -->
        <div style="margin-bottom: 24px;">
          <div style="text-align: center; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 14px;">
            TRAYECTORIA
          </div>
          <div class="glass-card" style="height: 96px; min-height: 96px; max-height: 96px; padding: 12px 16px; border-radius: 18px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; gap: 14px; overflow-x: auto; box-sizing: border-box;">
            ${trajectoryHtml}
          </div>
        </div>

        <!-- TÍTULOS Section -->
        <div style="margin-bottom: 20px;">
          <div style="text-align: center; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 14px;">
            TÍTULOS
          </div>
          <div class="glass-card" style="height: 96px; min-height: 96px; max-height: 96px; padding: 12px 16px; border-radius: 18px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.3); text-align: center; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
            ${!hasTitles ? `
              <div style="color: var(--text-tertiary); font-size: 13px; font-style: italic;">
                Vitrina Vacía
              </div>
            ` : `
              <div style="display: flex; align-items: center; justify-content: space-around; width: 100%;">
                <div>
                  <div style="color: #D69E2E; margin-bottom: 4px; display: flex; justify-content: center;">
                    ${iconSVG('trophy', 26)}
                  </div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">PILOTO</div>
                  <div style="font-size: 16px; font-weight: 900; color: #D69E2E; margin-top: 2px;">x${driver.titlesDriver || 0}</div>
                </div>
                <div>
                  <div style="color: #7CDEDC; margin-bottom: 4px; display: flex; justify-content: center;">
                    ${iconSVG('trophy', 26)}
                  </div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">CONSTRUCTOR</div>
                  <div style="font-size: 16px; font-weight: 900; color: #7CDEDC; margin-top: 2px;">x${driver.titlesConstructor || 0}</div>
                </div>
              </div>
            `}
          </div>
        </div>

      </div>

      <!-- Action Button below Main Card -->
      <button id="btn-driver-rules" class="btn-secondary" style="width: 100%; min-height: 48px; border-radius: 14px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px;">
        ${iconSVG('info', 16)} Reglas y Sistema de Puntuación
      </button>

    </div>
  `;
}

function renderOnboardingSummaryCard() {
  return `
    <div class="page driver-page" style="padding: 24px 20px 100px 20px; max-width: 520px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Tu Piloto<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Gamificación de carrera profesional F1</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <div class="glass-card" style="padding: 32px 24px; border-radius: 24px; border: 1px solid var(--border-subtle); text-align: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-subtle); color: var(--text-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
          ${iconSVG('helmet', 28)}
        </div>

        <h2 class="editorial-title" style="font-size: 26px; margin: 0 0 10px 0;">Modo Carrera: Tu Piloto</h2>
        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5; margin-bottom: 24px; max-width: 460px; margin-left: auto; margin-right: auto;">
          Transforma la constancia de tus hábitos diarios en rendimiento profesional sobre el asfalto. Inicia tu trayectoria en la Fórmula 4 y escala categorías hasta consagrarte Campeón Mundial de Fórmula 1.
        </p>

        <div style="display: flex; flex-direction: column; gap: 16px; text-align: left; background: var(--bg-primary); padding: 20px; border-radius: 18px; border: 1px solid var(--border-subtle); margin-bottom: 28px;">
          
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--text-primary); flex-shrink: 0; margin-top: 2px;">
              ${iconSVG('flame', 16)}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Evaluación de Rendimiento (OVR)</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 3px; line-height: 1.45;">
                Cada 10 hábitos completados incrementan +1 punto tu OVR general. A mayor disciplina diaria, mayor rendimiento de telemetría y mejor posición en grilla.
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--text-primary); flex-shrink: 0; margin-top: 2px;">
              ${iconSVG('target', 16)}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Victorias (VCT), Podios (POD) y Puntos (PTS)</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 3px; line-height: 1.45;">
                • <strong>VCT (Victorias):</strong> Se obtienen al completar el 100% de tus hábitos del día en Fórmula 1 (OVR ≥ 80). Un día perfecto equivale a 1 Victoria de Gran Premio.<br>
                • <strong>POD (Podios):</strong> Se ganan al cumplir la mayoría de tus hábitos diarios (o en categorías F3/F2 con OVR ≥ 70).<br>
                • <strong>PTS (Puntos):</strong> Sumas 6 PTS directos por cada hábito completado, +25 PTS por Victoria y +15 PTS por Podio.
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--text-primary); flex-shrink: 0; margin-top: 2px;">
              ${iconSVG('alert', 16)}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Penalizaciones e Incidentes de Carrera</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 3px; line-height: 1.45;">
                Dejar hábitos sin cumplir o pasar días sin registrar actividad descuenta -1 OVR por día no registrado con reporte de radio de boxes en vivo.
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--text-primary); flex-shrink: 0; margin-top: 2px;">
              ${iconSVG('star', 16)}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Ascenso de Categorías y Escuderías</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 3px; line-height: 1.45;">
                Avanza a través de F4, F3, F2 y F1 firmando contrato con escuderías legendarias como Apex, Van Amersfoort, Campos, Hitech, Alpine, Racing Bulls, Ferrari y Mercedes-AMG.
              </div>
            </div>
          </div>

        </div>

        <button id="btn-start-driver-onboarding" class="btn-primary" style="width: 100%; min-height: 52px; font-size: 15px; border-radius: 14px;">
          Crear Tu Piloto
        </button>
      </div>
    </div>
  `;
}

function openDriverOnboardingModal() {
  document.getElementById('driver-onboarding-modal')?.remove();

  const user = store.getState().user || {};
  const defaultLastName = (user.name || 'GRANES').split(' ').pop().toUpperCase();

  const modalHtml = `
    <div id="driver-onboarding-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 460px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Ficha del Piloto</h3>
          <button id="close-driver-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <div style="margin-bottom: 16px;">
          <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; font-size: 13px;">Apellido o Nombre en Pista</label>
          <input type="text" id="driver-input-name" class="input" value="${defaultLastName}" placeholder="Ej. GRANES" style="width: 100%; min-height: 44px; text-transform: uppercase;">
        </div>

        <div style="margin-bottom: 16px;">
          <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; font-size: 13px;">Nacionalidad / Bandera</label>
          <select id="driver-input-flag" class="input" style="width: 100%; min-height: 44px;">
            <option value="🇦🇷">🇦🇷 Argentina</option>
            <option value="🇪🇸">🇪🇸 España</option>
            <option value="🇲🇽">🇲🇽 México</option>
            <option value="🇨🇱">🇨🇱 Chile</option>
            <option value="🇺🇾">🇺🇾 Uruguay</option>
            <option value="🇨🇴">🇨🇴 Colombia</option>
            <option value="🇧🇷">🇧🇷 Brasil</option>
            <option value="🇺🇸">🇺🇸 Estados Unidos</option>
            <option value="🇬🇧">🇬🇧 Reino Unido</option>
          </select>
        </div>

        <div style="margin-bottom: 24px;">
          <label class="form-label" style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; font-size: 13px;">Dorsal / Número de Carrera (1 a 99)</label>
          <input type="number" id="driver-input-number" class="input" value="86" min="1" max="99" style="width: 100%; min-height: 44px;">
        </div>

        <button id="btn-confirm-driver-creation" class="btn-primary" style="width: 100%; min-height: 48px; border-radius: 12px; font-size: 14px;">
          Iniciar Carrera Profesional
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-driver-modal')?.addEventListener('click', () => {
    document.getElementById('driver-onboarding-modal')?.remove();
  });

  document.getElementById('btn-confirm-driver-creation')?.addEventListener('click', async () => {
    const lastName = (document.getElementById('driver-input-name')?.value || 'GRANES').trim().toUpperCase();
    const flag = document.getElementById('driver-input-flag')?.value || '🇦🇷';
    const number = document.getElementById('driver-input-number')?.value || '86';
    const initials = lastName.substring(0, 3).toUpperCase();

    const profile = {
      active: true,
      ovr: 50,
      number,
      initials,
      lastName,
      countryFlag: flag,
      seasons: 1,
      wins: 0,
      podiums: 0,
      points: 0,
      marketValue: '2.5',
      titlesDriver: 0,
      titlesConstructor: 0,
      teamsHistory: ['Apex'],
      completedHabitsCounter: 0
    };

    await store.saveDriverProfile(profile);
    showToast('¡Modo Carrera Tu Piloto activado con éxito!', 'success');
    document.getElementById('driver-onboarding-modal')?.remove();
    refreshDriverView();
  });
}

function openDriverRulesModal() {
  document.getElementById('driver-rules-modal')?.remove();

  const modalHtml = `
    <div id="driver-rules-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 500px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 85vh; overflow-y: auto;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <h3 class="editorial-title" style="font-size: 22px; margin: 0;">Reglas y Sistema de Puntuación</h3>
          <button id="close-rules-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <div style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; display: flex; flex-direction: column; gap: 16px;">
          <div>
            <h4 style="color: var(--text-primary); margin: 0 0 6px 0; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              ${iconSVG('flame', 16)} Puntuación de OVR
            </h4>
            <div>• Arrancas con <strong>50 OVR</strong> en Fórmula 4 (Escudería Apex).</div>
            <div>• Cada <strong>10 hábitos completados</strong> = <strong>+1 OVR</strong>.</div>
            <div>• Cada día de inactividad o hábito no cumplido = <strong>-1 OVR</strong>.</div>
          </div>

          <div style="height: 1px; background: var(--border-subtle);"></div>

          <div>
            <h4 style="color: var(--text-primary); margin: 0 0 6px 0; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              ${iconSVG('target', 16)} Victorias (VCT), Podios (POD) y Puntos (PTS)
            </h4>
            <div>• <strong>VCT (Victorias):</strong> Se gana 1 Victoria al completar el 100% de tus hábitos programados del día (Día Perfecto) estando en Fórmula 1 (OVR ≥ 80).</div>
            <div>• <strong>POD (Podios):</strong> Se obtiene 1 Podio al cumplir la mayoría de tus hábitos en el día (o en categorías F3/F2 con OVR ≥ 70).</div>
            <div>• <strong>PTS (Puntos):</strong> Acumulas 6 PTS por hábito individual completado, +25 PTS por Victoria (Día Perfecto) y +15 PTS por Podio.</div>
          </div>

          <div style="height: 1px; background: var(--border-subtle);"></div>

          <div>
            <h4 style="color: var(--text-primary); margin: 0 0 6px 0; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              ${iconSVG('star', 16)} Escuderías y Categorías por OVR
            </h4>
            <div>• <strong>50-59 (F4):</strong> Apex, Rodin, Jenzer</div>
            <div>• <strong>60-69 (F3):</strong> Van Amersfoort (VAR), Trident, MP</div>
            <div>• <strong>70-79 (F2):</strong> Campos, Hitech, DAMS</div>
            <div>• <strong>80-82 (F1 Fondo):</strong> Haas, Sauber, Williams</div>
            <div>• <strong>83-85 (F1 Midfield):</strong> Alpine, Racing Bulls</div>
            <div>• <strong>86-89 (F1 Upper Mid):</strong> Aston Martin, McLaren</div>
            <div>• <strong>90-94 (F1 Top):</strong> Ferrari, Red Bull</div>
            <div>• <strong>95+ (F1 Elite):</strong> Mercedes-AMG F1</div>
          </div>

          <div style="height: 1px; background: var(--border-subtle);"></div>

          <div>
            <h4 style="color: var(--text-primary); margin: 0 0 6px 0; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              ${iconSVG('trophy', 16)} Campeonatos a Fin de Año
            </h4>
            <div>• Al terminar el año calendario:</div>
            <div>• <strong>OVR ≥ 95:</strong> Campeón de Pilotos Y Campeón de Constructores (+1 a Piloto, +1 a Constructor).</div>
            <div>• <strong>OVR 90 a 94:</strong> Campeón de Constructores (+1 a Constructor).</div>
          </div>
        </div>

        <button id="btn-close-rules" class="btn-primary" style="width: 100%; min-height: 44px; margin-top: 24px; font-size: 13.5px;">
          Entendido
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-rules-modal')?.addEventListener('click', () => {
    document.getElementById('driver-rules-modal')?.remove();
  });
  document.getElementById('btn-close-rules')?.addEventListener('click', () => {
    document.getElementById('driver-rules-modal')?.remove();
  });
}

function refreshDriverView() {
  const pageContent = document.querySelector('.driver-page');
  if (pageContent) {
    pageContent.outerHTML = render();
    mount();
  } else {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = render();
      mount();
      const sidebarHTML = renderSidebar();
      app.insertAdjacentHTML('beforeend', sidebarHTML);
      mountSidebar();
    }
  }
}

export function mount() {
  store.checkDriverDailyInactivityAndSeason();

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

  document.getElementById('btn-start-driver-onboarding')?.addEventListener('click', () => {
    openDriverOnboardingModal();
  });

  document.getElementById('btn-driver-rules')?.addEventListener('click', () => {
    openDriverRulesModal();
  });
}

export function unmount() {
}
