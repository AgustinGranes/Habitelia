import { store } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

export function render(props = {}) {
  const state = store.getState();
  const todos = state.todos || [];
  const habits = state.habits || [];

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return `
    <div class="page todo-page" style="padding: 24px 20px 100px 20px; max-width: 620px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; width: 100%;">
        <div>
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Lista de Tareas<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Gestión de pendientes y eventos To-Do</div>
        </div>
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${iconSVG('menu', 20)}
        </button>
      </header>

      <!-- New Task Button -->
      <div style="margin-bottom: 24px;">
        <button id="btn-open-new-todo" class="btn-primary" style="width: 100%; min-height: 48px; border-radius: 14px; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
          ${iconSVG('plus', 16)} Agregar Nueva Tarea
        </button>
      </div>

      <!-- Pending Tasks Section -->
      <section style="margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 class="editorial-title" style="font-size: 20px; margin: 0;">Tareas Pendientes</h3>
          <span style="font-size: 13px; color: var(--text-secondary);">${activeTodos.length} pendientes</span>
        </div>

        ${activeTodos.length === 0 ? `
          <div class="glass-card" style="text-align: center; padding: 36px 20px; border-radius: 18px; color: var(--text-secondary); font-size: 13.5px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: var(--text-secondary);">
              ${iconSVG('check', 20)}
            </div>
            No tenés tareas pendientes. ¡Disfrutá tu día!
          </div>
        ` : activeTodos.map(todo => renderTodoCard(todo, habits)).join('')}
      </section>

      <!-- Completed Tasks Section -->
      ${completedTodos.length > 0 ? `
        <section>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 class="editorial-title" style="font-size: 18px; margin: 0; color: var(--text-secondary);">Completadas</h3>
            <span style="font-size: 12px; color: var(--text-tertiary);">${completedTodos.length} tareas</span>
          </div>
          ${completedTodos.map(todo => renderTodoCard(todo, habits)).join('')}
        </section>
      ` : ''}

    </div>
  `;
}

