/**
 * Generador de Scripts para Widgets de Scriptable (iOS / iPadOS)
 * Soporta tamaños: Small, Medium, Large
 */

export function generateHabitsWidgetScript(userId = '', userName = 'Viajero') {
  return `// ==========================================
// HABITELIA - WIDGET DE HÁBITOS DE HOY
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = "${userId}";
const PROJECT_ID = "habitelia";

// Tema Oscuro Obsidian Luxury
const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");
const ACCENT = new Color("#FFFFFF");
const GREEN = new Color("#30D158");
const AMBER = new Color("#FF9F0A");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_habits_cache.json");
  
  if (USER_ID) {
    try {
      const url = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/habits\`;
      const req = new Request(url);
      req.timeoutInterval = 6;
      const res = await req.loadJSON();
      if (res && res.documents) {
        const habits = res.documents.map(d => {
          const f = d.fields || {};
          return {
            id: d.name.split("/").pop(),
            name: f.name?.stringValue || "Hábito",
            time: f.cue?.mapValue?.fields?.time?.stringValue || null,
            completions: f.completions?.mapValue?.fields || {},
            frequency: f.frequency?.mapValue?.fields?.type?.stringValue || 'daily'
          };
        });
        fm.writeString(cachePath, JSON.stringify(habits));
        return habits;
      }
    } catch(e) {
      console.log("Error cargando de Firestore, usando cache: " + e);
    }
  }

  if (fm.fileExists(cachePath)) {
    try {
      return JSON.parse(fm.readString(cachePath));
    } catch(e) {}
  }

  return [
    { name: "Meditar 10 min", time: "08:00", completed: true },
    { name: "Lectura profunda", time: "14:00", completed: false },
    { name: "Entrenamiento", time: "18:30", completed: false },
    { name: "Planificar mañana", time: "22:00", completed: false }
  ];
}

async function createWidget() {
  const habits = await loadData();
  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(14, 14, 14, 14);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dayName = dayNames[today.getDay()];

  let completedCount = 0;
  const processedHabits = habits.map(h => {
    const isDone = h.completed === true || (h.completions && h.completions[todayStr]);
    if (isDone) completedCount++;
    return { ...h, isDone };
  });

  const total = processedHabits.length || 1;
  const percent = Math.round((completedCount / total) * 100);
  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    // ---------------- SMALL WIDGET ----------------
    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    
    const titleText = headerStack.addText("HABITELIA");
    titleText.font = Font.boldSystemFont(11);
    titleText.textColor = TEXT_PRIMARY;
    headerStack.addSpacer();
    
    const dateText = headerStack.addText(\`\${dayName} \${today.getDate()}\`);
    dateText.font = Font.systemFont(10);
    dateText.textColor = TEXT_MUTED;
    
    widget.addSpacer(8);

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

    // Show next 2 habits
    processedHabits.slice(0, 2).forEach(h => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      
      const symbol = row.addText(h.isDone ? "● " : "○ ");
      symbol.font = Font.systemFont(11);
      symbol.textColor = h.isDone ? GREEN : TEXT_MUTED;
      
      const name = row.addText(h.name);
      name.font = Font.systemFont(11);
      name.textColor = h.isDone ? TEXT_MUTED : TEXT_PRIMARY;
      name.lineLimit = 1;
      widget.addSpacer(2);
    });

  } else if (widgetFamily === "medium") {
    // ---------------- MEDIUM WIDGET ----------------
    const mainStack = widget.addStack();
    mainStack.layoutHorizontally();
    mainStack.centerAlignContent();

    // Left Column: Progress & Stats
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

    // Right Column: Habits List
    const rightCol = mainStack.addStack();
    rightCol.layoutVertically();
    
    processedHabits.slice(0, 4).forEach((h, idx) => {
      const row = rightCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      
      const check = row.addText(h.isDone ? "● " : "○ ");
      check.font = Font.systemFont(13);
      check.textColor = h.isDone ? GREEN : TEXT_MUTED;

      const name = row.addText(h.name);
      name.font = Font.mediumSystemFont(12);
      name.textColor = h.isDone ? TEXT_MUTED : TEXT_PRIMARY;
      name.lineLimit = 1;

      row.addSpacer();

      if (h.time) {
        const timeText = row.addText(h.time);
        timeText.font = Font.systemFont(10);
        timeText.textColor = TEXT_MUTED;
      }

      if (idx < 3) rightCol.addSpacer(4);
    });

  } else {
    // ---------------- LARGE WIDGET ----------------
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

    // Progress Bar Card
    const progCard = widget.addStack();
    progCard.layoutHorizontally();
    progCard.backgroundColor = CARD_BG;
    progCard.cornerRadius = 10;
    progCard.setPadding(10, 12, 10, 12);
    progCard.centerAlignContent();

    const pLeft = progCard.addStack();
    pLeft.layoutVertically();
    const pTitle = pLeft.addText("PROGRESO DE HOY");
    pTitle.font = Font.boldSystemFont(10);
    pTitle.textColor = TEXT_MUTED;
    const pCount = pLeft.addText(\`\${completedCount} de \${total} hábitos completados\`);
    pCount.font = Font.systemFont(12);
    pCount.textColor = TEXT_PRIMARY;

    progCard.addSpacer();

    const pNum = progCard.addText(\`\${percent}%\`);
    pNum.font = Font.boldSystemFont(22);
    pNum.textColor = TEXT_PRIMARY;

    widget.addSpacer(12);

    // Habits List
    processedHabits.slice(0, 8).forEach((h, idx) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.backgroundColor = CARD_BG;
      row.cornerRadius = 8;
      row.setPadding(6, 10, 6, 10);

      const mark = row.addText(h.isDone ? "✓ " : "○ ");
      mark.font = Font.boldSystemFont(13);
      mark.textColor = h.isDone ? GREEN : TEXT_MUTED;

      const name = row.addText(h.name);
      name.font = Font.mediumSystemFont(12.5);
      name.textColor = h.isDone ? TEXT_MUTED : TEXT_PRIMARY;
      name.lineLimit = 1;

      row.addSpacer();

      if (h.time) {
        const time = row.addText(h.time);
        time.font = Font.systemFont(11);
        time.textColor = TEXT_MUTED;
      }

      if (idx < 7) widget.addSpacer(4);
    });
  }

  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
`;
}

