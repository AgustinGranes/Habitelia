import { store } from '../store.js';
import { navigate } from '../router.js';
import { iconSVG } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';
import { convertToARSWithCommissionSync, formatPrice, getRateSummarySync, fetchRealRates, PRESET_PLATFORMS } from '../currencyEngine.js';
import { auth, saveDocument } from '../firebase.js';

export function render() {
  const state = store.getState();
  const expenses = state.calcExpenses || [];
  
  // Sort expenses by billing cycle day
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (!a.billingDay && !b.billingDay) return 0;
    if (!a.billingDay) return 1;
    if (!b.billingDay) return -1;
    return a.billingDay - b.billingDay;
  });

  const rateSummary = getRateSummarySync();
  const currentDay = new Date().getDate();

  let totalARS = 0;
  
  const expenseListHTML = sortedExpenses.length > 0 
    ? sortedExpenses.map(expense => {
        const { id, name, price, cur, commission, billingDay } = expense;
        const converted = convertToARSWithCommissionSync(price, cur, commission);
        totalARS += converted;
        
        let billingHTML = '';
        if (billingDay) {
          const hasPassed = currentDay >= billingDay;
          const billingIcon = hasPassed ? iconSVG('check', 14) : iconSVG('clock', 14);
          const billingColor = hasPassed ? 'var(--text-tertiary)' : 'var(--text-secondary)';
          billingHTML = `
            <div style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: ${billingColor}; margin-top: 4px;">
              ${billingIcon} Día ${billingDay}
            </div>
          `;
        }

        return `
          <div class="glass-card" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: transform 0.2s; position: relative;" data-id="${id}" class="expense-card">
            <div style="flex: 1;" class="expense-info" data-id="${id}">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 0.7rem; padding: 2px 6px; background: var(--bg-subtle); border-radius: 4px; color: var(--text-secondary); border: 1px solid var(--border-subtle);">${cur}</span>
                <strong style="font-family: var(--font-ui); font-size: 1rem; color: var(--text-primary); font-weight: 500;">${name}</strong>
              </div>
              <div style="color: var(--text-secondary); font-size: 0.85rem; font-family: var(--font-ui);">
                Orig: ${cur} ${price} <span style="color: var(--text-tertiary); font-size: 0.75rem;">(+${(commission * 100).toFixed(0)}%)</span>
              </div>
              ${billingHTML}
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <div style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--text-primary);">
                ${formatPrice(converted, 'ARS')}
              </div>
              <button class="btn-ghost delete-expense-btn" data-id="${id}" style="padding: 4px; border-radius: 50%; opacity: 0.6; hover: opacity: 1;">
                ${iconSVG('x', 16)}
              </button>
            </div>
          </div>
        `;
      }).join('')
    : `
      <div style="text-align: center; padding: 48px 20px; color: var(--text-tertiary); font-family: var(--font-ui);">
        <div style="margin-bottom: 16px; opacity: 0.5;">
          ${iconSVG('plus', 32)}
        </div>
        <p>No hay gastos registrados.<br>Agrega uno para comenzar.</p>
      </div>
    `;

  return `
    ${renderSidebar()}
    <div class="page page-content calculator-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      
      <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
        <div>
          <h1 class="editorial-title" style="font-size: 2rem; margin: 0 0 8px 0; color: var(--text-primary);">Gastos</h1>
          <div id="rate-summary-el" style="font-family: var(--font-ui); font-size: 0.85rem; color: var(--text-tertiary);">${rateSummary}</div>
        </div>
        <button id="menu-btn" class="btn-ghost" style="padding: 8px; margin-right: -8px;">
          ${iconSVG('menu', 24)}
        </button>
      </header>

      <div class="glass-card" style="margin-bottom: 24px; text-align: center; padding: 24px;">
        <div style="font-family: var(--font-ui); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          Total Mensual
        </div>
        <div class="editorial-title" style="font-size: 2.5rem; color: var(--text-primary);">
          ${formatPrice(totalARS, 'ARS')}
        </div>
      </div>

      <div class="expenses-list">
        ${expenseListHTML}
      </div>

      <button id="fab-add-expense" class="btn-primary" style="position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; border-radius: 28px; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 10;">
        ${iconSVG('plus', 24)}
      </button>

      <!-- Modal -->
      <div id="expense-modal" style="display: none; position: fixed; inset: 0; background: rgba(10,10,10,0.85); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-ui);">
        <div class="glass-card" style="width: 100%; max-width: 400px; padding: 24px; position: relative;">
          <button id="close-modal-btn" class="btn-ghost" style="position: absolute; top: 16px; right: 16px; padding: 8px;">
            ${iconSVG('x', 20)}
          </button>
          
          <h2 class="editorial-title" id="modal-title" style="font-size: 1.5rem; margin: 0 0 20px 0; color: var(--text-primary);">Agregar Gasto</h2>
          
          <div style="display: flex; border-bottom: 1px solid var(--border-subtle); margin-bottom: 20px;">
            <button class="modal-tab active" data-tab="custom" style="flex: 1; padding: 12px; background: none; border: none; color: var(--text-primary); border-bottom: 2px solid var(--accent-primary); font-family: var(--font-ui); cursor: pointer; transition: 0.2s;">Personalizado</button>
            <button class="modal-tab" data-tab="subscription" style="flex: 1; padding: 12px; background: none; border: none; color: var(--text-tertiary); border-bottom: 2px solid transparent; font-family: var(--font-ui); cursor: pointer; transition: 0.2s;">Suscripción</button>
          </div>

          <form id="expense-form">
            <input type="hidden" id="expense-id">
            
            <!-- Custom Tab -->
            <div id="tab-custom" class="tab-content" style="display: block;">
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Nombre</label>
                <input type="text" id="expense-name" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="Ej: Internet">
              </div>
              
              <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div style="flex: 1;">
                  <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Precio</label>
                  <input type="number" id="expense-price" step="0.01" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="0.00">
                </div>
                <div style="width: 100px;">
                  <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Moneda</label>
                  <select id="expense-cur" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box; appearance: none;">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Subscription Tab -->
            <div id="tab-subscription" class="tab-content" style="display: none;">
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Plataforma</label>
                <select id="expense-preset" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box; appearance: none;">
                  <option value="">Selecciona una opción...</option>
                  ${PRESET_PLATFORMS ? PRESET_PLATFORMS.map((p, i) => `<option value="${i}">${p.name} - ${p.cur} ${p.price}</option>`).join('') : ''}
                </select>
              </div>
            </div>

            <!-- Shared Fields -->
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Impuestos / Comisión (%)</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-secondary commission-preset" data-val="0" style="flex: 1; min-width: 40px; padding: 8px;">0%</button>
                <button type="button" class="btn-secondary commission-preset" data-val="0.08" style="flex: 1; min-width: 40px; padding: 8px;">8%</button>
                <button type="button" class="btn-secondary commission-preset" data-val="0.21" style="flex: 1; min-width: 40px; padding: 8px;">21%</button>
                <button type="button" class="btn-secondary commission-preset" data-val="0.30" style="flex: 1; min-width: 40px; padding: 8px;">30%</button>
              </div>
              <input type="number" id="expense-commission" step="1" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="Personalizado (Ej: 60)">
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Día de facturación (opcional)</label>
              <input type="number" id="expense-billing-day" min="1" max="31" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="1-31">
            </div>

            <button type="submit" class="btn-primary" style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 500;">
              Guardar Gasto
            </button>
          </form>
        </div>
      </div>

    </div>
  `;
}

