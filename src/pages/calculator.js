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
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function isExpenseActiveInMonth(expense, targetYear, targetMonth) {
    if (expense.endDate && expense.endDate < `${targetYear}-${String(targetMonth+1).padStart(2,'0')}-00`) {
      return false;
    }
    
    let startY = currentYear;
    let startM = currentMonth;
    if (expense.startMonth) {
      const parts = expense.startMonth.split('-');
      if (parts.length === 2) {
        startY = parseInt(parts[0], 10);
        startM = parseInt(parts[1], 10) - 1;
      }
    }

    const monthsDiff = (targetYear - startY) * 12 + (targetMonth - startM);
    if (monthsDiff < 0) return false;

    if (expense.cycleType === 'x_months') {
      const x = parseInt(expense.cycleValue, 10) || 1;
      return monthsDiff % x === 0;
    }
    
    if (expense.cycleType === 'x_days') {
      const startDate = new Date(startY, startM, expense.billingDay || currentDay);
      const targetStart = new Date(targetYear, targetMonth, 1);
      const targetEnd = new Date(targetYear, targetMonth + 1, 0);
      const xDaysMs = (parseInt(expense.cycleValue, 10) || 1) * 24 * 60 * 60 * 1000;
      
      if (startDate > targetEnd) return false;
      if (startDate >= targetStart && startDate <= targetEnd) return true;
      
      let nextPayment = startDate.getTime();
      const diffMs = targetStart.getTime() - nextPayment;
      if (diffMs > 0) {
        const cyclesToSkip = Math.ceil(diffMs / xDaysMs);
        nextPayment += cyclesToSkip * xDaysMs;
      }
      return nextPayment <= targetEnd.getTime();
    }

    return true; 
  }

  let totalARS = 0;
  let projectionData = Array.from({length: 6}, (_, i) => {
    let d = new Date(currentYear, currentMonth + i + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, total: 0 };
  });
  
  const expenseListHTML = sortedExpenses.length > 0 
    ? sortedExpenses.map(expense => {
        const { id, name, price, cur, commission, billingDay, bank, endDate, cycleType, cycleValue } = expense;
        const converted = convertToARSWithCommissionSync(price, cur, commission);
        
        const isActiveThisMonth = isExpenseActiveInMonth(expense, currentYear, currentMonth);
        if (isActiveThisMonth) {
          totalARS += converted;
        }

        // Calculate for projections
        projectionData.forEach(proj => {
          if (isExpenseActiveInMonth(expense, proj.year, proj.month)) {
            proj.total += converted;
          }
        });
        
        const isPaid = endDate && todayStr > endDate;
        const hasPassed = billingDay ? currentDay >= billingDay : false;
        const billingIcon = billingDay ? (hasPassed ? iconSVG('check', 14) : iconSVG('clock', 14)) : '';
        
        let cycleText = '';
        if (cycleType === 'x_months') cycleText = ` | Cada ${cycleValue || 1} meses`;
        else if (cycleType === 'x_days') cycleText = ` | Cada ${cycleValue || 1} días`;

        return `
          <div class="glass-card expense-item-card" data-id="${id}" style="padding: 18px 20px; margin-bottom: 12px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: transform 0.15s ease; position: relative; overflow: hidden; ${isPaid ? 'opacity: 0.6;' : ''}">
            ${isPaid ? `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: var(--text-primary); opacity: 0.1; transform: rotate(-10deg); pointer-events: none; letter-spacing: 0.2em;">PAGADO</div>` : ''}
            <div class="expense-info" data-id="${id}" style="flex: 1; min-width: 0; cursor: pointer; position: relative; z-index: 1; overflow-x: auto; scrollbar-width: none;">
              <style>.expense-info::-webkit-scrollbar { display: none; }</style>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; min-width: max-content;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 6px; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-secondary); flex-shrink: 0;">${cur}</span>
                <div style="font-weight: 600; font-size: 16px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                ${bank ? `<span style="font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 4px; background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-secondary); white-space: nowrap;">${bank}</span>` : ''}
              </div>
              
              <div style="font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 12px; min-width: max-content;">
                <span style="white-space: nowrap;">Base: ${cur} ${price}${commission > 0 ? ` (+${Math.round(commission * 100)}%)` : ''}</span>
                ${billingDay ? `
                  <span style="display: inline-flex; align-items: center; gap: 4px; color: ${hasPassed ? 'var(--text-tertiary)' : 'var(--text-secondary)'}; white-space: nowrap;">
                    ${billingIcon} Día ${billingDay}${cycleText}
                  </span>
                ` : cycleText ? `<span style="color: var(--text-secondary); white-space: nowrap;">${cycleText.replace(' | ', '')}</span>` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; position: relative; z-index: 1;">
              <div style="font-weight: 700; font-size: 17px; color: ${isActiveThisMonth ? 'var(--text-primary)' : 'var(--text-tertiary)'}; font-family: var(--font-ui); text-align: right; text-decoration: ${!isActiveThisMonth && !isPaid ? 'line-through' : 'none'};">
                ${formatPrice(converted)}
              </div>
              <button class="btn-ghost delete-expense-btn" data-id="${id}" title="Eliminar" style="padding: 8px; border-radius: 8px; color: var(--text-tertiary); display: flex; align-items: center; justify-content: center;">
                ${iconSVG('trash', 16)}
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
    <div class="page page-content calculator-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      
      <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
        <div>
          <h1 class="editorial-title" style="font-size: 2rem; margin: 0 0 8px 0; color: var(--text-primary);">Calculadora de Gastos</h1>
          <div id="rate-summary-el" style="font-family: var(--font-ui); font-size: 0.85rem; color: var(--text-tertiary);">${rateSummary}</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <div class="glass-card" style="margin-bottom: 24px; text-align: center; padding: 24px;">
        <div style="font-family: var(--font-ui); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          Total Mensual (Este Mes)
        </div>
        <div class="editorial-title" style="font-size: 2.5rem; color: var(--text-primary); margin-bottom: 12px;">
          ${formatPrice(totalARS, 'ARS')}
        </div>
        <details style="text-align: left; background: var(--bg-subtle); border-radius: 12px; border: 1px solid var(--border-subtle); overflow: hidden;">
          <summary style="padding: 12px 16px; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between; user-select: none;">
            <span>Proyección a 6 meses</span>
            <span style="opacity: 0.5;">${iconSVG('arrowDown', 16)}</span>
          </summary>
          <div style="padding: 16px; border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 8px;">
            ${projectionData.map(p => `
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span style="color: var(--text-secondary);">${p.label}</span>
                <span style="font-weight: 600; color: var(--text-primary);">${formatPrice(p.total, 'ARS')}</span>
              </div>
            `).join('')}
          </div>
        </details>
      </div>

      <div class="expenses-list">
        ${expenseListHTML}
      </div>

      <button id="fab-add-expense" class="btn-primary" style="position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; border-radius: 28px; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 10;">
        ${iconSVG('plus', 24)}
      </button>

      <!-- Modal -->
      <div id="expense-modal" style="display: none; position: fixed; inset: 0; background: rgba(10,10,10,0.85); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-ui);">
        <div class="glass-card" style="width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto; padding: 24px; position: relative; border-radius: 20px;">
          <button id="close-modal-btn" class="btn-ghost" style="position: absolute; top: 16px; right: 16px; padding: 8px; z-index: 10;">
            ${iconSVG('x', 20)}
          </button>
          
          <h2 class="editorial-title" id="modal-title" style="font-size: 1.5rem; margin: 0 0 20px 0; color: var(--text-primary);">Agregar Gasto</h2>

          <form id="expense-form">
            <input type="hidden" id="expense-id">
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Nombre del gasto</label>
              <input type="text" id="expense-name" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="Ej: Netflix, Cable, Gimnasio...">
            </div>
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Tarjeta / Banco (opcional)</label>
              <div style="display: flex; gap: 8px; flex-direction: column;">
                <select id="expense-bank-select" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box; appearance: none;">
                  <option value="">Ninguno</option>
                  <option value="Visa">Visa</option>
                  <option value="MasterCard">MasterCard</option>
                  <option value="American Express">American Express</option>
                  <option value="MercadoPago">MercadoPago</option>
                  <option value="Ualá">Ualá</option>
                  <option value="Brubank">Brubank</option>
                  <option value="Galicia">Galicia</option>
                  <option value="Santander">Santander</option>
                  <option value="BBVA">BBVA</option>
                  <option value="Banco Provincia">Banco Provincia</option>
                  <option value="Banco Nación">Banco Nación</option>
                  <option value="Otra">Otra (escribir manual)</option>
                </select>
                <input type="text" id="expense-bank-custom" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box; display: none;" placeholder="Ej: Lemon Cash, Naranja X...">
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Precio base</label>
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
            
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 2;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Frecuencia</label>
                <select id="expense-cycle-type" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;">
                  <option value="monthly">Mensual</option>
                  <option value="x_months">Cada X Meses</option>
                  <option value="x_days">Cada X Días</option>
                </select>
              </div>
              <div style="flex: 1; display: none;" id="cycle-value-container">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Cant. (X)</label>
                <input type="number" id="expense-cycle-value" min="1" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="Ej: 3">
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Día de pago (opc)</label>
                <input type="number" id="expense-billing-day" min="1" max="31" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;" placeholder="1-31">
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Mes inicio (opc)</label>
                <input type="month" id="expense-start-month" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;">
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Fecha de fin (opcional, p/ Cuotas)</label>
              <input type="date" id="expense-end-date" class="input-base" style="width: 100%; background: var(--bg-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 12px; border-radius: 8px; font-family: var(--font-ui); box-sizing: border-box;">
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

  const fab = document.getElementById('fab-add-expense');
  const modal = document.getElementById('expense-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const form = document.getElementById('expense-form');
  const commissionPresets = document.querySelectorAll('.commission-preset');
  
  const state = store.getState();
  let currentExpenses = state.calcExpenses || [];

  function refreshCalculatorView() {
    const pageContent = document.querySelector('.calculator-page');
    if (pageContent) {
      pageContent.outerHTML = render();
      mount();
    } else {
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = render();
        mount();
      }
    }
  }

  async function saveExpenses(newList) {
    await store.saveCalcExpenses(newList);
    refreshCalculatorView();
  }

  function updateCycleContainer() {
    const cycleType = document.getElementById('expense-cycle-type')?.value;
    const cycleValContainer = document.getElementById('cycle-value-container');
    if (cycleValContainer) {
      if (cycleType === 'x_months' || cycleType === 'x_days') {
        cycleValContainer.style.display = 'block';
      } else {
        cycleValContainer.style.display = 'none';
      }
    }
  }

  function updateBankCustomField() {
    const bankSelect = document.getElementById('expense-bank-select');
    const bankCustom = document.getElementById('expense-bank-custom');
    if (bankSelect && bankCustom) {
      if (bankSelect.value === 'Otra') {
        bankCustom.style.display = 'block';
      } else {
        bankCustom.style.display = 'none';
      }
    }
  }

  function openModal(editExpense = null) {
    if (editExpense) {
      document.getElementById('modal-title').innerText = 'Editar Gasto';
      document.getElementById('expense-id').value = editExpense.id;
      document.getElementById('expense-name').value = editExpense.name || '';
      
      const bankSelect = document.getElementById('expense-bank-select');
      const bankCustom = document.getElementById('expense-bank-custom');
      if (bankSelect && bankCustom) {
        const standardOptions = ["", "Visa", "MasterCard", "American Express", "MercadoPago", "Ualá", "Brubank", "Galicia", "Santander", "BBVA", "Banco Provincia", "Banco Nación"];
        const bankVal = editExpense.bank || '';
        if (standardOptions.includes(bankVal)) {
          bankSelect.value = bankVal;
          bankCustom.value = '';
        } else if (bankVal) {
          bankSelect.value = 'Otra';
          bankCustom.value = bankVal;
        } else {
          bankSelect.value = '';
          bankCustom.value = '';
        }
      }
      document.getElementById('expense-price').value = editExpense.price || '';
      document.getElementById('expense-cur').value = editExpense.cur || 'ARS';
      document.getElementById('expense-commission').value = editExpense.commission ? (editExpense.commission * 100) : 0;
      document.getElementById('expense-billing-day').value = editExpense.billingDay || '';
      if (document.getElementById('expense-cycle-type')) document.getElementById('expense-cycle-type').value = editExpense.cycleType || 'monthly';
      if (document.getElementById('expense-cycle-value')) document.getElementById('expense-cycle-value').value = editExpense.cycleValue || '';
      if (document.getElementById('expense-start-month')) document.getElementById('expense-start-month').value = editExpense.startMonth || '';
      if (document.getElementById('expense-end-date')) document.getElementById('expense-end-date').value = editExpense.endDate || '';
    } else {
      document.getElementById('modal-title').innerText = 'Agregar Gasto';
      form.reset();
      document.getElementById('expense-id').value = '';
      document.getElementById('expense-cur').value = 'ARS';
      document.getElementById('expense-commission').value = '0';
      if (document.getElementById('expense-cycle-type')) document.getElementById('expense-cycle-type').value = 'monthly';
      if (document.getElementById('expense-bank-select')) document.getElementById('expense-bank-select').value = '';
      if (document.getElementById('expense-bank-custom')) document.getElementById('expense-bank-custom').value = '';
    }
    updateCycleContainer();
    updateBankCustomField();
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  const cycleTypeEl = document.getElementById('expense-cycle-type');
  if (cycleTypeEl) cycleTypeEl.addEventListener('change', updateCycleContainer);

  const bankSelectEl = document.getElementById('expense-bank-select');
  if (bankSelectEl) bankSelectEl.addEventListener('change', updateBankCustomField);

  if (fab) fab.addEventListener('click', () => openModal());
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  commissionPresets.forEach(preset => {
    preset.addEventListener('click', (e) => {
      const val = parseFloat(e.target.dataset.val);
      document.getElementById('expense-commission').value = (val * 100).toString();
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('expense-name').value.trim();
      
      let bank = '';
      const bankSelectVal = document.getElementById('expense-bank-select')?.value;
      if (bankSelectVal === 'Otra') {
        bank = document.getElementById('expense-bank-custom')?.value.trim() || '';
      } else {
        bank = bankSelectVal || '';
      }

      const price = parseFloat(document.getElementById('expense-price').value);
      const cur = document.getElementById('expense-cur').value;

      if (!name || isNaN(price) || price <= 0) {
        showToast('Completa nombre y precio correctamente');
        return;
      }

      const commission = parseFloat(document.getElementById('expense-commission').value || '0') / 100;
      const billingDayVal = document.getElementById('expense-billing-day').value;
      const billingDay = billingDayVal ? parseInt(billingDayVal, 10) : null;
      
      const cycleType = document.getElementById('expense-cycle-type')?.value || 'monthly';
      const cycleValueVal = document.getElementById('expense-cycle-value')?.value;
      const cycleValue = cycleValueVal ? parseInt(cycleValueVal, 10) : null;
      const startMonth = document.getElementById('expense-start-month')?.value || '';
      const endDate = document.getElementById('expense-end-date')?.value || '';

      const id = document.getElementById('expense-id').value || Date.now().toString();

      const expense = {
        id,
        name,
        bank,
        price,
        cur,
        commission,
        billingDay,
        cycleType,
        cycleValue,
        startMonth,
        endDate
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
      e.stopPropagation();
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