export function generateTodosWidgetScript(userId = '', userName = 'Viajero') {
  return `// ==========================================
// HABITELIA - WIDGET DE TAREAS (TO-DO)
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = "${userId}";
const PROJECT_ID = "habitelia";

const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");
const GREEN = new Color("#30D158");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_todos_cache.json");

  if (USER_ID) {
    try {
      const url = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/todos\`;
      const req = new Request(url);
      req.timeoutInterval = 6;
      const res = await req.loadJSON();
      if (res && res.documents) {
        const todos = res.documents.map(d => {
          const f = d.fields || {};
          return {
            id: d.name.split("/").pop(),
            name: f.name?.stringValue || f.text?.stringValue || "Tarea",
            completed: f.completed?.booleanValue || false,
            tag: f.tag?.stringValue || "",
            dueDate: f.dueDate?.stringValue || "",
            time: f.time?.stringValue || ""
          };
        });
        fm.writeString(cachePath, JSON.stringify(todos));
        return todos;
      }
    } catch(e) {
      console.log("Error cargando de Firestore: " + e);
    }
  }

  if (fm.fileExists(cachePath)) {
    try {
      return JSON.parse(fm.readString(cachePath));
    } catch(e) {}
  }

  return [
    { name: "Comprar cuaderno de notas", completed: false, tag: "Personal" },
    { name: "Revisar avance semanal", completed: true, tag: "Trabajo" },
    { name: "Enviar correo a mentor", completed: false, tag: "Estudio" }
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
      const text = row.addText(t.name);
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

      const name = row.addText(t.name);
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
    // Large
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

      const name = row.addText(t.name);
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

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
`;
}