function renderTodoCard(todo, habits) {
  const todayStr = store.getTodayString();
  const isOverdue = todo.dueDate && todo.dueDate < todayStr && !todo.completed;
  const parentHabit = todo.stackedAfterId ? habits.find(h => h.id === todo.stackedAfterId) : null;

  return `
    <div class="glass-card todo-card" data-id="${todo.id}" style="padding: 16px 18px; margin-bottom: 12px; border-radius: 16px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 10px; opacity: ${todo.completed ? '0.6' : '1'}; transition: opacity 0.2s;">
      <!-- Top row: check + name + actions -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
          <button class="btn-toggle-todo" data-id="${todo.id}" style="width: 26px; height: 26px; border-radius: 50%; border: 1.75px solid ${todo.completed ? 'var(--text-primary)' : 'var(--border-subtle)'}; background: ${todo.completed ? 'var(--text-primary)' : 'transparent'}; color: ${todo.completed ? 'var(--bg-primary)' : 'transparent'}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;">
            ${iconSVG('check', 13)}
          </button>

          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 600; font-size: 15.5px; color: var(--text-primary); ${todo.completed ? 'text-decoration: line-through;' : ''}">
              ${todo.name}
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 5px; font-size: 12px; color: var(--text-secondary);">
              ${todo.dueDate ? `
                <span style="display: flex; align-items: center; gap: 4px; color: ${isOverdue ? '#F56565' : 'var(--text-secondary)'}; font-weight: ${isOverdue ? '700' : '400'};">
                  ${iconSVG('calendar', 12)} ${todo.dueDate}${todo.time ? ` &nbsp;${iconSVG('clock', 12)} ${todo.time}` : ''} ${isOverdue ? '— Vencida' : ''}
                </span>
              ` : (todo.time ? `
                <span style="display: flex; align-items: center; gap: 4px; color: var(--text-secondary);">
                  ${iconSVG('clock', 12)} ${todo.time}
                </span>
              ` : '')}

              ${todo.tag ? `
                <span style="display: flex; align-items: center; gap: 4px; background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 2px 8px; border-radius: 12px; font-weight: 600; color: var(--text-primary);">
                  ${iconSVG('tag', 12)} ${todo.tag}
                </span>
              ` : ''}

              ${todo.description && !todo.descriptionVisible ? `
                <span style="display: flex; align-items: center; gap: 3px; color: var(--text-tertiary); font-size: 11px;" title="Tiene descripción oculta">
                  ${iconSVG('info', 11)} Nota privada
                </span>
              ` : ''}
            </div>

            ${parentHabit ? `
              <div style="font-size: 11.5px; color: var(--text-tertiary); font-style: italic; margin-top: 4px;">
                Acumulada después de: <strong>"${parentHabit.name}"</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
          <button class="btn-edit-todo btn-ghost" data-id="${todo.id}" title="Editar tarea" style="padding: 6px; color: var(--text-tertiary);">
            ${iconSVG('edit', 16)}
          </button>
          <button class="btn-delete-todo btn-ghost" data-id="${todo.id}" title="Eliminar tarea" style="padding: 6px; color: var(--text-tertiary);">
            ${iconSVG('trash', 16)}
          </button>
        </div>
      </div>

      <!-- Description row (visible only if descriptionVisible === true) -->
      ${todo.description && todo.descriptionVisible ? `
        <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
          ${todo.description}
        </div>
      ` : ''}
    </div>
  `;
}

function openTodoModal(existingTodo = null) {
  document.getElementById('todo-modal')?.remove();
  const habits = store.getState().habits || [];
  const isEditing = !!existingTodo;

  const modalHtml = `
    <div id="todo-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="glass-card" style="width: 100%; max-width: 480px; padding: 28px; border-radius: 24px; border: 1px solid var(--border-subtle); background: var(--bg-surface); max-height: 88vh; overflow-y: auto;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 class="editorial-title" style="font-size: 22px; margin: 0;">${isEditing ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
          <button id="close-todo-modal" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${iconSVG('x', 16)}
          </button>
        </div>

        <div style="margin-bottom: 16px;">
          <label class="form-label">Nombre de la Tarea</label>
          <input type="text" id="todo-name" class="input" placeholder="Ej. Comprar cuaderno, Enviar correo..." value="${existingTodo?.name || ''}" style="width: 100%; min-height: 46px;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
              Fecha de Finalización
              <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 400;">(opcional)</span>
            </label>
            <input type="date" id="todo-date" class="input" value="${existingTodo?.dueDate || ''}" style="width: 100%; min-height: 44px;">
          </div>
          <div>
            <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
              Horario
              <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 400;">(opcional)</span>
            </label>
            <input type="time" id="todo-time" class="input" value="${existingTodo?.time || ''}" style="width: 100%; min-height: 44px;">
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
            Etiqueta / Tag
            <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 400;">(opcional)</span>
          </label>
          <input type="text" id="todo-tag" class="input" placeholder="Ej. Trabajo, Estudio, Personal..." value="${existingTodo?.tag || ''}" style="width: 100%; min-height: 44px;">
        </div>

        <!-- Description -->
        <div style="margin-bottom: 14px;">
          <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
            Descripción / Nota
            <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 400;">(opcional)</span>
          </label>
          <textarea id="todo-description" class="input" placeholder="Detalles adicionales, contexto, instrucciones..." rows="3" style="width: 100%; min-height: 80px; resize: vertical; font-family: var(--font-ui); line-height: 1.5;">${existingTodo?.description || ''}</textarea>
        </div>

        <!-- Visibility toggle -->
        <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px 16px;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              ${iconSVG('info', 15)} Mostrar descripción en la tarea
            </div>
            <div style="font-size: 11.5px; color: var(--text-tertiary);">Por defecto la nota es privada e invisible</div>
          </div>
          <label style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; cursor: pointer;">
            <input type="checkbox" id="todo-desc-visible" ${existingTodo?.descriptionVisible ? 'checked' : ''} style="opacity: 0; width: 0; height: 0; position: absolute;">
            <span id="todo-desc-toggle-track" style="position: absolute; inset: 0; border-radius: 24px; background: ${existingTodo?.descriptionVisible ? 'var(--text-primary)' : 'var(--bg-subtle)'}; border: 1px solid var(--border-subtle); transition: background 0.2s;">
              <span id="todo-desc-toggle-thumb" style="position: absolute; top: 2px; left: ${existingTodo?.descriptionVisible ? '22px' : '2px'}; width: 18px; height: 18px; border-radius: 50%; background: ${existingTodo?.descriptionVisible ? 'var(--bg-primary)' : 'var(--text-tertiary)'}; transition: all 0.2s;"></span>
            </span>
          </label>
        </div>

        <!-- Habit Stacking Dropdown -->
        <div style="margin-bottom: 24px;">
          <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
            Acumular con un hábito
            <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 400;">(opcional)</span>
          </label>
          <select id="todo-stacked-after" class="input" style="width: 100%; min-height: 44px;">
            <option value="">Ninguno (Tarea independiente)</option>
            ${habits.map(h => `<option value="${h.id}" ${existingTodo?.stackedAfterId === h.id ? 'selected' : ''}>Acumular después de: "${h.name}"</option>`).join('')}
          </select>
        </div>

        <button id="btn-save-todo" class="btn-primary" style="width: 100%; min-height: 48px; border-radius: 12px; font-size: 14px;">
          ${isEditing ? 'Guardar Cambios' : 'Crear Tarea'}
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-todo-modal')?.addEventListener('click', () => {
    document.getElementById('todo-modal')?.remove();
  });

  // Animate the toggle
  const checkbox = document.getElementById('todo-desc-visible');
  const track = document.getElementById('todo-desc-toggle-track');
  const thumb = document.getElementById('todo-desc-toggle-thumb');
  if (checkbox && track && thumb) {
    checkbox.addEventListener('change', () => {
      const on = checkbox.checked;
      track.style.background = on ? 'var(--text-primary)' : 'var(--bg-subtle)';
      thumb.style.left = on ? '22px' : '2px';
      thumb.style.background = on ? 'var(--bg-primary)' : 'var(--text-tertiary)';
    });
  }

  document.getElementById('btn-save-todo')?.addEventListener('click', async () => {
    const name = document.getElementById('todo-name')?.value.trim();
    if (!name) {
      showToast('Ingresá un nombre para la tarea', 'error');
      return;
    }

    const dueDate = document.getElementById('todo-date')?.value || '';
    const time = document.getElementById('todo-time')?.value || '';
    const tag = document.getElementById('todo-tag')?.value.trim() || '';
    const stackedAfterId = document.getElementById('todo-stacked-after')?.value || '';
    const description = document.getElementById('todo-description')?.value.trim() || '';
    const descriptionVisible = document.getElementById('todo-desc-visible')?.checked || false;

    const todoData = {
      id: existingTodo?.id || store.generateId(),
      name,
      dueDate,
      time,
      tag,
      stackedAfterId,
      description,
      descriptionVisible,
      completed: existingTodo?.completed || false,
      createdAt: existingTodo?.createdAt || new Date().toISOString()
    };

    await store.saveTodo(todoData);
    showToast(isEditing ? 'Tarea actualizada' : 'Tarea creada', 'success');
    document.getElementById('todo-modal')?.remove();
    refreshTodoView();
  });
}

function refreshTodoView() {
  const pageContent = document.querySelector('.todo-page');
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

  document.getElementById('btn-open-new-todo')?.addEventListener('click', () => {
    openTodoModal(null);
  });

  document.querySelectorAll('.btn-toggle-todo').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      await store.toggleTodo(id);
      refreshTodoView();
    });
  });

  document.querySelectorAll('.btn-edit-todo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const todo = (store.getState().todos || []).find(t => t.id === id);
      if (todo) openTodoModal(todo);
    });
  });

  document.querySelectorAll('.btn-delete-todo').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      if (confirm('¿Eliminar esta tarea?')) {
        await store.deleteTodo(id);
        showToast('Tarea eliminada', 'info');
        refreshTodoView();
      }
    });
  });
}

export function unmount() {}