export function mount() {
  mountSidebar();
  
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.add('open');
      }
    });
  }

  const fab = document.getElementById('fab-add-expense');
  const modal = document.getElementById('expense-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const form = document.getElementById('expense-form');
  const tabs = document.querySelectorAll('.modal-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const commissionPresets = document.querySelectorAll('.commission-preset');
  
  const state = store.getState();
  let currentExpenses = state.calcExpenses || [];

  function saveExpenses(newList) {
    store.setState({ calcExpenses: newList });
    localStorage.setItem('calc_expenses_v1', JSON.stringify(newList));
    if (auth.currentUser) {
      saveDocument(`users/${auth.currentUser.uid}/calculator/main`, { expenses: newList })
        .catch(err => console.error('Error saving expenses to firebase', err));
    }
    // Re-render
    navigate('/calculator');
  }

  function openModal(editExpense = null) {
    if (editExpense) {
      document.getElementById('modal-title').innerText = 'Editar Gasto';
      document.getElementById('expense-id').value = editExpense.id;
      document.getElementById('expense-name').value = editExpense.name || '';
      document.getElementById('expense-price').value = editExpense.price || '';
      document.getElementById('expense-cur').value = editExpense.cur || 'ARS';
      document.getElementById('expense-commission').value = editExpense.commission * 100 || 0;
      document.getElementById('expense-billing-day').value = editExpense.billingDay || '';
      
      // Auto-switch to custom tab for editing (simplification)
      switchTab('custom');
    } else {
      document.getElementById('modal-title').innerText = 'Agregar Gasto';
      form.reset();
      document.getElementById('expense-id').value = '';
      document.getElementById('expense-cur').value = 'ARS';
      document.getElementById('expense-commission').value = '0';
      switchTab('custom');
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  function switchTab(tabId) {
    tabs.forEach(t => {
      if (t.dataset.tab === tabId) {
        t.classList.add('active');
        t.style.borderBottomColor = 'var(--accent-primary)';
        t.style.color = 'var(--text-primary)';
      } else {
        t.classList.remove('active');
        t.style.borderBottomColor = 'transparent';
        t.style.color = 'var(--text-tertiary)';
      }
    });
    tabContents.forEach(tc => {
      tc.style.display = tc.id === `tab-${tabId}` ? 'block' : 'none';
    });
  }

  if (fab) fab.addEventListener('click', () => openModal());
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });

  commissionPresets.forEach(preset => {
    preset.addEventListener('click', (e) => {
      const val = parseFloat(e.target.dataset.val);
      document.getElementById('expense-commission').value = (val * 100).toString();
    });
  });

  // Handle Preset selection
  const presetSelect = document.getElementById('expense-preset');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const idx = e.target.value;
      if (idx !== '' && PRESET_PLATFORMS && PRESET_PLATFORMS[idx]) {
        const p = PRESET_PLATFORMS[idx];
        document.getElementById('expense-name').value = p.name;
        document.getElementById('expense-price').value = p.price;
        document.getElementById('expense-cur').value = p.cur;
        document.getElementById('expense-commission').value = (p.defaultCommission * 100).toString();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const isSubscriptionTab = document.getElementById('tab-subscription').style.display === 'block';
      let name, price, cur;

      if (isSubscriptionTab) {
        const idx = presetSelect.value;
        if (idx === '') {
          showToast('Selecciona una plataforma');
          return;
        }
        const p = PRESET_PLATFORMS[idx];
        name = p.name;
        price = p.price;
        cur = p.cur;
      } else {
        name = document.getElementById('expense-name').value.trim();
        price = parseFloat(document.getElementById('expense-price').value);
        cur = document.getElementById('expense-cur').value;
      }

      if (!name || isNaN(price)) {
        showToast('Completa nombre y precio correctamente');
        return;
      }

      const commission = parseFloat(document.getElementById('expense-commission').value || '0') / 100;
      const billingDayVal = document.getElementById('expense-billing-day').value;
      const billingDay = billingDayVal ? parseInt(billingDayVal, 10) : null;
      const id = document.getElementById('expense-id').value || Date.now().toString();

      const expense = {
        id,
        name,
        price,
        cur,
        commission,
        billingDay
      };

      const existingIdx = currentExpenses.findIndex(ex => ex.id === id);
      if (existingIdx >= 0) {
        currentExpenses[existingIdx] = expense;
      } else {
        currentExpenses.push(expense);
      }

      saveExpenses(currentExpenses);
      closeModal();
      showToast('Gasto guardado');
    });
  }

  // Handle Edit/Delete on cards
  const deleteBtns = document.querySelectorAll('.delete-expense-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent edit trigger
      const id = btn.dataset.id;
      if (confirm('¿Eliminar este gasto?')) {
        currentExpenses = currentExpenses.filter(ex => ex.id !== id);
        saveExpenses(currentExpenses);
        showToast('Gasto eliminado');
      }
    });
  });

  const expenseInfos = document.querySelectorAll('.expense-info');
  expenseInfos.forEach(info => {
    info.addEventListener('click', () => {
      const id = info.dataset.id;
      const expense = currentExpenses.find(ex => ex.id === id);
      if (expense) {
        openModal(expense);
      }
    });
  });

  fetchRealRates().then(() => {
    const rateEl = document.getElementById('rate-summary-el');
    if (rateEl) {
      rateEl.innerText = getRateSummarySync();
    }
  }).catch(() => {});
}
