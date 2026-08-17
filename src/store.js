import { auth, saveDocument, getDocument, getCollection, deleteDocument, getUserPath } from './firebase.js';
import { getTeamForOVR, calculateMarketValue } from './driverEngine.js';
import { showTelemetryRadioPopup } from './components/driverTelemetryPopup.js';
import { showDailyIncompletePopup } from './components/dailyIncompletePopup.js';

// Synchronous initial load from localStorage
function getInitialLocalData() {
  let user = null;
  let habits = [];
  let routines = [];
  let todos = [];
  let driverProfile = null;
  let calcExpenses = [];
  let notes = [];

  try {
    const rawUser = localStorage.getItem('user_profile_v1') || localStorage.getItem('user_profile_guest');
    if (rawUser) user = JSON.parse(rawUser);

    const savedIdentity = localStorage.getItem('user_identity_v1');
    const savedName = localStorage.getItem('user_name_v1');
    const savedEmail = localStorage.getItem('user_email_v1');

    if (!user) user = {};
    if (savedIdentity) user.identity = savedIdentity;
    if (savedName && !user.name) user.name = savedName;
    if (savedEmail && !user.email) user.email = savedEmail;

    const rawHabits = localStorage.getItem('habits_v1') || localStorage.getItem('habits_guest');
    if (rawHabits) habits = JSON.parse(rawHabits);

    const rawRoutines = localStorage.getItem('routines_v1') || localStorage.getItem('routines_guest');
    if (rawRoutines) routines = JSON.parse(rawRoutines);

    const rawDriver = localStorage.getItem('driver_profile_v1');
    if (rawDriver) driverProfile = JSON.parse(rawDriver);

    const rawTodos = localStorage.getItem('todos_v1') || localStorage.getItem('todos_guest');
    if (rawTodos) todos = JSON.parse(rawTodos);

    const rawCalc = localStorage.getItem('calc_expenses_v1') || localStorage.getItem('calc_expenses_guest');
    if (rawCalc) calcExpenses = JSON.parse(rawCalc);

    const rawNotes = localStorage.getItem('notes_v1') || localStorage.getItem('notes_guest');
    if (rawNotes) notes = JSON.parse(rawNotes);
  } catch (e) {
    console.error('Error loading initial local storage:', e);
  }

  if (!driverProfile) {
    driverProfile = {
      active: false,
      ovr: 50,
      number: '86',
      initials: 'AGR',
      lastName: 'GRANES',
      countryFlag: '🇦🇷',
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
  }

  return {
    user: user || { uid: 'guest', name: 'Viajero', identity: 'una persona disciplinada', settings: { showTodosInHome: true } },
    habits: Array.isArray(habits) ? habits : [],
    routines: Array.isArray(routines) ? routines : [],
    todos: Array.isArray(todos) ? todos : [],
    calcExpenses,
    driverProfile,
    notes: Array.isArray(notes) ? notes : []
  };
}

const initialData = getInitialLocalData();

const initialState = {
  user: initialData.user,
  habits: initialData.habits,
  routines: initialData.routines,
  todos: initialData.todos,
  calcExpenses: initialData.calcExpenses,
  driverProfile: initialData.driverProfile,
  notes: initialData.notes || [],
  todaySchedule: null,
  currentRoute: '/login',
  loading: false,
  sidebarOpen: false
};

let state = { ...initialState };
const listeners = new Set();

export const store = {
  getState: () => state,
  
  setState: (partial) => {
    state = { ...state, ...partial };
    listeners.forEach(fn => fn(state));
  },
  
  subscribe: (fn) => {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
  
  generateId: () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },
  
  getTodayString: () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  getHabitOrder: (dateStr) => {
    try {
      const raw = localStorage.getItem(`habit_order_${dateStr}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveHabitOrder: (dateStr, orderIds) => {
    try {
      localStorage.setItem(`habit_order_${dateStr}`, JSON.stringify(orderIds));
    } catch (e) {}
  },

  clearUserData: () => {
    try {
      localStorage.clear();
    } catch (e) {}

    state.user = null;
    state.habits = [];
    state.routines = [];
    state.todos = [];
    state.calcExpenses = [];
    state.driverProfile = null;
    state.todaySchedule = null;
    state.notes = [];
  },
  
  loadUserData: async () => {
    const uid = auth.currentUser?.uid || 'guest';
    
    try {
      if (!auth.currentUser) {
        const rawUser = localStorage.getItem('user_profile_guest');
        const rawHabits = localStorage.getItem('habits_guest');
        const rawRoutines = localStorage.getItem('routines_guest');
        const rawTodos = localStorage.getItem('todos_guest');
        const rawCalc = localStorage.getItem('calc_expenses_guest');
        const rawNotes = localStorage.getItem('notes_guest');

        store.setState({
          user: rawUser ? JSON.parse(rawUser) : null,
          habits: rawHabits ? JSON.parse(rawHabits) : [],
          routines: rawRoutines ? JSON.parse(rawRoutines) : [],
          todos: rawTodos ? JSON.parse(rawTodos) : [],
          calcExpenses: rawCalc ? JSON.parse(rawCalc) : [],
          notes: rawNotes ? JSON.parse(rawNotes) : [],
          driverProfile: null,
          todaySchedule: null
        });
        return;
      }

      const userDoc = await getDocument(`users/${uid}`);
      const remoteHabits = await getCollection(`users/${uid}/habits`);
      const remoteRoutines = await getCollection(`users/${uid}/routines`);
      const remoteTodos = await getCollection(`users/${uid}/todos`);
      const remoteExpenses = await getDocument(`users/${uid}/calculator/main`);
      const remoteNotes = await getCollection(`users/${uid}/notes`);
      const todayDate = store.getTodayString();
      const todaySchedule = await getDocument(`users/${uid}/schedules/${todayDate}`);
      const remoteDriverDoc = await getDocument(`users/${uid}/driverProfile/main`);

      const mergedHabits = (remoteHabits || []).filter(h => !h.deleted);
      const mergedRoutines = remoteRoutines || [];
      const mergedTodos = remoteTodos || [];
      const mergedCalcExpenses = remoteExpenses && remoteExpenses.expenses ? remoteExpenses.expenses : [];
      const mergedNotes = (remoteNotes || []).filter(n => !n.deleted);
      const driverProfile = remoteDriverDoc || { active: false, ovr: 50 };

      const localOnboarded = localStorage.getItem(`onboardingCompleted_${uid}`) === 'true';
      const localIdentity = localStorage.getItem(`user_identity_${uid}`);

      const userObj = {
        ...(userDoc || {}),
        uid,
        email: auth.currentUser?.email || userDoc?.email || '',
        name: auth.currentUser?.displayName || userDoc?.name || 'Viajero',
        identity: userDoc?.identity || localIdentity || ''
      };

      if (userDoc?.onboardingCompleted === true || localOnboarded === true) {
        userObj.onboardingCompleted = true;
      } else {
        userObj.onboardingCompleted = false;
      }

      try {
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(userObj));
        localStorage.setItem('user_profile_v1', JSON.stringify(userObj));
        if (userObj.onboardingCompleted) {
          localStorage.setItem(`onboardingCompleted_${uid}`, 'true');
        }
        if (userObj.identity) localStorage.setItem(`user_identity_${uid}`, userObj.identity);
        localStorage.setItem(`habits_${uid}`, JSON.stringify(mergedHabits));
        localStorage.setItem('habits_v1', JSON.stringify(mergedHabits));
        localStorage.setItem(`routines_${uid}`, JSON.stringify(mergedRoutines));
        localStorage.setItem('routines_v1', JSON.stringify(mergedRoutines));
        localStorage.setItem(`todos_${uid}`, JSON.stringify(mergedTodos));
        localStorage.setItem('todos_v1', JSON.stringify(mergedTodos));
        localStorage.setItem(`calc_expenses_${uid}`, JSON.stringify(mergedCalcExpenses));
        localStorage.setItem('calc_expenses_v1', JSON.stringify(mergedCalcExpenses));
        localStorage.setItem(`driver_profile_${uid}`, JSON.stringify(driverProfile));
        localStorage.setItem('driver_profile_v1', JSON.stringify(driverProfile));
        localStorage.setItem(`notes_${uid}`, JSON.stringify(mergedNotes));
        localStorage.setItem('notes_v1', JSON.stringify(mergedNotes));
      } catch (e) {}

      store.setState({
        user: userObj,
        habits: mergedHabits,
        routines: mergedRoutines,
        todos: mergedTodos,
        calcExpenses: mergedCalcExpenses,
        notes: mergedNotes,
        driverProfile,
        todaySchedule
      });

      // Auto-check daily inactivity & partner notification right after state loads
      if (userObj.onboardingCompleted) {
        store.checkDailyIncompleteHabitsAndDriver();
      }

      // Auto-push merged data to Firestore if user is authenticated
      if (auth.currentUser) {
        saveDocument(`users/${uid}`, userObj).catch(e => console.error(e));
        if (driverProfile && driverProfile.active) {
          saveDocument(`users/${uid}/driverProfile/main`, driverProfile).catch(e => console.error(e));
        }
        // Save expenses
        saveDocument(`users/${uid}/calculator/main`, { expenses: mergedCalcExpenses }).catch(e => console.error(e));
        mergedHabits.forEach(h => {
          saveDocument(`users/${uid}/habits/${h.id}`, h).catch(e => console.error(e));
        });
        mergedRoutines.forEach(r => {
          saveDocument(`users/${uid}/routines/${r.id}`, r).catch(e => console.error(e));
        });
        mergedTodos.forEach(t => {
          saveDocument(`users/${uid}/todos/${t.id}`, t).catch(e => console.error(e));
        });
        mergedNotes.forEach(n => {
          saveDocument(`users/${uid}/notes/${n.id}`, n).catch(e => console.error(e));
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },
  
  saveUserProfile: async (data) => {
    const uid = auth.currentUser?.uid || 'guest';
    const email = data.email || auth.currentUser?.email || state.user?.email || '';
    const name = data.name || auth.currentUser?.displayName || state.user?.name || 'Viajero';
    const identity = data.identity !== undefined ? data.identity : (state.user?.identity || '');

    const updatedUser = {
      ...(state.user || {}),
      ...data,
      email,
      name,
      identity
    };

    if (data.onboardingCompleted !== undefined) {
      updatedUser.onboardingCompleted = !!data.onboardingCompleted;
    }

    try {
      localStorage.setItem('user_profile_v1', JSON.stringify(updatedUser));
      localStorage.setItem(`user_profile_${uid}`, JSON.stringify(updatedUser));
      if (updatedUser.onboardingCompleted) {
        localStorage.setItem(`onboardingCompleted_${uid}`, 'true');
      }
      if (updatedUser.identity) localStorage.setItem(`user_identity_${uid}`, updatedUser.identity);
    } catch (e) {}

    store.setState({ user: updatedUser });

    if (auth.currentUser) {
      saveDocument(`users/${uid}`, updatedUser).catch(e => console.error('Error saving user profile doc:', e));
    }
  },
  
  saveHabit: async (habit) => {
    const uid = auth.currentUser?.uid || 'guest';
    const id = habit.id || store.generateId();
    const habitToSave = { ...habit, id, createdAt: habit.createdAt || new Date().toISOString() };
    
    const existingIndex = (state.habits || []).findIndex(h => h.id === id);
    const newHabits = [...(state.habits || [])];
    if (existingIndex >= 0) {
      newHabits[existingIndex] = habitToSave;
    } else {
      newHabits.push(habitToSave);
    }
    
    try {
      localStorage.setItem('habits_v1', JSON.stringify(newHabits));
      localStorage.setItem(`habits_${uid}`, JSON.stringify(newHabits));
      localStorage.setItem('habits_guest', JSON.stringify(newHabits));
    } catch (e) {}

    store.setState({ habits: newHabits });

    if (auth.currentUser) {
      saveDocument(`users/${uid}/habits/${id}`, habitToSave).catch(err => {
        console.error('Error saving habit to Firestore:', err);
      });
    }
  },
  
  deleteHabit: async (habitId) => {
    const uid = auth.currentUser?.uid || 'guest';
    const newHabits = (state.habits || []).filter(h => h.id !== habitId);
    
    // Also remove deleted habit from all saved routines
    const newRoutines = (state.routines || []).map(r => ({
      ...r,
      habitIds: (r.habitIds || []).filter(id => id !== habitId)
    }));

    try {
      localStorage.setItem('habits_v1', JSON.stringify(newHabits));
      localStorage.setItem(`habits_${uid}`, JSON.stringify(newHabits));
      localStorage.setItem('habits_guest', JSON.stringify(newHabits));
      localStorage.setItem('routines_v1', JSON.stringify(newRoutines));
    } catch (e) {}

    store.setState({ habits: newHabits, routines: newRoutines });

    if (auth.currentUser) {
      deleteDocument(`users/${uid}/habits/${habitId}`).catch(e => console.error(e));
      newRoutines.forEach(r => {
        saveDocument(`users/${uid}/routines/${r.id}`, r).catch(e => console.error(e));
      });
    }
  },
  
  saveRoutine: async (routine) => {
    const uid = auth.currentUser?.uid || 'guest';
    const id = routine.id || store.generateId();
    const routineToSave = { ...routine, id };
    
    const existingIndex = (state.routines || []).findIndex(r => r.id === id);
    const newRoutines = [...(state.routines || [])];
    if (existingIndex >= 0) {
      newRoutines[existingIndex] = routineToSave;
    } else {
      newRoutines.push(routineToSave);
    }

    try {
      localStorage.setItem('routines_v1', JSON.stringify(newRoutines));
      localStorage.setItem(`routines_${uid}`, JSON.stringify(newRoutines));
    } catch (e) {}

    store.setState({ routines: newRoutines });

    if (auth.currentUser) {
      saveDocument(`users/${uid}/routines/${id}`, routineToSave).catch(e => console.error(e));
    }
  },
  
  deleteRoutine: async (routineId) => {
    const uid = auth.currentUser?.uid || 'guest';
    const newRoutines = (state.routines || []).filter(r => r.id !== routineId);
    try {
      localStorage.setItem('routines_v1', JSON.stringify(newRoutines));
      localStorage.setItem(`routines_${uid}`, JSON.stringify(newRoutines));
    } catch (e) {}

    store.setState({ routines: newRoutines });

    if (auth.currentUser) {
      deleteDocument(`users/${uid}/routines/${routineId}`).catch(e => console.error(e));
    }
  },

  saveTodo: async (todo) => {
    const uid = auth.currentUser?.uid || 'guest';
    const id = todo.id || store.generateId();
    const todoToSave = { ...todo, id };

    const existingIndex = (state.todos || []).findIndex(t => t.id === id);
    const newTodos = [...(state.todos || [])];
    if (existingIndex >= 0) {
      newTodos[existingIndex] = todoToSave;
    } else {
      newTodos.push(todoToSave);
    }

    try {
      localStorage.setItem('todos_v1', JSON.stringify(newTodos));
      localStorage.setItem(`todos_${uid}`, JSON.stringify(newTodos));
      localStorage.setItem('todos_guest', JSON.stringify(newTodos));
    } catch (e) {}

    store.setState({ todos: newTodos });

    if (auth.currentUser) {
      saveDocument(`users/${uid}/todos/${id}`, todoToSave).catch(e => console.error(e));
    }
  },

  deleteTodo: async (todoId) => {
    const uid = auth.currentUser?.uid || 'guest';
    const newTodos = (state.todos || []).filter(t => t.id !== todoId);
    try {
      localStorage.setItem('todos_v1', JSON.stringify(newTodos));
      localStorage.setItem(`todos_${uid}`, JSON.stringify(newTodos));
      localStorage.setItem('todos_guest', JSON.stringify(newTodos));
    } catch (e) {}

    store.setState({ todos: newTodos });

    if (auth.currentUser) {
      deleteDocument(`users/${uid}/todos/${todoId}`).catch(e => console.error(e));
    }
  },

  toggleTodo: async (todoId) => {
    const todo = (state.todos || []).find(t => t.id === todoId);
    if (!todo) return;
    const updated = { ...todo, completed: !todo.completed };
    await store.saveTodo(updated);
  },
  
  saveTodaySchedule: async (schedule) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const date = schedule.date || store.getTodayString();
    await saveDocument(`users/${uid}/schedules/${date}`, schedule);
    if (date === store.getTodayString()) {
      store.setState({ todaySchedule: schedule });
    }
  },
  
  loadScheduleForDate: async (date) => {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    return await getDocument(`users/${uid}/schedules/${date}`);
  },
  
  saveDriverProfile: async (profile) => {
    const uid = auth.currentUser?.uid || 'guest';
    const updated = { ...(state.driverProfile || {}), ...profile };
    try {
      localStorage.setItem('driver_profile_v1', JSON.stringify(updated));
    } catch (e) {}
    store.setState({ driverProfile: updated });
    if (auth.currentUser) {
      saveDocument(`users/${uid}/driverProfile/main`, updated).catch(e => console.error(e));
    }
  },

  checkDailyIncompleteHabitsAndDriver: async () => {
    const uid = auth.currentUser?.uid || 'guest';
    const todayStr = store.getTodayString();
    const currentState = store.getState();
    const driver = currentState.driverProfile;
    const partner = currentState.user?.partner;
    const habitsList = currentState.habits || [];

    let lastEvaluated = localStorage.getItem(`last_evaluated_date_${uid}`) || driver?.lastEvaluatedDate;
    if (!lastEvaluated) {
      localStorage.setItem(`last_evaluated_date_${uid}`, todayStr);
      if (driver) {
        const updatedProfile = { ...driver, lastActiveDate: todayStr, lastEvaluatedDate: todayStr };
        await store.saveDriverProfile(updatedProfile);
      }
      return;
    }

    if (lastEvaluated >= todayStr) return;

    const addDaysStr = (dateStr, n) => {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + n);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let currEvalDate = lastEvaluated;
    let uncompletedHabitsList = [];

    while (currEvalDate < todayStr) {
      const dParts = currEvalDate.split('-');
      const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
      const dayIdx = dObj.getDay();
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = dayKeys[dayIdx];

      const scheduledForDay = habitsList.filter(h => {
        if (!h || h.deleted) return false;

        if (h.createdAt) {
          const habitCreatedDateStr = h.createdAt.includes('T') ? h.createdAt.split('T')[0] : h.createdAt;
          if (currEvalDate < habitCreatedDateStr) return false;
        }

        if (h.frequency) {
          if (h.frequency.type === 'daily') return true;
          if (h.frequency.type === 'weekly') {
            return Array.isArray(h.frequency.days) ? h.frequency.days.includes(dayKey) : false;
          }
        }
        return true;
      });

      scheduledForDay.forEach(h => {
        const comp = h.completions || {};
        const status = comp[currEvalDate];
        if (status !== 'completed' && status !== 'completed_2min' && status !== 'skipped' && status !== 'deleted_today') {
          uncompletedHabitsList.push({ ...h, _evalDate: currEvalDate });
          const incidentId = `${h.id}_${currEvalDate}`;
          const incidentObj = {
            id: incidentId,
            date: currEvalDate,
            habitId: h.id,
            habitName: h.name,
            status: 'uncompleted',
            createdAt: new Date().toISOString()
          };
          if (auth.currentUser) {
            saveDocument(`users/${uid}/incidents/${incidentId}`, incidentObj).catch(e => console.error(e));
          }
        }
      });

      currEvalDate = addDaysStr(currEvalDate, 1);
    }

    const todos = currentState.todos || [];
    todos.forEach(todo => {
      if (todo && !todo.completed && todo.dueDate && todo.dueDate < todayStr && !todo.deleted) {
        uncompletedHabitsList.push({
          id: todo.id,
          name: `Tarea vencida: ${todo.name || todo.text || todo.title || 'Tarea'}`,
          _evalDate: todo.dueDate
        });
      }
    });

    localStorage.setItem(`last_evaluated_date_${uid}`, todayStr);

    const driverActive = !!(driver && driver.active);
    const totalPenalty = uncompletedHabitsList.length;

    let newOvr = driver?.ovr || 50;

    if (driverActive && totalPenalty > 0) {
      newOvr = Math.max(10, (driver.ovr || 50) - totalPenalty);
      const team = getTeamForOVR(newOvr);
      const teamsHistory = Array.from(new Set([...(driver.teamsHistory || []), team]));
      const marketValue = calculateMarketValue(newOvr, driver.titlesDriver || 0, driver.titlesConstructor || 0);

      const updatedProfile = {
        ...driver,
        ovr: newOvr,
        marketValue,
        teamsHistory,
        lastActiveDate: todayStr,
        lastEvaluatedDate: todayStr
      };

      await store.saveDriverProfile(updatedProfile);
    } else if (driver) {
      const updatedProfile = {
        ...driver,
        lastActiveDate: todayStr,
        lastEvaluatedDate: todayStr
      };
      await store.saveDriverProfile(updatedProfile);
    }

    if (driverActive && totalPenalty > 0) {
      showDailyIncompletePopup({
        uncompletedHabits: uncompletedHabitsList,
        partner,
        driverActive,
        ovrDelta: -totalPenalty,
        newOvr,
        teamName: getTeamForOVR(newOvr)
      });
    }
  },

  // Called from driver.js mount — alias for checkDailyIncompleteHabitsAndDriver
  // Driver-specific season checks (currently handled inside checkDailyIncompleteHabitsAndDriver)
  checkDriverDailyInactivityAndSeason: async () => {
    try {
      await store.checkDailyIncompleteHabitsAndDriver();
    } catch (e) {
      console.error('checkDriverDailyInactivityAndSeason error:', e);
    }
  },

  completeEvent: async (habitId, date, mode = 'completed') => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return { streakBroken: false, newStreak: 0 };
    
    const statusVal = mode === 'completed_2min' ? 'completed_2min' : 'completed';
    const completions = { ...(habit.completions || {}), [date]: statusVal };
    
    let streak = (habit.streak || 0) + 1;
    let maxStreak = Math.max(habit.maxStreak || 0, streak);
    let totalCompletions = (habit.totalCompletions || 0) + 1;
    
    const updatedHabit = {
      ...habit,
      completions,
      streak,
      maxStreak,
      totalCompletions
    };
    
    await store.saveHabit(updatedHabit);

    // Driver OVR Progression (+1 OVR every 10 habits)
    if (state.driverProfile && state.driverProfile.active) {
      let counter = (state.driverProfile.completedHabitsCounter || 0) + 1;
      let ovr = state.driverProfile.ovr || 50;
      let ovrChanged = false;

      if (counter >= 10) {
        counter = 0;
        ovr = Math.min(99, ovr + 1);
        ovrChanged = true;
      }

      const team = getTeamForOVR(ovr);
      const teamsHistory = Array.from(new Set([...(state.driverProfile.teamsHistory || []), team]));
      const marketValue = calculateMarketValue(ovr, state.driverProfile.titlesDriver || 0, state.driverProfile.titlesConstructor || 0);

      const newDriverProfile = {
        ...state.driverProfile,
        completedHabitsCounter: counter,
        ovr,
        marketValue,
        teamsHistory
      };

      await store.saveDriverProfile(newDriverProfile);

      if (ovrChanged) {
        showTelemetryRadioPopup(1, ovr, team);
      }
    }

    return { streakBroken: false, newStreak: streak };
  },
  
  deleteTodayEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...(habit.completions || {}), [date]: 'deleted_today' };
    const updatedHabit = { ...habit, completions, streak: 0 };
    await store.saveHabit(updatedHabit);
  },

  restoreTodayEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...(habit.completions || {}) };
    delete completions[date];
    const updatedHabit = { ...habit, completions };
    await store.saveHabit(updatedHabit);
  },

  skipEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...(habit.completions || {}), [date]: 'skipped' };
    const updatedHabit = { ...habit, completions, streak: 0 };
    
    await store.saveHabit(updatedHabit);

    // Driver OVR Penalty (-1 OVR)
    if (state.driverProfile && state.driverProfile.active) {
      let ovr = Math.max(10, (state.driverProfile.ovr || 50) - 1);
      const team = getTeamForOVR(ovr);
      const teamsHistory = Array.from(new Set([...(state.driverProfile.teamsHistory || []), team]));
      const marketValue = calculateMarketValue(ovr, state.driverProfile.titlesDriver || 0, state.driverProfile.titlesConstructor || 0);

      const newDriverProfile = {
        ...state.driverProfile,
        ovr,
        marketValue,
        teamsHistory
      };

      await store.saveDriverProfile(newDriverProfile);
      showTelemetryRadioPopup(-1, ovr, team);
    }
  },

  uncompleteEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...(habit.completions || {}) };
    delete completions[date];
    
    const streak = Math.max(0, (habit.streak || 1) - 1);
    const totalCompletions = Math.max(0, (habit.totalCompletions || 1) - 1);
    
    const updatedHabit = {
      ...habit,
      completions,
      streak,
      totalCompletions
    };
    
    await store.saveHabit(updatedHabit);

    // Revert OVR Progress (-1 habit counter / points)
    if (state.driverProfile && state.driverProfile.active) {
      let counter = state.driverProfile.completedHabitsCounter || 0;
      let ovr = state.driverProfile.ovr || 50;

      if (counter > 0) {
        counter = counter - 1;
      } else {
        counter = 9;
        ovr = Math.max(10, ovr - 1);
      }

      const team = getTeamForOVR(ovr);
      const teamsHistory = Array.from(new Set([...(state.driverProfile.teamsHistory || []), team]));
      const marketValue = calculateMarketValue(ovr, state.driverProfile.titlesDriver || 0, state.driverProfile.titlesConstructor || 0);

      const newDriverProfile = {
        ...state.driverProfile,
        completedHabitsCounter: counter,
        ovr,
        marketValue,
        teamsHistory
      };

      await store.saveDriverProfile(newDriverProfile);
    }
  },

  unskipEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...(habit.completions || {}) };
    delete completions[date];
    
    const updatedHabit = {
      ...habit,
      completions
    };
    
    await store.saveHabit(updatedHabit);

    // Restore Driver OVR Point (+1 OVR)
    if (state.driverProfile && state.driverProfile.active) {
      let ovr = Math.min(99, (state.driverProfile.ovr || 50) + 1);
      const team = getTeamForOVR(ovr);
      const teamsHistory = Array.from(new Set([...(state.driverProfile.teamsHistory || []), team]));
      const marketValue = calculateMarketValue(ovr, state.driverProfile.titlesDriver || 0, state.driverProfile.titlesConstructor || 0);

      const newDriverProfile = {
        ...state.driverProfile,
        ovr,
        marketValue,
        teamsHistory
      };

      await store.saveDriverProfile(newDriverProfile);
    }
  },

  saveCalcExpenses: async (newList) => {
    const uid = auth.currentUser?.uid || 'guest';
    try {
      localStorage.setItem('calc_expenses_v1', JSON.stringify(newList));
      localStorage.setItem(`calc_expenses_${uid}`, JSON.stringify(newList));
      localStorage.setItem('calc_expenses_guest', JSON.stringify(newList));
    } catch (e) {}

    store.setState({ calcExpenses: newList });

    if (auth.currentUser) {
      saveDocument(`users/${uid}/calculator/main`, { expenses: newList }).catch(e => console.error('Error saving expenses doc to cloud:', e));
    }
  },

  saveNote: async (note) => {
    const uid = auth.currentUser?.uid || 'guest';
    const id = note.id || store.generateId();
    const noteToSave = {
      ...note,
      id,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingIndex = (state.notes || []).findIndex(n => n.id === id);
    let newNotes = [...(state.notes || [])];
    if (existingIndex > -1) {
      newNotes[existingIndex] = noteToSave;
    } else {
      newNotes.push(noteToSave);
    }

    try {
      localStorage.setItem('notes_v1', JSON.stringify(newNotes));
      localStorage.setItem(`notes_${uid}`, JSON.stringify(newNotes));
      if (!auth.currentUser) {
        localStorage.setItem('notes_guest', JSON.stringify(newNotes));
      }
    } catch (e) {}

    store.setState({ notes: newNotes });

    if (auth.currentUser) {
      saveDocument(`users/${uid}/notes/${id}`, noteToSave).catch(e => console.error('Error saving note to cloud:', e));
    }
    return noteToSave;
  },

  deleteNote: async (noteId) => {
    const uid = auth.currentUser?.uid || 'guest';
    const newNotes = (state.notes || []).filter(n => n.id !== noteId);

    try {
      localStorage.setItem('notes_v1', JSON.stringify(newNotes));
      localStorage.setItem(`notes_${uid}`, JSON.stringify(newNotes));
      if (!auth.currentUser) {
        localStorage.setItem('notes_guest', JSON.stringify(newNotes));
      }
    } catch (e) {}

    store.setState({ notes: newNotes });

    if (auth.currentUser) {
      deleteDocument(`users/${uid}/notes/${noteId}`).catch(e => console.error('Error deleting note from cloud:', e));
    }
  },

  syncAllDataToCloud: async () => {
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;
    const currentState = store.getState();

    try {
      if (currentState.user) {
        await saveDocument(`users/${uid}`, { ...currentState.user, onboardingCompleted: true });
      }
      if (currentState.driverProfile) {
        await saveDocument(`users/${uid}/driverProfile/main`, currentState.driverProfile);
      }
      if (currentState.calcExpenses) {
        await saveDocument(`users/${uid}/calculator/main`, { expenses: currentState.calcExpenses });
      }
      for (const h of (currentState.habits || [])) {
        await saveDocument(`users/${uid}/habits/${h.id}`, h);
      }
      for (const r of (currentState.routines || [])) {
        await saveDocument(`users/${uid}/routines/${r.id}`, r);
      }
      for (const t of (currentState.todos || [])) {
        await saveDocument(`users/${uid}/todos/${t.id}`, t);
      }
      for (const n of (currentState.notes || [])) {
        await saveDocument(`users/${uid}/notes/${n.id}`, n);
      }
      return true;
    } catch (e) {
      console.error('Error syncing all data to cloud:', e);
      return false;
    }
  }
};
