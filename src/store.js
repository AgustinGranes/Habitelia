import { auth, saveDocument, getDocument, getCollection, deleteDocument, getUserPath } from './firebase.js';

const initialState = {
  user: null,
  habits: [],
  routines: [],
  todaySchedule: null,
  currentRoute: '/login',
  loading: true,
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
      let habits = auth.currentUser ? await getCollection(`users/${uid}/habits`) : [];
      const routines = auth.currentUser ? await getCollection(`users/${uid}/routines`) : [];
      const todayDate = store.getTodayString();
      const todaySchedule = auth.currentUser ? await getDocument(`users/${uid}/schedules/${todayDate}`) : null;
      
      // Merge with localStorage habits fallback
      const localHabitsJson = localStorage.getItem(`habits_${uid}`) || localStorage.getItem('habits_guest');
      if (localHabitsJson) {
        try {
          const localHabits = JSON.parse(localHabitsJson);
          if (Array.isArray(localHabits)) {
            const combinedMap = new Map();
            (habits || []).forEach(h => combinedMap.set(h.id, h));
            localHabits.forEach(h => combinedMap.set(h.id, h));
            habits = Array.from(combinedMap.values());
          }
        } catch (e) {}
      }

      const localOnboarded = localStorage.getItem(`onboardingCompleted_${uid}`) === 'true' || localStorage.getItem('onboardingCompleted_guest') === 'true';
      const userObj = userDoc || { uid, email: auth.currentUser?.email || '', name: auth.currentUser?.displayName || 'Viajero' };
      if (localOnboarded) {
        userObj.onboardingCompleted = true;
      }
      
      store.setState({
        user: userObj,
        habits: habits || [],
        routines: routines || [],
        todaySchedule
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },
  
  saveUserProfile: async (data) => {
    const uid = auth.currentUser?.uid || 'guest';
    if (data.onboardingCompleted) {
      localStorage.setItem(`onboardingCompleted_${uid}`, 'true');
      localStorage.setItem('onboardingCompleted_guest', 'true');
    }
    store.setState({ user: { ...(state.user || {}), ...data } });
    if (auth.currentUser) {
      saveDocument(`users/${uid}`, data).catch(e => console.error('Error saving user profile doc:', e));
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
    
    // Save to localStorage synchronously
    try {
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
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await deleteDocument(`users/${uid}/habits/${habitId}`);
    store.setState({ habits: state.habits.filter(h => h.id !== habitId) });
  },
  
  saveRoutine: async (routine) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const id = routine.id || store.generateId();
    const routineToSave = { ...routine, id };
    
    await saveDocument(`users/${uid}/routines/${id}`, routineToSave);
    
    const existingIndex = state.routines.findIndex(r => r.id === id);
    const newRoutines = [...state.routines];
    if (existingIndex >= 0) {
      newRoutines[existingIndex] = routineToSave;
    } else {
      newRoutines.push(routineToSave);
    }
    store.setState({ routines: newRoutines });
  },
  
  deleteRoutine: async (routineId) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await deleteDocument(`users/${uid}/routines/${routineId}`);
    store.setState({ routines: state.routines.filter(r => r.id !== routineId) });
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
  
  completeEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return { streakBroken: false, newStreak: 0 };
    
    const completions = { ...(habit.completions || {}), [date]: 'completed' };
    
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
    return { streakBroken: false, newStreak: streak };
  },
  
  skipEvent: async (habitId, date) => {
    const habit = (state.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...(habit.completions || {}), [date]: 'skipped' };
    const updatedHabit = { ...habit, completions, streak: 0 };
    
    await store.saveHabit(updatedHabit);
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
