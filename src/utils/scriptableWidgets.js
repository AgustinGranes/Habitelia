/**
 * Generador de Scripts para Widgets de Scriptable (iOS / iPadOS)
 * Soporta tamaños: Small, Medium, Large
 * Conexión en vivo con Firestore REST API + Inyección de Datos Reales + Cache Local
 */

const FIREBASE_API_KEY = "AIzaSyBc3lceZRKbopUj5l8oa89op2r42C9NBdI";
const PROJECT_ID = "habitelia";

export function generateHabitsWidgetScript(userId = '', userName = 'Viajero', habitsData = [], todosData = []) {
  const initialBundle = {
    habits: habitsData || [],
    todos: todosData || []
  };
  const serializedInitial = JSON.stringify(initialBundle);

  return `// ==========================================
// HABITELIA - WIDGET DE HÁBITOS DE HOY
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

// Tu ID de usuario de Habitelia (o pasado por el campo Parameter en iOS)
const USER_ID = (args.widgetParameter && args.widgetParameter.trim()) || "${userId}";
const PROJECT_ID = "${PROJECT_ID}";
const API_KEY = "${FIREBASE_API_KEY}";

// Datos reales de tu cuenta al momento de generar el script
const INITIAL_DATA = JSON.parse(${JSON.stringify(serializedInitial)});

// Paleta de Colores Obsidian Luxury
const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");
const GREEN = new Color("#30D158");
const RED = new Color("#FF453A");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_today_v3_" + (USER_ID || "me") + ".json");
  
  if (USER_ID) {
    // 1. Intentar cargar desde public_widgets con API Key
    try {
      const url1 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/public_widgets/\${USER_ID}?key=\${API_KEY}\`;
      const req1 = new Request(url1);
      req1.timeoutInterval = 5;
      const res1 = await req1.loadJSON();
      if (res1 && res1.fields && res1.fields.payload) {
        const parsed = JSON.parse(res1.fields.payload.stringValue);
        if (parsed) {
          fm.writeString(cachePath, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch(e) {}

    // 2. Intentar cargar desde users/widgetData con API Key
    try {
      const url2 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/widgetData/main?key=\${API_KEY}\`;
      const req2 = new Request(url2);
      req2.timeoutInterval = 5;
      const res2 = await req2.loadJSON();
      if (res2 && res2.fields && res2.fields.payload) {
        const parsed = JSON.parse(res2.fields.payload.stringValue);
        if (parsed) {
          fm.writeString(cachePath, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch(e) {}
  }

  // 3. Fallback: Cache local
  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (cached) return cached;
    } catch(e) {}
  }

  // 4. Fallback: Datos iniciales
  return INITIAL_DATA || { habits: [], todos: [] };
}

async function createWidget() {
  const rawData = await loadData();
  const habitsList = Array.isArray(rawData) ? rawData : (rawData.habits || []);
  const todosList = Array.isArray(rawData) ? [] : (rawData.todos || []);

  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(14, 14, 14, 14);

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  const todayStr = \`\${year}-\${month}-\${date}\`;
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dayName = dayNames[today.getDay()];
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayKey = dayKeys[today.getDay()];

  // 1. Filtrar hábitos de hoy (IGNORAR COMPLETAMENTE LOS ELIMINADOS)
  const activeHabits = [];
  habitsList.forEach(h => {
    // Chequear frecuencia semanal
    if (h.frequency && h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
      if (!h.frequency.days.includes(todayDayKey)) return;
    }

    const completionStatus = h.completions ? h.completions[todayStr] : null;
    const isDeleted = h.isDeletedToday || completionStatus === 'deleted_today' || completionStatus === 'deleted';
    
    // Si fue eliminado, NO MOSTRAR NUNCA
    if (isDeleted) return;

    const isDone = completionStatus === 'completed' || completionStatus === 'completed_2min';
    const isSkipped = completionStatus === 'skipped';

    const habitTime = (h.timePerDay && h.timePerDay[todayDayKey]) || 
                      (h.cue && h.cue.timePerDay && h.cue.timePerDay[todayDayKey]) || 
                      h.time || 
                      (h.cue && h.cue.time) || 
                      null;

    let dotSymbol = "○ ";
    let dotColor = TEXT_MUTED;
    let displayName = h.name || "Hábito";
    let nameColor = TEXT_PRIMARY;

    if (isSkipped) {
      dotSymbol = "● ";
      dotColor = RED;
      nameColor = new Color("#FF9E96");
    } else if (isDone) {
      dotSymbol = "● ";
      dotColor = GREEN;
      nameColor = TEXT_MUTED;
    }

    activeHabits.push({
      id: h.id,
      name: displayName,
      time: habitTime,
      type: 'habit',
      isDone,
      isSkipped,
      dotSymbol,
      dotColor,
      nameColor
    });
  });

  // 2. Filtrar tareas To-Do de hoy
  const activeTodos = [];
  todosList.forEach(t => {
    const isDueToday = t.dueDate === todayStr;
    const isRoutine = !t.dueDate && t.showInRoutine;
    const isPendingNoDate = !t.dueDate && !t.completed;

    if (!isDueToday && !isRoutine && !isPendingNoDate) return;

    const isDone = !!t.completed;
    let dotSymbol = isDone ? "✓ " : "□ ";
    let dotColor = isDone ? GREEN : TEXT_MUTED;
    let displayName = t.name || t.text || "Tarea";
    let nameColor = isDone ? TEXT_MUTED : TEXT_PRIMARY;

    activeTodos.push({
      id: t.id,
      name: displayName,
      time: t.time || null,
      tag: t.tag || '',
      type: 'todo',
      isDone,
      isSkipped: false,
      dotSymbol,
      dotColor,
      nameColor
    });
  });

  // ORDEN EXACTO SOLICITADO:
  // 1. Hábitos CON horario (ordenados por horario ascendente)
  const habitsWithTime = activeHabits
    .filter(h => !!h.time)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // 2. Hábitos SIN horario
  const habitsWithoutTime = activeHabits.filter(h => !h.time);

  // 3. Tareas To-Do
  const todosForToday = activeTodos.sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });

  // Lista combinada final ordenada
  const processedItems = [...habitsWithTime, ...habitsWithoutTime, ...todosForToday];

  if (processedItems.length === 0) {
    processedItems.push({
      id: 'empty',
      name: 'Sin actividades para hoy',
      time: null,
      type: 'empty',
      isDone: true,
      dotSymbol: '✨ ',
      dotColor: GREEN,
      nameColor: TEXT_MUTED
    });
  }

  const total = processedItems.filter(i => i.type !== 'empty').length || 1;
  const completedCount = processedItems.filter(i => i.isDone && i.type !== 'empty').length;
  const percent = Math.round((completedCount / total) * 100);
  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    // SMALL WIDGET
    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    
    const titleText = headerStack.addText("HABITELIA");
    titleText.font = Font.boldSystemFont(11);
    titleText.textColor = TEXT_PRIMARY;
    headerStack.addSpacer();
    
    const dateText = headerStack.addText(\`\${dayName} \${today.getDate()}\`);
    dateText.font = Font.systemFont(10);
    dateText.textColor = TEXT_MUTED;
    
    widget.addSpacer(6);

    const progressStack = widget.addStack();
    progressStack.layoutHorizontally();
    progressStack.centerAlignContent();
    
    const pctText = progressStack.addText(\`\${percent}%\`);
    pctText.font = Font.boldSystemFont(22);
    pctText.textColor = TEXT_PRIMARY;
    
    progressStack.addSpacer();
    const countText = progressStack.addText(\`\${completedCount}/\${total}\`);
    countText.font = Font.systemFont(12);
    countText.textColor = TEXT_MUTED;

    widget.addSpacer(6);

    processedItems.slice(0, 2).forEach(item => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      
      const symbol = row.addText(item.dotSymbol);
      symbol.font = Font.systemFont(11);
      symbol.textColor = item.dotColor;
      
      const name = row.addText(item.name);
      name.font = Font.systemFont(11);
      name.textColor = item.nameColor;
      name.lineLimit = 1;
      widget.addSpacer(2);
    });

  } else if (widgetFamily === "medium") {
    // MEDIUM WIDGET
    const mainStack = widget.addStack();
    mainStack.layoutHorizontally();
    mainStack.centerAlignContent();

    const leftCol = mainStack.addStack();
    leftCol.layoutVertically();
    leftCol.size = new Size(110, 0);

    const title = leftCol.addText("HABITELIA");
    title.font = Font.boldSystemFont(12);
    title.textColor = TEXT_PRIMARY;

    const sub = leftCol.addText(\`\${dayName} \${today.getDate()}\`);
    sub.font = Font.systemFont(10);
    sub.textColor = TEXT_MUTED;

    leftCol.addSpacer(10);

    const pct = leftCol.addText(\`\${percent}%\`);
    pct.font = Font.boldSystemFont(28);
    pct.textColor = TEXT_PRIMARY;

    const progLabel = leftCol.addText(\`\${completedCount} de \${total} listos\`);
    progLabel.font = Font.systemFont(10);
    progLabel.textColor = TEXT_MUTED;

    mainStack.addSpacer(14);

    const rightCol = mainStack.addStack();
    rightCol.layoutVertically();
    
    processedItems.slice(0, 4).forEach((item, idx) => {
      const row = rightCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      
      const dot = row.addText(item.dotSymbol);
      dot.font = Font.systemFont(12);
      dot.textColor = item.dotColor;

      const name = row.addText(item.name);
      name.font = Font.mediumSystemFont(12);
      name.textColor = item.nameColor;
      name.lineLimit = 1;

      row.addSpacer();

      const metaText = item.time || item.tag || (item.type === 'todo' ? 'To-Do' : '');
      if (metaText) {
        const timeText = row.addText(metaText);
        timeText.font = Font.systemFont(10);
        timeText.textColor = TEXT_MUTED;
      }

      if (idx < 3) rightCol.addSpacer(4);
    });

  } else {
    // LARGE WIDGET
    const header = widget.addStack();
    header.layoutHorizontally();
    header.centerAlignContent();

    const title = header.addText("HABITELIA");
    title.font = Font.boldSystemFont(16);
    title.textColor = TEXT_PRIMARY;

    header.addSpacer();

    const date = header.addText(\`\${dayName} \${today.getDate()}\`);
    date.font = Font.boldSystemFont(12);
    date.textColor = TEXT_MUTED;

    widget.addSpacer(12);

    const progCard = widget.addStack();
    progCard.layoutHorizontally();
    progCard.backgroundColor = CARD_BG;
    progCard.cornerRadius = 10;
    progCard.setPadding(10, 12, 10, 12);
    progCard.centerAlignContent();

    const pLeft = progCard.addStack();
    pLeft.layoutVertically();
    const pTitle = pLeft.addText("ACTIVIDADES DE HOY");
    pTitle.font = Font.boldSystemFont(10);
    pTitle.textColor = TEXT_MUTED;
    const pCount = pLeft.addText(\`\${completedCount} de \${total} completadas\`);
    pCount.font = Font.systemFont(12);
    pCount.textColor = TEXT_PRIMARY;

    progCard.addSpacer();

    const pNum = progCard.addText(\`\${percent}%\`);
    pNum.font = Font.boldSystemFont(22);
    pNum.textColor = TEXT_PRIMARY;

    widget.addSpacer(12);

    processedItems.slice(0, 8).forEach((item, idx) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.backgroundColor = CARD_BG;
      row.cornerRadius = 8;
      row.setPadding(6, 10, 6, 10);

      const dot = row.addText(item.dotSymbol);
      dot.font = Font.boldSystemFont(13);
      dot.textColor = item.dotColor;

      const name = row.addText(item.name);
      name.font = Font.mediumSystemFont(12.5);
      name.textColor = item.nameColor;
      name.lineLimit = 1;

      row.addSpacer();

      const metaText = item.time || item.tag || (item.type === 'todo' ? 'To-Do' : '');
      if (metaText) {
        const time = row.addText(metaText);
        time.font = Font.systemFont(11);
        time.textColor = TEXT_MUTED;
      }

      if (idx < 7) widget.addSpacer(4);
    });
  }

  return widget;
}

async function run() {
  try {
    const widget = await createWidget();
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      widget.presentMedium();
    }
  } catch (err) {
    console.error("Error ejecutando widget: " + err);
  } finally {
    Script.complete();
  }
}

await run();
`;
}
