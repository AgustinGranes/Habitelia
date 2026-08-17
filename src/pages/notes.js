import { store } from '../store.js';
import { iconSVG } from '../components/icons.js';
import { renderSidebar, mountSidebar } from '../components/sidebar.js';

// Pre-defined premium covers (colors and gradients)
const PREMIUM_COVERS = [
  'linear-gradient(135deg, #1f4068, #162447, #1b1a17)', // Carbon F1
  'linear-gradient(135deg, #FF6B6B, #FF8E53)',         // Sunset Warmth
  'linear-gradient(135deg, #4E65FF, #92EFFD)',         // Electric Blue
  'linear-gradient(135deg, #11998e, #38ef7d)',         // Emerald Speed
  'linear-gradient(135deg, #7F00FF, #E100FF)',         // Cyber Neon
  'linear-gradient(135deg, #ff007f, #7f00ff)',         // Red Bull Night
  'linear-gradient(135deg, #3a7bd5, #3a6073)',         // Steel Blue
  'linear-gradient(135deg, #eb3c5a, #f67854)',         // Racing Red
  'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', // Deep Forest
  '#1A202C',                                           // Dark Slate
  '#2D3748',                                           // Slate Gray
  '#3182CE'                                            // Blue Line
];

// Pre-defined premium emojis
const PREMIUM_EMOJIS = [
  '📚', '🏎️', '🛒', '🎂', '💀', '📝', '💡', '📅', '🎯', '🚀', 
  '🏁', '🏆', '🔥', '🧠', '🔋', '🍿', '🎨', '🎵', '💻', '🤝'
];

export function render(params = {}) {
  const state = store.getState();
  const notes = state.notes || [];
  const noteId = params.id;

  if (noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) {
      setTimeout(() => {
        window.location.hash = '/notes';
      }, 0);
      return `<div class="page"></div>`;
    }
    return renderNoteDetail(note);
  }

  return renderNotesList(notes);
}

