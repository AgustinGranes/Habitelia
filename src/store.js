import { auth, saveDocument, getDocument, getCollection, deleteDocument, getUserPath } from './firebase.js';
import { getTeamForOVR, calculateMarketValue } from './driverEngine.js';
import { showTelemetryRadioPopup } from './components/driverTelemetryPopup.js';

// Synchronous initial load from localStorage
function getInitialLocalData() {
  let user = null;
  let habits = [];
  let routines = [];
  let driverProfile = null;
  let calcExpenses = [];

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

    const rawCalc = localStorage.getItem('calc_expenses_v1') || localStorage.getItem('calc_expenses_guest');
    if (rawCalc) calcExpenses = JSON.parse(rawCalc);
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
    user: user || { uid: 'guest', name: 'Viajero', identity: 'una persona disciplinada' },
    habits: Array.isArray(habits) ? habits : [],
    routines: Array.isArray(routines) ? routines : [],
    calcExpenses,
    driverProfile
  };
}

const initialData = getInitialLocalData();

const initialState = {
  user: initialData.user,
  habits: initialData.habits,
  routines: initialData.routines,
  calcExpenses: initialData.calcExpenses,
  driverProfile: initialData.driverProfile,
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
    return d.toISOString().split('T')[0];
  },
  
  loadUserData: async () => {
    const uid = auth.currentUser?.uid || 'guest';
    
    try {
      const userDoc = auth.currentUser ? await getDocument(`users/${uid}`) : null;
      let remoteHabits = auth.currentUser ? await getCollection(`users/${uid}/habits`) : [];
      let remoteRoutines = auth.currentUser ? await getCollection(`users/${uid}/routines`) : [];
      const remoteExpenses = auth.currentUser ? await getDocument(`users/${uid}/calculator/main`) : null;
      const todayDate = store.getTodayString();
      const todaySchedule = auth.currentUser ? await getDocument(`users/${uid}/schedules/${todayDate}`) : null;
      
      // Combine remote & local habits
      const combinedMap = new Map();
      (state.habits || []).forEach(h => combinedMap.set(h.id, h));
      (remoteHabits || []).forEach(h => combinedMap.set(h.id, h));
      const mergedHabits = Array.from(combinedMap.values());

      const routineMap = new Map();
      (state.routines || []).forEach(r => routineMap.set(r.id, r));
      (remoteRoutines || []).forEach(r => routineMap.set(r.id, r));
      const mergedRoutines = Array.from(routineMap.values());

      const mergedExpenses = remoteExpenses && remoteExpenses.expenses ? remoteExpenses.expenses : (state.calcExpenses || []);
      const localCalc = (state.calcExpenses || []);
      const expensesMap = new Map();
      localCalc.forEach(e => expensesMap.set(e.id, e));
      (mergedExpenses || []).forEach(e => expensesMap.set(e.id, e));
      const mergedCalcExpenses = Array.from(expensesMap.values());

      const localOnboarded = uid !== 'guest' ? localStorage.getItem(`onboardingCompleted_${uid}`) === 'true' : localStorage.getItem('onboardingCompleted_guest') === 'true';
      const localIdentity = uid !== 'guest' ? localStorage.getItem(`user_identity_${uid}`) : localStorage.getItem('user_identity_v1');

      const userObj = {
        ...(state.user || {}),
        ...(userDoc || {}),
        uid,
        email: auth.currentUser?.email || userDoc?.email || state.user?.email || '',
        name: auth.currentUser?.displayName || userDoc?.name || state.user?.name || 'Viajero',
        identity: userDoc?.identity || state.user?.identity || localIdentity || ''
      };

      if (userDoc?.onboardingCompleted === true || localOnboarded === true) {
        userObj.onboardingCompleted = true;
      } else {
        userObj.onboardingCompleted = false;
      }
      
      const remoteDriverDoc = auth.currentUser ? await getDocument(`users/${uid}/driverProfile/main`) : null;
      const driverProfile = {
        ...(state.driverProfile || {}),
        ...(remoteDriverDoc || {})
      };

      // Persist merged to localStorage
      try {
        localStorage.setItem('user_profile_v1', JSON.stringify(userObj));
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(userObj));
        if (userObj.onboardingCompleted) {
          localStorage.setItem(`onboardingCompleted_${uid}`, 'true');
        }
        if (userObj.identity) localStorage.setItem(`user_identity_${uid}`, userObj.identity);
        localStorage.setItem('habits_v1', JSON.stringify(mergedHabits));
        localStorage.setItem(`habits_${uid}`, JSON.stringify(mergedHabits));
        localStorage.setItem('routines_v1', JSON.stringify(mergedRoutines));
        localStorage.setItem(`routines_${uid}`, JSON.stringify(mergedRoutines));
        localStorage.setItem('calc_expenses_v1', JSON.stringify(mergedCalcExpenses));
        localStorage.setItem(`calc_expenses_${uid}`, JSON.stringify(mergedCalcExpenses));
        localStorage.setItem('driver_profile_v1', JSON.stringify(driverProfile));
      } catch (e) {}

      store.setState({
        user: userObj,
        habits: mergedHabits,
        routines: mergedRoutines,
        calcExpenses: mergedCalcExpenses,
        driverProfile,
        todaySchedule
      });

      // Auto-check driver daily inactivity right after state loads
      if (driverProfile && driverProfile.active) {
        store.checkDriverDailyInactivityAndSeason();
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
    try {
      localStorage.setItem('habits_v1', JSON.stringify(newHabits));
      localStorage.setItem(`habits_${uid}`, JSON.stringify(newHabits));
      localStorage.setItem('habits_guest', JSON.stringify(newHabits));
    } catch (e) {}

    store.setState({ habits: newHabits });

    if (auth.currentUser) {
      deleteDocument(`users/${uid}/habits/${habitId}`).catch(e => console.error(e));
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

  checkDriverDailyInactivityAndSeason: async () => {
    const driver = state.driverProfile;
    if (!driver || !driver.active) return;

    const todayStr = store.getTodayString();
    let lastEvaluated = driver.lastEvaluatedDate || driver.lastActiveDate;

    if (!lastEvaluated) {
      lastEvaluated = todayStr;
    }

    // Year-End Reset Check
    const currentYear = new Date().getFullYear();
    const driverStartYear = driver.startYear || currentYear;
    const calculatedSeasons = Math.max(1, currentYear - driverStartYear + 1);
    
    let titlesDriver = driver.titlesDriver || 0;
    let titlesConstructor = driver.titlesConstructor || 0;
    let isNewSeason = calculatedSeasons > (driver.seasons || 1);
    let ovr = driver.ovr || 50;
    let completedHabitsCounter = driver.completedHabitsCounter || 0;

    if (isNewSeason) {
      const prevOvr = driver.ovr || 50;
      if (prevOvr >= 95) {
        titlesDriver += 1;
        titlesConstructor += 1;
      } else if (prevOvr >= 90) {
        titlesConstructor += 1;
      }
      ovr = 50;
      completedHabitsCounter = 0;
    }

    // Day-by-Day Catchup Loop
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
    let totalPenalty = 0;
    const habitsList = state.habits || [];

    while (currEvalDate < todayStr) {
      const dParts = currEvalDate.split('-');
      const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
      const dayIdx = dObj.getDay();
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = dayKeys[dayIdx];

      const scheduledForDay = habitsList.filter(h => {
        if (h.frequency) {
          if (h.frequency.type === 'daily') return true;
          if (h.frequency.type === 'weekly' && Array.isArray(h.frequency.days)) {
            return h.frequency.days.includes(dayKey);
          }
        }
        return true;
      });

      let uncompletedOnDay = 0;
      scheduledForDay.forEach(h => {
        const comp = h.completions || {};
        const status = comp[currEvalDate];
        if (status !== 'completed' && status !== 'completed_2min' && status !== 'skipped') {
          uncompletedOnDay++;
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
            saveDocument(`users/${auth.currentUser.uid}/incidents/${incidentId}`, incidentObj).catch(e => console.error(e));
          }
        }
      });

      if (uncompletedOnDay > 0) {
        totalPenalty += uncompletedOnDay;
      } else if (scheduledForDay.length === 0) {
        totalPenalty += 1;
      }

      currEvalDate = addDaysStr(currEvalDate, 1);
    }

    let ovrReduced = false;
    if (totalPenalty > 0 && !isNewSeason) {
      ovr = Math.max(10, ovr - totalPenalty);
      ovrReduced = true;
    }

    const team = getTeamForOVR(ovr);
    const teamsHistory = Array.from(new Set([...(driver.teamsHistory || []), team]));
    const marketValue = calculateMarketValue(ovr, titlesDriver, titlesConstructor);

    const updatedProfile = {
      ...driver,
      ovr,
      completedHabitsCounter,
      seasons: calculatedSeasons,
      startYear: driverStartYear,
      titlesDriver,
      titlesConstructor,
      marketValue,
      teamsHistory,
      lastActiveDate: todayStr,
      lastEvaluatedDate: todayStr
    };

    await store.saveDriverProfile(updatedProfile);

    if (ovrReduced) {
      showTelemetryRadioPopup(-totalPenalty, ovr, team);
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
      return true;
    } catch (e) {
      console.error('Error syncing all data to cloud:', e);
      return false;
    }
  }
};
