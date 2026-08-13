import { auth, saveDocument, getDocument, getCollection, deleteDocument, getUserPath } from './firebase.js';
import { getTeamForOVR, calculateMarketValue } from './driverEngine.js';
import { showTelemetryRadioPopup } from './components/driverTelemetryPopup.js';

// Synchronous initial load from localStorage
function getInitialLocalData() {
  let user = null;
  let habits = [];
  let routines = [];
  let driverProfile = null;

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
    driverProfile
  };
}

const initialData = getInitialLocalData();

const initialState = {
  user: initialData.user,
  habits: initialData.habits,
  routines: initialData.routines,
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

      const localOnboarded = localStorage.getItem(`onboardingCompleted_${uid}`) === 'true' || localStorage.getItem('onboardingCompleted_guest') === 'true';
      const localIdentity = localStorage.getItem('user_identity_v1');
      const localName = localStorage.getItem('user_name_v1');
      const localEmail = localStorage.getItem('user_email_v1');

      const userObj = {
        ...(state.user || {}),
        ...(userDoc || {}),
        uid,
        email: auth.currentUser?.email || userDoc?.email || state.user?.email || localEmail || '',
        name: auth.currentUser?.displayName || userDoc?.name || state.user?.name || localName || 'Viajero',
        identity: userDoc?.identity || state.user?.identity || localIdentity || 'una persona disciplinada'
      };

      if (localOnboarded || userDoc?.onboardingCompleted || userDoc?.identity) {
        userObj.onboardingCompleted = true;
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
        if (userObj.identity) localStorage.setItem('user_identity_v1', userObj.identity);
        if (userObj.name) localStorage.setItem('user_name_v1', userObj.name);
        if (userObj.email) localStorage.setItem('user_email_v1', userObj.email);
        localStorage.setItem('habits_v1', JSON.stringify(mergedHabits));
        localStorage.setItem(`habits_${uid}`, JSON.stringify(mergedHabits));
        localStorage.setItem('routines_v1', JSON.stringify(mergedRoutines));
        localStorage.setItem(`routines_${uid}`, JSON.stringify(mergedRoutines));
        localStorage.setItem('driver_profile_v1', JSON.stringify(driverProfile));
      } catch (e) {}

      store.setState({
        user: userObj,
        habits: mergedHabits,
        routines: mergedRoutines,
        driverProfile,
        todaySchedule
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },
  
  saveUserProfile: async (data) => {
    const uid = auth.currentUser?.uid || 'guest';
    const email = data.email || auth.currentUser?.email || state.user?.email || localStorage.getItem('user_email_v1') || '';
    const name = data.name || auth.currentUser?.displayName || state.user?.name || localStorage.getItem('user_name_v1') || 'Viajero';
    const identity = data.identity || state.user?.identity || localStorage.getItem('user_identity_v1') || 'una persona disciplinada';

    const updatedUser = {
      ...(state.user || {}),
      ...data,
      email,
      name,
      identity,
      onboardingCompleted: true
    };
    
    try {
      localStorage.setItem('user_profile_v1', JSON.stringify(updatedUser));
      localStorage.setItem(`user_profile_${uid}`, JSON.stringify(updatedUser));
      localStorage.setItem(`onboardingCompleted_${uid}`, 'true');
      localStorage.setItem('onboardingCompleted_guest', 'true');

      if (updatedUser.identity) localStorage.setItem('user_identity_v1', updatedUser.identity);
      if (updatedUser.name) localStorage.setItem('user_name_v1', updatedUser.name);
      if (updatedUser.email) localStorage.setItem('user_email_v1', updatedUser.email);
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
    const lastActiveDate = driver.lastActiveDate || todayStr;

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
      // Year-End Reset: OVR resets to 50 for the new season, trophies stay in vitrina
      ovr = 50;
      completedHabitsCounter = 0;
    }

    // Inactivity / Uncompleted Habits Penalty
    const d1 = new Date(lastActiveDate);
    const d2 = new Date(todayStr);
    const diffTime = d2.getTime() - d1.getTime();
    const missedDays = Math.floor(diffTime / (1000 * 3600 * 24));

    let uncompletedCount = 0;
    if (missedDays > 0) {
      const yesterday = new Date(d2.getTime() - (1000 * 3600 * 24)).toISOString().split('T')[0];
      (state.habits || []).forEach(h => {
        const comp = h.completions || {};
        if (!comp[yesterday] || (comp[yesterday] !== 'completed' && comp[yesterday] !== 'completed_2min')) {
          uncompletedCount++;
        }
      });
      uncompletedCount = Math.max(missedDays, uncompletedCount);
    }

    let ovrReduced = false;
    let penalty = 0;

    if (uncompletedCount > 0 && !isNewSeason) {
      penalty = uncompletedCount;
      ovr = Math.max(10, ovr - penalty);
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
      lastActiveDate: todayStr
    };

    await store.saveDriverProfile(updatedProfile);

    if (ovrReduced) {
      showTelemetryRadioPopup(-penalty, ovr, team);
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
  }
};