function renderNotesList(notes) {
  const notesGridHtml = notes.length === 0 ? `
    <div class="glass-card" style="text-align: center; padding: 48px 24px; border-radius: 20px; grid-column: 1 / -1;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--text-secondary);">
        ${iconSVG('note', 24)}
      </div>
      <h3 class="editorial-title" style="font-size: 22px; margin-bottom: 8px;">Aún no tienes notas</h3>
      <p style="color: var(--text-secondary); font-size: 13.5px; max-width: 320px; margin: 0 auto 20px auto; line-height: 1.5;">
        Crea anotaciones rápidas, encabezados y resúmenes con sincronización en tiempo real.
      </p>
      <button id="btn-create-note-empty" class="btn-primary" style="max-width: 200px; margin: 0 auto;">
        ${iconSVG('plus', 16)} Nueva Nota
      </button>
    </div>
  ` : notes.map(note => {
    return `
      <div class="note-card" data-id="${note.id}" style="
        border-radius: 16px; overflow: hidden; background: var(--bg-surface); 
        border: 1px solid var(--border-subtle); display: flex; flex-direction: column; 
        cursor: pointer; height: 160px; position: relative; user-select: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        <div style="flex: 1; background: ${note.coverColor || PREMIUM_COVERS[0]}; position: relative;"></div>
        <div style="padding: 10px 14px; background: rgba(0,0,0,0.25); border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px; flex-shrink: 0;">${note.emoji || '📝'}</span>
          <span style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; flex: 1;">
            ${note.title || 'Nueva Nota'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="page notes-page" style="padding: 24px 20px 100px 20px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box;">
      
      <!-- Editorial Header -->
      <header style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; width: 100%;">
        <button id="menu-btn" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; margin-top: 2px;">
          ${iconSVG('menu', 20)}
        </button>
        <div style="flex: 1; min-width: 0;">
          <h1 class="editorial-title" style="margin: 0; font-size: 32px;">Notas<span style="color: var(--text-secondary);">.</span></h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Espacio libre de apuntes y portadas personalizadas</div>
        </div>
        ${notes.length > 0 ? `
          <button id="btn-create-note-header" class="btn-primary" style="width: auto; padding: 0 16px; min-height: 44px; font-size: 13px; margin: 0; display: flex; align-items: center; gap: 6px;">
            ${iconSVG('plus', 14)} Nueva
          </button>
        ` : ''}
      </header>

      <!-- Notes Wrapped Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 100%;">
        ${notesGridHtml}
      </div>

    </div>
  `;
}

function renderNoteDetail(note) {
  return `
    <div class="page note-detail-page" style="padding: 24px 20px 100px 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box; position: relative;">
      
      <!-- Detail Action Buttons Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <button id="btn-back-to-notes" class="btn-secondary" style="width: auto; padding: 0 14px; min-height: 38px; font-size: 13px; display: flex; align-items: center; gap: 6px; margin: 0;">
          ${iconSVG('arrowLeft', 15)} Volver
        </button>
        <button id="btn-delete-note" class="btn-secondary" style="width: auto; padding: 0 14px; min-height: 38px; font-size: 13px; color: #E53E3E; border-color: rgba(229,62,62,0.2); display: flex; align-items: center; gap: 6px; margin: 0;">
          ${iconSVG('trash', 15)} Eliminar
        </button>
      </div>

      <!-- Note Cover Header Card -->
      <div class="glass-card" style="padding: 0; border-radius: 20px; overflow: hidden; margin-bottom: 24px; border: 1px solid var(--border-subtle);">
        
        <!-- Big Color/Gradient Cover -->
        <div id="note-detail-cover" style="height: 140px; background: ${note.coverColor || PREMIUM_COVERS[0]}; position: relative; display: flex; align-items: flex-end; padding: 20px;">
          <!-- Emoji Badge Floating -->
          <div id="note-detail-emoji" style="font-size: 48px; line-height: 1; transform: translateY(24px); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); user-select: none;">
            ${note.emoji || '📝'}
          </div>
        </div>

        <!-- Customize Cover and Emoji Button -->
        <div style="padding: 16px 20px; display: flex; justify-content: flex-end; background: var(--bg-surface);">
          <button id="btn-open-cover-customizer" class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin: 0; min-height: 32px; border-radius: 8px;">
            ${iconSVG('pencil', 12)} Cambiar Portada y Emoji
          </button>
        </div>

      </div>

      <!-- Separator line -->
      <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;"></div>

      <!-- Editor Mode Wrapper -->
      <div id="note-editor-wrapper" style="position: relative; width: 100%;">
        <input type="text" id="note-title-input" value="${note.title || ''}" placeholder="Título de la nota..." style="border: none; background: transparent; font-size: 28px; font-weight: 800; font-family: var(--font-serif); color: var(--text-primary); width: 100%; outline: none; padding: 0; box-sizing: border-box;" maxlength="80">
        
        <div id="note-content-editor" contenteditable="true" placeholder="Comienza a escribir aquí. Escribe / para encabezados..." style="border: none; background: transparent; font-size: 15px; font-family: var(--font-sans); color: var(--text-secondary); width: 100%; min-height: 380px; outline: none; line-height: 1.6; padding: 0; margin-top: 18px; box-sizing: border-box; overflow-y: auto;"></div>

        <!-- Slash Suggestions Dropdown (Only Headings) -->
        <div id="notion-slash-menu" style="display: none; position: absolute; background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 2200; width: 220px; padding: 6px; left: 0; top: 0;">
          <div style="font-size: 9px; font-weight: 700; color: var(--text-tertiary); padding: 6px 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px;">Encabezados</div>
          
          <div class="slash-item" data-type="h1" style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 13px; color: var(--text-primary); cursor: pointer; transition: background 0.15s ease;">
            <span style="font-size: 15px; font-weight: 800; color: var(--text-primary); width: 22px;">H1</span>
            <div>
              <div style="font-weight: 600;">Encabezado 1</div>
              <div style="font-size: 10px; color: var(--text-secondary);">Título grande</div>
            </div>
          </div>
          
          <div class="slash-item" data-type="h2" style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 13px; color: var(--text-primary); cursor: pointer; transition: background 0.15s ease;">
            <span style="font-size: 15px; font-weight: 800; color: var(--text-primary); width: 22px;">H2</span>
            <div>
              <div style="font-weight: 600;">Encabezado 2</div>
              <div style="font-size: 10px; color: var(--text-secondary);">Título mediano</div>
            </div>
          </div>
          
          <div class="slash-item" data-type="h3" style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 13px; color: var(--text-primary); cursor: pointer; transition: background 0.15s ease;">
            <span style="font-size: 15px; font-weight: 800; color: var(--text-primary); width: 22px;">H3</span>
            <div>
              <div style="font-weight: 600;">Encabezado 3</div>
              <div style="font-size: 10px; color: var(--text-secondary);">Título pequeño</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Floating Cover Customizer Drawer / Modal Overlay -->
      <div id="cover-customizer-drawer" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 2100; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s ease;">
        <div class="glass-card" style="width: 100%; max-width: 480px; padding: 24px; border-radius: 24px 24px 0 0; background: var(--bg-surface); animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h4 class="editorial-title" style="font-size: 18px; margin: 0;">Personalizar Portada</h4>
            <button id="btn-close-customizer" style="background: var(--bg-subtle); border: none; color: var(--text-primary); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${iconSVG('x', 14)}
            </button>
          </div>

          <!-- Color Cover Selection -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 12.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Color de Portada</label>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;">
              ${PREMIUM_COVERS.map(color => `
                <div class="cover-preset-option" data-color="${color}" style="height: 38px; border-radius: 8px; background: ${color}; border: 2px solid ${note.coverColor === color ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.15s ease;"></div>
              `).join('')}
            </div>
          </div>

          <!-- Emoji Selection -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 12.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Emoji de la Nota</label>
            <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 10px; max-height: 140px; overflow-y: auto; padding-right: 4px;">
              ${PREMIUM_EMOJIS.map(emoji => `
                <div class="emoji-preset-option" data-emoji="${emoji}" style="height: 42px; font-size: 22px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--bg-subtle); border: 2px solid ${note.emoji === emoji ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.15s ease;">
                  ${emoji}
                </div>
              `).join('')}
            </div>
          </div>

          <button id="btn-save-customizer" class="btn-primary" style="width: 100%; min-height: 46px; font-size: 13.5px; font-weight: 600;">
            Confirmar Cambios
          </button>
        </div>
      </div>

    </div>
  `;
}

// Helper to insert HTML elements at caret position inside contenteditable
function insertHTMLAtCursor(html) {
  const sel = window.getSelection();
  if (sel.getRangeAt && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    
    const el = document.createElement("div");
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node;
    let lastNode;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    
    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }
}

// Helper to place cursor at the start of an element
function focusAndPlaceCaretAtStart(el) {
  try {
    el.focus();
  } catch (err) {}
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    try {
      const range = document.createRange();
      range.setStart(el, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e2) {}
  }
}

export function mount(params = {}) {
  const noteId = params.id;
  if (noteId) {
    mountNoteDetail(noteId);
  } else {
    mountNotesList();
  }
}

function mountNotesList() {
  mountSidebar();

  const triggerCreateNote = async () => {
    const randomColor = PREMIUM_COVERS[Math.floor(Math.random() * PREMIUM_COVERS.length)];
    const randomEmoji = PREMIUM_EMOJIS[Math.floor(Math.random() * PREMIUM_EMOJIS.length)];
    
    const newNote = {
      title: 'Nueva Nota',
      content: '',
      coverColor: randomColor,
      emoji: randomEmoji
    };

    const saved = await store.saveNote(newNote);
    window.location.hash = `#/notes?id=${saved.id}`;
  };

  document.getElementById('btn-create-note-empty')?.addEventListener('click', triggerCreateNote);
  document.getElementById('btn-create-note-header')?.addEventListener('click', triggerCreateNote);

  document.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      window.location.hash = `#/notes?id=${id}`;
    });
  });
}