export function generateDriverWidgetScript(userId = '', userName = 'Viajero') {
  return `// ==========================================
// HABITELIA - WIDGET DE TU PILOTO / DRIVER
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = "${userId}";
const PROJECT_ID = "habitelia";

const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");
const GOLD = new Color("#FFD700");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_driver_cache.json");

  if (USER_ID) {
    try {
      const url = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/driverProfile/main\`;
      const req = new Request(url);
      req.timeoutInterval = 6;
      const res = await req.loadJSON();
      if (res && res.fields) {
        const f = res.fields;
        const driver = {
          name: f.name?.stringValue || "${userName}",
          number: f.number?.stringValue || "01",
          team: f.team?.stringValue || "Habitelia Racing",
          ovr: parseInt(f.ovr?.integerValue || "60"),
          completedCounter: parseInt(f.completedHabitsCounter?.integerValue || "0"),
          incidents: parseInt(f.incidents?.integerValue || "0")
        };
        fm.writeString(cachePath, JSON.stringify(driver));
        return driver;
      }
    } catch(e) {}
  }

  if (fm.fileExists(cachePath)) {
    try {
      return JSON.parse(fm.readString(cachePath));
    } catch(e) {}
  }

  return {
    name: "${userName}",
    number: "01",
    team: "Habitelia Racing",
    ovr: 75,
    completedCounter: 4,
    incidents: 0
  };
}

async function createWidget() {
  const driver = await loadData();
  const widget = new ListWidget();
  widget.backgroundColor = BG_COLOR;
  widget.setPadding(14, 14, 14, 14);

  const widgetFamily = config.widgetFamily || "medium";

  if (widgetFamily === "small") {
    const title = widget.addText("TU PILOTO");
    title.font = Font.boldSystemFont(10);
    title.textColor = TEXT_MUTED;

    widget.addSpacer(6);

    const name = widget.addText(driver.name);
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
    const ovrVal = ovrBox.addText(\`OVR \${driver.ovr}\`);
    ovrVal.font = Font.boldSystemFont(14);
    ovrVal.textColor = TEXT_PRIMARY;

    row.addSpacer();
    const num = row.addText(\`#\${driver.number}\`);
    num.font = Font.boldSystemFont(16);
    num.textColor = TEXT_MUTED;

    widget.addSpacer(6);
    const prog = widget.addText(\`Progreso +1: \${driver.completedCounter}/10\`);
    prog.font = Font.systemFont(10);
    prog.textColor = TEXT_MUTED;

  } else if (widgetFamily === "medium") {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    // OVR Box
    const ovrBox = row.addStack();
    ovrBox.size = new Size(54, 54);
    ovrBox.backgroundColor = CARD_BG;
    ovrBox.cornerRadius = 12;
    ovrBox.layoutVertically();
    ovrBox.centerAlignContent();
    const ovrNum = ovrBox.addText(\`\${driver.ovr}\`);
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
    const pName = nameRow.addText(driver.name);
    pName.font = Font.boldSystemFont(16);
    pName.textColor = TEXT_PRIMARY;
    nameRow.addSpacer();
    const num = nameRow.addText(\`#\${driver.number}\`);
    num.font = Font.boldSystemFont(16);
    num.textColor = TEXT_MUTED;

    const team = info.addText(driver.team);
    team.font = Font.systemFont(11);
    team.textColor = TEXT_MUTED;

    info.addSpacer(6);

    const progText = info.addText(\`Progreso hacia +1 OVR: \${driver.completedCounter}/10 hábitos\`);
    progText.font = Font.systemFont(11);
    progText.textColor = TEXT_PRIMARY;

  } else {
    // Large
    const header = widget.addStack();
    header.layoutHorizontally();
    const title = header.addText("FICHA DE PILOTO");
    title.font = Font.boldSystemFont(14);
    title.textColor = TEXT_MUTED;
    header.addSpacer();
    const num = header.addText(\`#\${driver.number}\`);
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
    const ovrNum = ovrBox.addText(\`\${driver.ovr}\`);
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
    const pName = info.addText(driver.name);
    pName.font = Font.boldSystemFont(18);
    pName.textColor = TEXT_PRIMARY;
    const team = info.addText(driver.team);
    team.font = Font.systemFont(12);
    team.textColor = TEXT_MUTED;

    widget.addSpacer(16);

    const stat1 = widget.addText(\`🎯 Progreso al siguiente punto: \${driver.completedCounter}/10 hábitos\`);
    stat1.font = Font.systemFont(13);
    stat1.textColor = TEXT_PRIMARY;

    widget.addSpacer(8);

    const stat2 = widget.addText(\`⚠️ Incidentes registrados: \${driver.incidents}\`);
    stat2.font = Font.systemFont(13);
    stat2.textColor = TEXT_MUTED;
  }

  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
`;
}

export function generateNotesWidgetScript(userId = '', userName = 'Viajero') {
  return `// ==========================================
// HABITELIA - WIDGET DE NOTAS
// Compatible con tamaños: Pequeño, Mediano y Grande
// ==========================================

const USER_ID = "${userId}";
const PROJECT_ID = "habitelia";

const BG_COLOR = new Color("#0D0D0F");
const CARD_BG = new Color("#16161A");
const TEXT_PRIMARY = new Color("#FFFFFF");
const TEXT_MUTED = new Color("#8E8E93");

async function loadData() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "habitelia_notes_cache.json");

  if (USER_ID) {
    try {
      const url = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/users/\${USER_ID}/notes\`;
      const req = new Request(url);
      req.timeoutInterval = 6;
      const res = await req.loadJSON();
      if (res && res.documents) {
        const notes = res.documents.map(d => {
          const f = d.fields || {};
          return {
            id: d.name.split("/").pop(),
            title: f.title?.stringValue || "Nota",
            emoji: f.emoji?.stringValue || "📝"
          };
        });
        fm.writeString(cachePath, JSON.stringify(notes));
        return notes;
      }
    } catch(e) {}
  }

  if (fm.fileExists(cachePath)) {
    try {
      return JSON.parse(fm.readString(cachePath));
    } catch(e) {}
  }

  return [
    { title: "Ideas de Proyecto", emoji: "💡" },
    { title: "Lista de Compras", emoji: "🛒" },
    { title: "Entrenamiento Semanal", emoji: "🏎️" }
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
      const text = row.addText(n.title);
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

      const name = row.addText(n.title);
      name.font = Font.mediumSystemFont(12);
      name.textColor = TEXT_PRIMARY;
      name.lineLimit = 1;

      if (idx < 3) widget.addSpacer(5);
    });

  } else {
    // Large
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

      const name = row.addText(n.title);
      name.font = Font.mediumSystemFont(12.5);
      name.textColor = TEXT_PRIMARY;
      name.lineLimit = 1;

      if (idx < 7) widget.addSpacer(4);
    });
  }

  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
`;
}
