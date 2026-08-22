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
    lastName: userName,
    number: "86",
    countryFlag: "🇦🇷",
    team: "Apex",
    ovr: 50,
    seasons: 1,
    wins: 0,
    podiums: 0,
    points: 0,
    marketValue: "4.5",
    completedHabitsCounter: 0
  });

  return `// ==========================================
// HABITELIA - WIDGET DE TU PILOTO (F1 RACING)
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = (args.widgetParameter && args.widgetParameter.trim()) || "${userId}";
const PROJECT_ID = "${PROJECT_ID}";
const API_KEY = "${FIREBASE_API_KEY}";

const INITIAL_DATA = JSON.parse(${JSON.stringify(serializedInitial)});

// Paleta de colores Luxury F1
const BG_COLOR = new Color("#0A0A0A");
const CARD_BG = new Color("#141417");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");
const TEXT_SECONDARY = new Color("#A1A1AA");

const TEAMS_DATA = {
  Apex: { name: 'Apex', category: 'F4' },
  Rodin: { name: 'Rodin', category: 'F4' },
  Jenzer: { name: 'Jenzer', category: 'F4' },
  Van: { name: 'Van Amersfoort', category: 'F3' },
  Trident: { name: 'Trident', category: 'F3' },
  MP: { name: 'MP Motorsport', category: 'F3' },
  Campos: { name: 'Campos Racing', category: 'F2' },
  Hitech: { name: 'Hitech GP', category: 'F2' },
  DAMS: { name: 'DAMS Racing', category: 'F2' },
  Haas: { name: 'Haas F1', category: 'F1' },
  Sauber: { name: 'Sauber / Kick', category: 'F1' },
  Williams: { name: 'Williams Racing', category: 'F1' },
  Alpine: { name: 'Alpine F1', category: 'F1' },
  Racing: { name: 'Racing Bulls', category: 'F1' },
  Aston: { name: 'Aston Martin', category: 'F1' },
  McLaren: { name: 'McLaren F1', category: 'F1' },
  Ferrari: { name: 'Scuderia Ferrari', category: 'F1' },
  RedBull: { name: 'Red Bull Racing', category: 'F1' },
  Mercedes: { name: 'Mercedes-AMG', category: 'F1' }
};

function getTeamForOVR(ovr) {
  if (ovr >= 95) return 'Mercedes';
  if (ovr >= 90) return 'Ferrari';
  if (ovr >= 86) return 'McLaren';
  if (ovr >= 83) return 'Racing';
  if (ovr >= 80) return 'Alpine';
  if (ovr >= 75) return 'Hitech';
  if (ovr >= 70) return 'Campos';
  if (ovr >= 65) return 'Trident';
  if (ovr >= 60) return 'Van';
  if (ovr >= 55) return 'Rodin';
  return 'Apex';
}

function getOVRColor(ovr) {
  if (ovr >= 90) return new Color("#7CDEDC"); // Neon Cyan / Teal
  if (ovr >= 80) return new Color("#D69E2E"); // Amarillo / Gold
  if (ovr >= 65) return new Color("#DD6B20"); // Naranja
  return new Color("#E53E3E"); // Rojo
}

function isDarkOvrText(ovr) {
  return ovr >= 90;
}

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_driver_v3_" + (USER_ID || "me") + ".json");

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
      if (cached && (cached.name || cached.ovr)) return cached;
    } catch(e) {}
  }

  return INITIAL_DATA || { ovr: 50, name: "${userName}" };
}

async function createWidget() {
  const driver = await loadData();
  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(12, 12, 12, 12);

  const ovr = driver.ovr || 50;
  const ovrBg = getOVRColor(ovr);
  const darkText = isDarkOvrText(ovr);
  const ovrTextColor = darkText ? new Color("#0F172A") : new Color("#FFFFFF");

  const teamKey = driver.teamKey || driver.team || getTeamForOVR(ovr);
  const teamInfo = TEAMS_DATA[teamKey] || { name: driver.team || teamKey || 'Apex', category: driver.category || 'F4' };
  const teamName = driver.team || teamInfo.name;
  const category = driver.category || teamInfo.category;

  const marketValNum = driver.marketValue || Math.max(2.5, ((ovr - 40) * 0.45)).toFixed(1);
  const marketValue = String(marketValNum).startsWith('€') ? marketValNum : (String(marketValNum).endsWith('M') ? `€${marketValNum}` : `€${marketValNum}M`);

  const seasons = driver.seasons || 1;
  const counter = driver.completedHabitsCounter || 0;
  const wins = (driver.wins !== undefined && driver.wins !== null) ? driver.wins : Math.max(0, Math.floor(counter * 0.15 + (ovr >= 80 ? (ovr - 75) * 0.8 : 0)));
  const podiums = (driver.podiums !== undefined && driver.podiums !== null) ? driver.podiums : Math.max(wins, Math.floor(counter * 0.35 + (ovr >= 70 ? (ovr - 65) * 1.2 : 0)));
  const points = (driver.points !== undefined && driver.points !== null) ? driver.points : Math.max(0, Math.floor(counter * 6 + wins * 25 + podiums * 15 + (seasons - 1) * 150));

  const flag = driver.countryFlag || '🇦🇷';
  const driverLastName = (driver.lastName || driver.name || "${userName}" || 'PILOTO').toUpperCase();
  const number = driver.number || '86';

  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    // Top Bar: Flag + Name + #Number
    const topRow = widget.addStack();
    topRow.layoutHorizontally();
    topRow.centerAlignContent();

    const flagText = topRow.addText(\`\${flag} \`);
    flagText.font = Font.systemFont(12);

    const nameText = topRow.addText(driverLastName);
    nameText.font = Font.boldSystemFont(11.5);
    nameText.textColor = TEXT_PRIMARY;
    nameText.lineLimit = 1;

    topRow.addSpacer();

    const numBadge = topRow.addStack();
    numBadge.backgroundColor = new Color("#FFFFFF");
    numBadge.cornerRadius = 4;
    numBadge.setPadding(1, 4, 1, 4);
    const numText = numBadge.addText(\`#\${number}\`);
    numText.font = Font.boldSystemFont(9.5);
    numText.textColor = new Color("#000000");

    widget.addSpacer(6);

    // Center Row: Centered OVR Square + Team/Category Info
    const centerRow = widget.addStack();
    centerRow.layoutHorizontally();
    centerRow.centerAlignContent();

    // 100% Centered OVR Box
    const ovrBox = centerRow.addStack();
    ovrBox.size = new Size(48, 48);
    ovrBox.backgroundColor = ovrBg;
    ovrBox.cornerRadius = 10;
    ovrBox.layoutVertically();
    ovrBox.setPadding(0, 0, 0, 0);

    ovrBox.addSpacer();

    const lblRow = ovrBox.addStack();
    lblRow.layoutHorizontally();
    lblRow.addSpacer();
    const ovrLbl = lblRow.addText("OVR");
    ovrLbl.font = Font.boldSystemFont(8.5);
    ovrLbl.textColor = ovrTextColor;
    lblRow.addSpacer();

    ovrBox.addSpacer(1);

    const valRow = ovrBox.addStack();
    valRow.layoutHorizontally();
    valRow.addSpacer();
    const ovrVal = valRow.addText(\`\${ovr}\`);
    ovrVal.font = Font.boldSystemFont(21);
    ovrVal.textColor = ovrTextColor;
    valRow.addSpacer();

    ovrBox.addSpacer();

    centerRow.addSpacer(8);

    // Category - Team & Market Value
    const infoCol = centerRow.addStack();
    infoCol.layoutVertically();

    const catBadge = infoCol.addText(\`\${category} - \${teamName}\`);
    catBadge.font = Font.boldSystemFont(10);
    catBadge.textColor = TEXT_PRIMARY;
    catBadge.lineLimit = 1;

    infoCol.addSpacer(2);

    const valText = infoCol.addText(\`Val: \${marketValue}\`);
    valText.font = Font.systemFont(10);
    valText.textColor = TEXT_SECONDARY;

    widget.addSpacer(8);

    // Bottom Stats Bar (VCT, POD, PTS)
    const statsBar = widget.addStack();
    statsBar.layoutHorizontally();
    statsBar.backgroundColor = CARD_BG;
    statsBar.cornerRadius = 6;
    statsBar.setPadding(4, 6, 4, 6);
    statsBar.centerAlignContent();

    const s1 = statsBar.addText(\`T:\${seasons}\`);
    s1.font = Font.boldSystemFont(9);
    s1.textColor = TEXT_SECONDARY;

    statsBar.addSpacer();
    const s2 = statsBar.addText(\`V:\${wins}\`);
    s2.font = Font.boldSystemFont(9);
    s2.textColor = TEXT_PRIMARY;

    statsBar.addSpacer();
    const s3 = statsBar.addText(\`P:\${podiums}\`);
    s3.font = Font.boldSystemFont(9);
    s3.textColor = TEXT_PRIMARY;

    statsBar.addSpacer();
    const s4 = statsBar.addText(\`PTS:\${points}\`);
    s4.font = Font.boldSystemFont(9);
    s4.textColor = TEXT_PRIMARY;

  } else if (widgetFamily === "medium") {
    // MEDIUM WIDGET
    const mainRow = widget.addStack();
    mainRow.layoutHorizontally();
    mainRow.centerAlignContent();

    // Left Column: OVR Box (100% Centered Horizontal & Vertical)
    const leftCol = mainRow.addStack();
    leftCol.layoutVertically();
    leftCol.centerAlignContent();
    leftCol.size = new Size(68, 0);

    const ovrBox = leftCol.addStack();
    ovrBox.size = new Size(64, 64);
    ovrBox.backgroundColor = ovrBg;
    ovrBox.cornerRadius = 14;
    ovrBox.layoutVertically();
    ovrBox.setPadding(0, 0, 0, 0);

    ovrBox.addSpacer();

    const lblRow = ovrBox.addStack();
    lblRow.layoutHorizontally();
    lblRow.addSpacer();
    const ovrLbl = lblRow.addText("OVR");
    ovrLbl.font = Font.boldSystemFont(10);
    ovrLbl.textColor = ovrTextColor;
    lblRow.addSpacer();

    ovrBox.addSpacer(2);

    const valRow = ovrBox.addStack();
    valRow.layoutHorizontally();
    valRow.addSpacer();
    const ovrVal = valRow.addText(\`\${ovr}\`);
    ovrVal.font = Font.boldSystemFont(28);
    ovrVal.textColor = ovrTextColor;
    valRow.addSpacer();

    ovrBox.addSpacer();

    mainRow.addSpacer(12);

    // Right Column: Full Driver Profile & Stats
    const rightCol = mainRow.addStack();
    rightCol.layoutVertically();

    // Header: Flag + Name + Number
    const nameRow = rightCol.addStack();
    nameRow.layoutHorizontally();
    nameRow.centerAlignContent();

    const flagEl = nameRow.addText(\`\${flag} \`);
    flagEl.font = Font.systemFont(14);

    const nameEl = nameRow.addText(driverLastName);
    nameEl.font = Font.boldSystemFont(16);
    nameEl.textColor = TEXT_PRIMARY;
    nameEl.lineLimit = 1;

    nameRow.addSpacer();

    const numEl = nameRow.addStack();
    numEl.backgroundColor = new Color("#FFFFFF");
    numEl.cornerRadius = 5;
    numEl.setPadding(1, 6, 1, 6);
    const numText = numEl.addText(\`#\${number}\`);
    numText.font = Font.boldSystemFont(11);
    numText.textColor = new Color("#000000");

    rightCol.addSpacer(3);

    // Category - Team & Market Value
    const teamRow = rightCol.addStack();
    teamRow.layoutHorizontally();
    teamRow.centerAlignContent();

    const teamEl = teamRow.addText(\`🏎️ \${category} - \${teamName}\`);
    teamEl.font = Font.mediumSystemFont(11.5);
    teamEl.textColor = TEXT_SECONDARY;

    teamRow.addSpacer();

    const valEl = teamRow.addText(marketValue);
    valEl.font = Font.boldSystemFont(11.5);
    valEl.textColor = TEXT_PRIMARY;

    rightCol.addSpacer(8);

    // Stats Grid (TEMP, VCT, POD, PTS)
    const statsGrid = rightCol.addStack();
    statsGrid.layoutHorizontally();
    statsGrid.backgroundColor = CARD_BG;
    statsGrid.cornerRadius = 8;
    statsGrid.setPadding(4, 8, 4, 8);
    statsGrid.centerAlignContent();

    function addStatCell(stack, label, val, isLast = false) {
      const cell = stack.addStack();
      cell.layoutVertically();
      cell.setPadding(0, 0, 0, 0);

      cell.addSpacer();

      const lblRow = cell.addStack();
      lblRow.layoutHorizontally();
      lblRow.addSpacer();
      const lbl = lblRow.addText(label);
      lbl.font = Font.boldSystemFont(8);
      lbl.textColor = TEXT_MUTED;
      lblRow.addSpacer();

      cell.addSpacer(1);

      const valRow = cell.addStack();
      valRow.layoutHorizontally();
      valRow.addSpacer();
      const num = valRow.addText(\`\${val}\`);
      num.font = Font.boldSystemFont(12);
      num.textColor = TEXT_PRIMARY;
      valRow.addSpacer();

      cell.addSpacer();

      if (!isLast) stack.addSpacer();
    }

    addStatCell(statsGrid, "TEMP", seasons);
    addStatCell(statsGrid, "VCT", wins);
    addStatCell(statsGrid, "POD", podiums);
    addStatCell(statsGrid, "PTS", points, true);

  } else {
    // LARGE WIDGET
    const header = widget.addStack();
    header.layoutHorizontally();
    header.centerAlignContent();

    const title = header.addText("FICHA DE PILOTO");
    title.font = Font.boldSystemFont(14);
    title.textColor = TEXT_MUTED;

    header.addSpacer();

    const flagText = header.addText(\`\${flag} \`);
    flagText.font = Font.systemFont(16);

    const numBadge = header.addStack();
    numBadge.backgroundColor = new Color("#FFFFFF");
    numBadge.cornerRadius = 6;
    numBadge.setPadding(2, 8, 2, 8);
    const numText = numBadge.addText(\`#\${number}\`);
    numText.font = Font.boldSystemFont(13);
    numText.textColor = new Color("#000000");

    widget.addSpacer(10);

    // Main Driver Card
    const mainCard = widget.addStack();
    mainCard.backgroundColor = CARD_BG;
    mainCard.cornerRadius = 16;
    mainCard.setPadding(14, 16, 14, 16);
    mainCard.layoutHorizontally();
    mainCard.centerAlignContent();

    // 100% Centered OVR Square
    const ovrBox = mainCard.addStack();
    ovrBox.size = new Size(72, 72);
    ovrBox.backgroundColor = ovrBg;
    ovrBox.cornerRadius = 16;
    ovrBox.layoutVertically();
    ovrBox.setPadding(0, 0, 0, 0);

    ovrBox.addSpacer();

    const lblRow = ovrBox.addStack();
    lblRow.layoutHorizontally();
    lblRow.addSpacer();
    const ovrLbl = lblRow.addText("OVR");
    ovrLbl.font = Font.boldSystemFont(11);
    ovrLbl.textColor = ovrTextColor;
    lblRow.addSpacer();

    ovrBox.addSpacer(2);

    const valRow = ovrBox.addStack();
    valRow.layoutHorizontally();
    valRow.addSpacer();
    const ovrVal = valRow.addText(\`\${ovr}\`);
    ovrVal.font = Font.boldSystemFont(32);
    ovrVal.textColor = ovrTextColor;
    valRow.addSpacer();

    ovrBox.addSpacer();

    mainCard.addSpacer(14);

    const info = mainCard.addStack();
    info.layoutVertically();

    const pName = info.addText(driverLastName);
    pName.font = Font.boldSystemFont(18);
    pName.textColor = TEXT_PRIMARY;

    info.addSpacer(2);

    const teamText = info.addText(\`🏎️ \${category} - \${teamName}\`);
    teamText.font = Font.systemFont(12);
    teamText.textColor = TEXT_SECONDARY;

    info.addSpacer(2);

    const valText = info.addText(\`Valor de Mercado: \${marketValue}\`);
    valText.font = Font.boldSystemFont(12);
    valText.textColor = TEXT_PRIMARY;

    widget.addSpacer(12);

    // 4 Stats Cards in Row
    const statsRow = widget.addStack();
    statsRow.layoutHorizontally();

    function addLargeStatBox(label, value) {
      const box = statsRow.addStack();
      box.layoutVertically();
      box.backgroundColor = CARD_BG;
      box.cornerRadius = 10;
      box.setPadding(0, 4, 0, 4);
      box.size = new Size(68, 50);

      box.addSpacer();

      const lRow = box.addStack();
      lRow.layoutHorizontally();
      lRow.addSpacer();
      const lbl = lRow.addText(label);
      lbl.font = Font.boldSystemFont(9);
      lbl.textColor = TEXT_MUTED;
      lRow.addSpacer();

      box.addSpacer(2);

      const nRow = box.addStack();
      nRow.layoutHorizontally();
      nRow.addSpacer();
      const num = nRow.addText(\`\${value}\`);
      num.font = Font.boldSystemFont(15);
      num.textColor = TEXT_PRIMARY;
      nRow.addSpacer();

      box.addSpacer();
    }

    addLargeStatBox("TEMP", seasons);
    statsRow.addSpacer();
    addLargeStatBox("VCT", wins);
    statsRow.addSpacer();
    addLargeStatBox("POD", podiums);
    statsRow.addSpacer();
    addLargeStatBox("PTS", points);

    widget.addSpacer(12);

    // Progress Bar to next OVR
    const progBox = widget.addStack();
    progBox.layoutVertically();
    progBox.backgroundColor = CARD_BG;
    progBox.cornerRadius = 10;
    progBox.setPadding(10, 12, 10, 12);

    const pHeader = progBox.addStack();
    pHeader.layoutHorizontally();
    const pLbl = pHeader.addText("Progreso hacia +1 OVR");
    pLbl.font = Font.systemFont(11);
    pLbl.textColor = TEXT_SECONDARY;
    pHeader.addSpacer();
    const pCount = pHeader.addText(\`\${counter}/10 hábitos\`);
    pCount.font = Font.boldSystemFont(11);
    pCount.textColor = TEXT_PRIMARY;

    progBox.addSpacer(6);

    const pBar = progBox.addStack();
    pBar.size = new Size(0, 6);
    pBar.backgroundColor = new Color("#0A0A0A");
    pBar.cornerRadius = 3;
    const pFill = pBar.addStack();
    pFill.size = new Size(Math.max(10, counter * 25), 6);
    pFill.backgroundColor = TEXT_PRIMARY;
    pFill.cornerRadius = 3;
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
