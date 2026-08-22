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

export function generateTodosWidgetScript(userId = '', userName = 'Viajero', todosData = []) {
  const serializedInitial = JSON.stringify(todosData || []);

  return `// ==========================================
// HABITELIA - WIDGET DE TAREAS (TO-DO)
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = (args.widgetParameter && args.widgetParameter.trim()) || "${userId}";
const PROJECT_ID = "${PROJECT_ID}";
const API_KEY = "${FIREBASE_API_KEY}";

const INITIAL_DATA = JSON.parse(${JSON.stringify(serializedInitial)});

const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_todos_" + (USER_ID || "me") + ".json");

  if (USER_ID) {
    try {
      const url1 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/public_widgets/\${USER_ID}?key=\${API_KEY}\`;
      const req1 = new Request(url1);
      req1.timeoutInterval = 5;
      const res1 = await req1.loadJSON();
      if (res1 && res1.fields && res1.fields.payload) {
        const parsed = JSON.parse(res1.fields.payload.stringValue);
        if (parsed && parsed.todos) {
          fm.writeString(cachePath, JSON.stringify(parsed.todos));
          return parsed.todos;
        }
      }
    } catch(e) {}

    try {
      const url2 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/widgetData/main?key=\${API_KEY}\`;
      const req2 = new Request(url2);
      req2.timeoutInterval = 5;
      const res2 = await req2.loadJSON();
      if (res2 && res2.fields && res2.fields.payload) {
        const parsed = JSON.parse(res2.fields.payload.stringValue);
        if (parsed && parsed.todos) {
          fm.writeString(cachePath, JSON.stringify(parsed.todos));
          return parsed.todos;
        }
      }
    } catch(e) {}
  }

  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (cached && cached.length > 0) return cached;
    } catch(e) {}
  }

  if (Array.isArray(INITIAL_DATA) && INITIAL_DATA.length > 0) {
    return INITIAL_DATA;
  }

  return [
    { name: "Sin tareas pendientes", completed: false, tag: "Habitelia" }
  ];
}

async function createWidget() {
  const todos = await loadData();
  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(14, 14, 14, 14);

  const pendingTodos = todos.filter(t => !t.completed);
  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("TO-DO");
    title.font = Font.boldSystemFont(11);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const countBadge = header.addText(\`\${pendingTodos.length} pend.\`);
    countBadge.font = Font.boldSystemFont(10);
    countBadge.textColor = TEXT_MUTED;

    widget.addSpacer(8);

    pendingTodos.slice(0, 3).forEach((t, i) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      const dot = row.addText("□ ");
      dot.font = Font.systemFont(11);
      dot.textColor = TEXT_PRIMARY;
      const text = row.addText(t.name || "Tarea");
      text.font = Font.systemFont(11);
      text.textColor = TEXT_PRIMARY;
      text.lineLimit = 1;
      if (i < 2) widget.addSpacer(4);
    });

  } else if (widgetFamily === "medium") {
    const header = widget.addStack();
    header.layoutHorizontally();
    header.centerAlignContent();
    const title = header.addText("HABITELIA TO-DO");
    title.font = Font.boldSystemFont(12);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const countBadge = header.addText(\`\${pendingTodos.length} tareas pendientes\`);
    countBadge.font = Font.systemFont(11);
    countBadge.textColor = TEXT_MUTED;

    widget.addSpacer(10);

    pendingTodos.slice(0, 4).forEach((t, idx) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      
      const check = row.addText("□ ");
      check.font = Font.systemFont(13);
      check.textColor = TEXT_PRIMARY;

      const name = row.addText(t.name || "Tarea");
      name.font = Font.mediumSystemFont(12);
      name.textColor = TEXT_PRIMARY;
      name.lineLimit = 1;

      row.addSpacer();

      if (t.tag) {
        const tag = row.addText(t.tag);
        tag.font = Font.systemFont(10);
        tag.textColor = TEXT_MUTED;
      }

      if (idx < 3) widget.addSpacer(5);
    });

  } else {
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("HABITELIA TO-DO");
    title.font = Font.boldSystemFont(16);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const badge = header.addText(\`\${pendingTodos.length} pendientes\`);
    badge.font = Font.boldSystemFont(12);
    badge.textColor = TEXT_MUTED;

    widget.addSpacer(12);

    pendingTodos.slice(0, 8).forEach((t, idx) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.backgroundColor = CARD_BG;
      row.cornerRadius = 8;
      row.setPadding(8, 10, 8, 10);

      const check = row.addText("□ ");
      check.font = Font.systemFont(14);
      check.textColor = TEXT_PRIMARY;

      const name = row.addText(t.name || "Tarea");
      name.font = Font.mediumSystemFont(12.5);
      name.textColor = TEXT_PRIMARY;
      name.lineLimit = 1;

      row.addSpacer();

      if (t.tag) {
        const tag = row.addText(t.tag);
        tag.font = Font.systemFont(10);
        tag.textColor = TEXT_MUTED;
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

export function generateDriverWidgetScript(userId = '', userName = 'Viajero', driverData = null) {
  const serializedInitial = JSON.stringify(driverData || {
    name: userName,
    number: "01",
    team: "Habitelia Racing",
    ovr: 60,
    completedHabitsCounter: 0,
    incidents: 0
  });

  return `// ==========================================
// HABITELIA - WIDGET DE TU PILOTO / DRIVER
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = (args.widgetParameter && args.widgetParameter.trim()) || "${userId}";
const PROJECT_ID = "${PROJECT_ID}";
const API_KEY = "${FIREBASE_API_KEY}";

const INITIAL_DATA = JSON.parse(${JSON.stringify(serializedInitial)});

const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_driver_" + (USER_ID || "me") + ".json");

  if (USER_ID) {
    try {
      const url1 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/public_widgets/\${USER_ID}?key=\${API_KEY}\`;
      const req1 = new Request(url1);
      req1.timeoutInterval = 5;
      const res1 = await req1.loadJSON();
      if (res1 && res1.fields && res1.fields.payload) {
        const parsed = JSON.parse(res1.fields.payload.stringValue);
        if (parsed && parsed.driverProfile) {
          fm.writeString(cachePath, JSON.stringify(parsed.driverProfile));
          return parsed.driverProfile;
        }
      }
    } catch(e) {}

    try {
      const url2 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/widgetData/main?key=\${API_KEY}\`;
      const req2 = new Request(url2);
      req2.timeoutInterval = 5;
      const res2 = await req2.loadJSON();
      if (res2 && res2.fields && res2.fields.payload) {
        const parsed = JSON.parse(res2.fields.payload.stringValue);
        if (parsed && parsed.driverProfile) {
          fm.writeString(cachePath, JSON.stringify(parsed.driverProfile));
          return parsed.driverProfile;
        }
      }
    } catch(e) {}
  }

  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (cached && cached.name) return cached;
    } catch(e) {}
  }

  if (INITIAL_DATA && INITIAL_DATA.name) {
    return INITIAL_DATA;
  }

  return {
    name: "${userName}",
    number: "01",
    team: "Habitelia Racing",
    ovr: 60,
    completedHabitsCounter: 0,
    incidents: 0
  };
}

async function createWidget() {
  const driver = await loadData();
  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(14, 14, 14, 14);

  const counter = driver.completedHabitsCounter || 0;
  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    const title = widget.addText("TU PILOTO");
    title.font = Font.boldSystemFont(10);
    title.textColor = TEXT_MUTED;

    widget.addSpacer(6);

    const name = widget.addText(driver.name || "Piloto");
    name.font = Font.boldSystemFont(14);
    name.textColor = TEXT_PRIMARY;
    name.lineLimit = 1;

    widget.addSpacer(6);

    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    const ovrBox = row.addStack();
    ovrBox.backgroundColor = CARD_BG;
    ovrBox.cornerRadius = 8;
    ovrBox.setPadding(4, 8, 4, 8);
    const ovrVal = ovrBox.addText(\`OVR \${driver.ovr || 60}\`);
    ovrVal.font = Font.boldSystemFont(14);
    ovrVal.textColor = TEXT_PRIMARY;

    row.addSpacer();
    const num = row.addText(\`#\${driver.number || "01"}\`);
    num.font = Font.boldSystemFont(16);
    num.textColor = TEXT_MUTED;

    widget.addSpacer(6);
    const prog = widget.addText(\`Progreso +1: \${counter}/10\`);
    prog.font = Font.systemFont(10);
    prog.textColor = TEXT_MUTED;

  } else if (widgetFamily === "medium") {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    const ovrBox = row.addStack();
    ovrBox.size = new Size(54, 54);
    ovrBox.backgroundColor = CARD_BG;
    ovrBox.cornerRadius = 12;
    ovrBox.layoutVertically();
    ovrBox.centerAlignContent();
    const ovrNum = ovrBox.addText(\`\${driver.ovr || 60}\`);
    ovrNum.font = Font.boldSystemFont(22);
    ovrNum.textColor = TEXT_PRIMARY;
    ovrNum.centerAlignText();
    const ovrLbl = ovrBox.addText("OVR");
    ovrLbl.font = Font.boldSystemFont(9);
    ovrLbl.textColor = TEXT_MUTED;
    ovrLbl.centerAlignText();

    row.addSpacer(12);

    const info = row.addStack();
    info.layoutVertically();

    const nameRow = info.addStack();
    nameRow.layoutHorizontally();
    const pName = nameRow.addText(driver.name || "Piloto");
    pName.font = Font.boldSystemFont(16);
    pName.textColor = TEXT_PRIMARY;
    nameRow.addSpacer();
    const num = nameRow.addText(\`#\${driver.number || "01"}\`);
    num.font = Font.boldSystemFont(16);
    num.textColor = TEXT_MUTED;

    const team = info.addText(driver.team || "Habitelia Racing");
    team.font = Font.systemFont(11);
    team.textColor = TEXT_MUTED;

    info.addSpacer(6);

    const progText = info.addText(\`Progreso hacia +1 OVR: \${counter}/10 hábitos\`);
    progText.font = Font.systemFont(11);
    progText.textColor = TEXT_PRIMARY;

  } else {
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("FICHA DE PILOTO");
    title.font = Font.boldSystemFont(14);
    title.textColor = TEXT_MUTED;
    header.addSpacer();
    const num = header.addText(\`#\${driver.number || "01"}\`);
    num.font = Font.boldSystemFont(18);
    num.textColor = TEXT_PRIMARY;

    widget.addSpacer(10);

    const card = widget.addStack();
    card.backgroundColor = CARD_BG;
    card.cornerRadius = 14;
    card.setPadding(14, 16, 14, 16);
    card.layoutHorizontally();
    card.centerAlignContent();

    const ovrBox = card.addStack();
    ovrBox.size = new Size(60, 60);
    ovrBox.backgroundColor = new Color("#222228");
    ovrBox.cornerRadius = 12;
    ovrBox.layoutVertically();
    ovrBox.centerAlignContent();
    const ovrNum = ovrBox.addText(\`\${driver.ovr || 60}\`);
    ovrNum.font = Font.boldSystemFont(26);
    ovrNum.textColor = TEXT_PRIMARY;
    ovrNum.centerAlignText();
    const ovrLbl = ovrBox.addText("OVR");
    ovrLbl.font = Font.boldSystemFont(10);
    ovrLbl.textColor = TEXT_MUTED;
    ovrLbl.centerAlignText();

    card.addSpacer(14);

    const info = card.addStack();
    info.layoutVertically();
    const pName = info.addText(driver.name || "Piloto");
    pName.font = Font.boldSystemFont(18);
    pName.textColor = TEXT_PRIMARY;
    const team = info.addText(driver.team || "Habitelia Racing");
    team.font = Font.systemFont(12);
    team.textColor = TEXT_MUTED;

    widget.addSpacer(16);

    const stat1 = widget.addText(\`🎯 Progreso al siguiente punto: \${counter}/10 hábitos\`);
    stat1.font = Font.systemFont(13);
    stat1.textColor = TEXT_PRIMARY;

    widget.addSpacer(8);

    const stat2 = widget.addText(\`⚠️ Incidentes registrados: \${driver.incidents || 0}\`);
    stat2.font = Font.systemFont(13);
    stat2.textColor = TEXT_MUTED;
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

export function generateNotesWidgetScript(userId = '', userName = 'Viajero', notesData = []) {
  const serializedInitial = JSON.stringify(notesData || []);

  return `// ==========================================
// HABITELIA - WIDGET DE NOTAS
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = (args.widgetParameter && args.widgetParameter.trim()) || "${userId}";
const PROJECT_ID = "${PROJECT_ID}";
const API_KEY = "${FIREBASE_API_KEY}";

const INITIAL_DATA = JSON.parse(${JSON.stringify(serializedInitial)});

const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_notes_" + (USER_ID || "me") + ".json");

  if (USER_ID) {
    try {
      const url1 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/public_widgets/\${USER_ID}?key=\${API_KEY}\`;
      const req1 = new Request(url1);
      req1.timeoutInterval = 5;
      const res1 = await req1.loadJSON();
      if (res1 && res1.fields && res1.fields.payload) {
        const parsed = JSON.parse(res1.fields.payload.stringValue);
        if (parsed && parsed.notes) {
          fm.writeString(cachePath, JSON.stringify(parsed.notes));
          return parsed.notes;
        }
      }
    } catch(e) {}

    try {
      const url2 = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/widgetData/main?key=\${API_KEY}\`;
      const req2 = new Request(url2);
      req2.timeoutInterval = 5;
      const res2 = await req2.loadJSON();
      if (res2 && res2.fields && res2.fields.payload) {
        const parsed = JSON.parse(res2.fields.payload.stringValue);
        if (parsed && parsed.notes) {
          fm.writeString(cachePath, JSON.stringify(parsed.notes));
          return parsed.notes;
        }
      }
    } catch(e) {}
  }

  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (cached && cached.length > 0) return cached;
    } catch(e) {}
  }

  if (Array.isArray(INITIAL_DATA) && INITIAL_DATA.length > 0) {
    return INITIAL_DATA;
  }

  return [
    { title: "Sin notas creadas", emoji: "📝" }
  ];
}

async function createWidget() {
  const notes = await loadData();
  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(14, 14, 14, 14);

  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("NOTAS");
    title.font = Font.boldSystemFont(11);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const count = header.addText(\`\${notes.length}\`);
    count.font = Font.boldSystemFont(10);
    count.textColor = TEXT_MUTED;

    widget.addSpacer(8);

    notes.slice(0, 3).forEach((n, i) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      const em = row.addText(\`\${n.emoji || "📝"} \`);
      em.font = Font.systemFont(11);
      const text = row.addText(n.title || "Nota");
      text.font = Font.systemFont(11);
      text.textColor = TEXT_PRIMARY;
      text.lineLimit = 1;
      if (i < 2) widget.addSpacer(4);
    });

  } else if (widgetFamily === "medium") {
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("HABITELIA NOTAS");
    title.font = Font.boldSystemFont(12);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const badge = header.addText(\`\${notes.length} notas guardadas\`);
    badge.font = Font.systemFont(11);
    badge.textColor = TEXT_MUTED;

    widget.addSpacer(10);

    notes.slice(0, 4).forEach((n, idx) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      
      const em = row.addText(\`\${n.emoji || "📝"} \`);
      em.font = Font.systemFont(13);

      const name = row.addText(n.title || "Nota");
      name.font = Font.mediumSystemFont(12);
      name.textColor = TEXT_PRIMARY;
      name.lineLimit = 1;

      if (idx < 3) widget.addSpacer(5);
    });

  } else {
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("HABITELIA NOTAS");
    title.font = Font.boldSystemFont(16);
    title.textColor = TEXT_PRIMARY;
    header.addSpacer();
    const badge = header.addText(\`\${notes.length} notas\`);
    badge.font = Font.boldSystemFont(12);
    badge.textColor = TEXT_MUTED;

    widget.addSpacer(12);

    notes.slice(0, 8).forEach((n, idx) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.backgroundColor = CARD_BG;
      row.cornerRadius = 8;
      row.setPadding(8, 10, 8, 10);

      const em = row.addText(\`\${n.emoji || "📝"} \`);
      em.font = Font.systemFont(14);

      const name = row.addText(n.title || "Nota");
      name.font = Font.mediumSystemFont(12.5);
      name.textColor = TEXT_PRIMARY;
      name.lineLimit = 1;

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