function mountNoteDetail(noteId) {
  const titleInput = document.getElementById('note-title-input');
  const contentEditor = document.getElementById('note-content-editor');
  const slashMenu = document.getElementById('notion-slash-menu');
  
  // Fill content editor innerHTML directly on mount
  const state = store.getState();
  const activeNote = state.notes?.find(n => n.id === noteId);
  if (activeNote && contentEditor) {
    contentEditor.innerHTML = activeNote.content || '';
  }

  // Autosave setup
  let autosaveTimeout = null;
  const triggerAutosave = () => {
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
      const state = store.getState();
      const currentNote = state.notes?.find(n => n.id === noteId);
      if (currentNote) {
        const updated = {
          ...currentNote,
          title: titleInput.value.trim() || 'Sin título',
          content: contentEditor.innerHTML
        };
        await store.saveNote(updated);
      }
    }, 400);
  };

  titleInput?.addEventListener('input', triggerAutosave);
  contentEditor?.addEventListener('input', triggerAutosave);

  // Keydown interceptor for "Enter" key on Headings (H1, H2, H3) -> creates clean line below
  contentEditor?.addEventListener('keydown', (e) => {
    const selection = window.getSelection();
    
    if (e.key === 'Enter') {
      if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        let targetEl = range.startContainer;
        if (targetEl.nodeType === Node.TEXT_NODE) {
          targetEl = targetEl.parentNode;
        }

        const headingNode = targetEl.closest('h1, h2, h3');

        // Inside a Heading -> Breakout to a clean normal line below
        if (headingNode) {
          e.preventDefault();
          const newBlock = document.createElement('div');
          newBlock.style.cssText = 'min-height: 24px; outline: none; margin: 6px 0;';
          newBlock.innerHTML = '<br>';
          
          headingNode.parentNode.insertBefore(newBlock, headingNode.nextSibling);
          focusAndPlaceCaretAtStart(newBlock);
          triggerAutosave();
          return;
        }
      }
    }
  });

  // Slash command logic for Headings only
  contentEditor?.addEventListener('input', () => {
    const selection = window.getSelection();
    if (selection.rangeCount && slashMenu) {
      const range = selection.getRangeAt(0);
      const text = range.startContainer.textContent || '';
      const offset = range.startOffset;
      const textBeforeCursor = text.substring(0, offset);

      const isSlash = textBeforeCursor.endsWith('/');
      const isStartOfLine = textBeforeCursor.length === 1 || 
                            textBeforeCursor[textBeforeCursor.length - 2] === ' ' || 
                            textBeforeCursor[textBeforeCursor.length - 2] === '\u00A0' ||
                            textBeforeCursor[textBeforeCursor.length - 2] === '\n';

      if (isSlash && isStartOfLine) {
        const dummy = document.createElement('span');
        dummy.innerHTML = '&#8203;';
        range.insertNode(dummy);
        const rect = dummy.getBoundingClientRect();
        dummy.parentNode.removeChild(dummy);

        const editorRect = contentEditor.getBoundingClientRect();
        
        const caretY = rect.bottom - editorRect.top + contentEditor.scrollTop + 4;
        const caretX = Math.min(contentEditor.clientWidth - 230, Math.max(0, rect.left - editorRect.left));

        slashMenu.style.top = `${caretY}px`;
        slashMenu.style.left = `${caretX}px`;
        slashMenu.style.display = 'block';
      } else {
        slashMenu.style.display = 'none';
      }
    }
  });

  // Global hide slash menu if clicked elsewhere
  document.addEventListener('click', (e) => {
    if (slashMenu && !slashMenu.contains(e.target) && e.target !== contentEditor) {
      slashMenu.style.display = 'none';
    }
  });

  // Prevent focus loss when clicking inside slash menu
  slashMenu?.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  // Handle slash items clicks for Headings (H1, H2, H3)
  document.querySelectorAll('.slash-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = item.dataset.type;

      // Delete the slash character in contenteditable
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.setStart(range.startContainer, range.startOffset - 1);
        range.deleteContents();
      }

      let blockHtml = '';
      switch (type) {
        case 'h1':
          blockHtml = `<h1 style="font-size: 26px; font-weight: 800; font-family: var(--font-serif); color: var(--text-primary); margin: 20px 0 8px 0; outline: none;">Encabezado 1</h1>`;
          break;
        case 'h2':
          blockHtml = `<h2 style="font-size: 21px; font-weight: 700; font-family: var(--font-serif); color: var(--text-primary); margin: 16px 0 6px 0; outline: none;">Encabezado 2</h2>`;
          break;
        case 'h3':
          blockHtml = `<h3 style="font-size: 17px; font-weight: 600; font-family: var(--font-serif); color: var(--text-primary); margin: 12px 0 4px 0; outline: none;">Encabezado 3</h3>`;
          break;
      }

      insertHTMLAtCursor(blockHtml);
      triggerAutosave();
      if (slashMenu) slashMenu.style.display = 'none';
    });
  });

  // Direct visual editor auto-focused on mount
  contentEditor?.focus();

  // Back button
  document.getElementById('btn-back-to-notes')?.addEventListener('click', () => {
    window.location.hash = '/notes';
  });

  // Delete button
  document.getElementById('btn-delete-note')?.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      await store.deleteNote(noteId);
      window.location.hash = '/notes';
    }
  });

  // Customize cover drawer
  const drawer = document.getElementById('cover-customizer-drawer');
  const btnOpenCustomizer = document.getElementById('btn-open-cover-customizer');
  const btnCloseCustomizer = document.getElementById('btn-close-customizer');
  const btnSaveCustomizer = document.getElementById('btn-save-customizer');

  let selectedColor = null;
  let selectedEmoji = null;

  btnOpenCustomizer?.addEventListener('click', () => {
    const state = store.getState();
    const currentNote = state.notes?.find(n => n.id === noteId);
    if (currentNote) {
      selectedColor = currentNote.coverColor || PREMIUM_COVERS[0];
      selectedEmoji = currentNote.emoji || '📝';
    }
    if (drawer) drawer.style.display = 'flex';
  });

  const closeDrawerFn = () => {
    if (drawer) drawer.style.display = 'none';
  };

  btnCloseCustomizer?.addEventListener('click', closeDrawerFn);

  document.querySelectorAll('.cover-preset-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.cover-preset-option').forEach(item => {
        item.style.borderColor = 'transparent';
      });
      el.style.borderColor = 'var(--text-primary)';
      selectedColor = el.dataset.color;
    });
  });

  document.querySelectorAll('.emoji-preset-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.emoji-preset-option').forEach(item => {
        item.style.borderColor = 'transparent';
      });
      el.style.borderColor = 'var(--text-primary)';
      selectedEmoji = el.dataset.emoji;
    });
  });

  btnSaveCustomizer?.addEventListener('click', async () => {
    const state = store.getState();
    const currentNote = state.notes?.find(n => n.id === noteId);
    if (currentNote && selectedColor && selectedEmoji) {
      const updated = {
        ...currentNote,
        coverColor: selectedColor,
        emoji: selectedEmoji
      };
      await store.saveNote(updated);

      const coverDiv = document.getElementById('note-detail-cover');
      const emojiDiv = document.getElementById('note-detail-emoji');
      if (coverDiv) coverDiv.style.background = selectedColor;
      if (emojiDiv) emojiDiv.textContent = selectedEmoji;
    }
    closeDrawerFn();
  });
}

export function unmount() {
}
