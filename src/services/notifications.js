import { store } from '../store.js';

let schedulerInterval = null;

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem('notifications_enabled', permission === 'granted' ? 'true' : 'false');
    
    if (permission === 'granted') {
      sendTestNotification();
      startNotificationScheduler();
    }
    return permission;
  } catch (error) {
    console.error('Error solicitando permisos de notificación:', error);
    return 'denied';
  }
};

export const areNotificationsEnabled = () => {
  return getNotificationPermission() === 'granted' && localStorage.getItem('notifications_enabled') !== 'false';
};

export const setNotificationsEnabled = (enabled) => {
  localStorage.setItem('notifications_enabled', enabled ? 'true' : 'false');
  if (enabled) {
    if (getNotificationPermission() === 'granted') {
      startNotificationScheduler();
    } else {
      requestNotificationPermission();
    }
  } else {
    stopNotificationScheduler();
  }
};

export const stopNotificationScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
};

export const sendNotification = async (title, options = {}) => {
  if (!isNotificationSupported() || getNotificationPermission() !== 'granted') {
    return false;
  }

  const defaultOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    renotify: true,
    tag: options.tag || 'habitelia-general',
    ...options
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, defaultOptions);
        return true;
      }
    }
    
    // Fallback if Service Worker showNotification is not available
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn('Error mostrando notificación:', err);
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch (e) {
      return false;
    }
  }
};

export const sendTestNotification = async () => {
  return sendNotification('🔔 ¡Notificaciones activadas en Habitelia!', {
    body: 'Te avisaremos en el horario exacto de tus hábitos y tareas diarias.',
    tag: 'habitelia-test'
  });
};

export const checkAndTriggerScheduledReminders = () => {
  if (!areNotificationsEnabled()) return;

  const state = store.getState();
  const habits = state.habits || [];
  const todos = state.todos || [];
  const todayStr = store.getTodayString();

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDayKey = dayKeys[now.getDay()];

  // 1. Check Habits Scheduled for Today
  habits.forEach(habit => {
    // Check frequency
    if (habit.frequency && habit.frequency.type === 'weekly' && Array.isArray(habit.frequency.days)) {
      if (!habit.frequency.days.includes(currentDayKey)) return;
    }

    // Check completion status
    const completion = habit.completions?.[todayStr];
    if (completion === 'completed' || completion === 'completed_2min' || completion === 'skipped') {
      return;
    }

    // Check cue time
    const habitTime = (habit.cue?.timePerDay && habit.cue.timePerDay[currentDayKey]) || (habit.cue?.time ? habit.cue.time : null);
    
    if (habitTime) {
      // Habit with specific time
      if (habitTime === currentTimeStr) {
        const notifKey = `last_notif_habit_${habit.id}_${todayStr}_${habitTime}`;
        if (!localStorage.getItem(notifKey)) {
          localStorage.setItem(notifKey, Date.now().toString());
          const twoMin = habit.noTwoMin ? '' : (habit.response?.twoMinVersion || '');
          sendNotification(`⏰ Es hora de: ${habit.name}`, {
            body: twoMin ? `💡 Regla de 2 min: "${twoMin}"` : '¡Completá tu hábito hoy para mantener tu racha!',
            tag: `habit-${habit.id}`
          });
        }
      }
    } else {
      // Habit without specific time -> notify at 12:00 PM (mediodía)
      if (currentTimeStr === '12:00') {
        const notifKey = `last_notif_habit_${habit.id}_${todayStr}_noon`;
        if (!localStorage.getItem(notifKey)) {
          localStorage.setItem(notifKey, Date.now().toString());
          const twoMin = habit.noTwoMin ? '' : (habit.response?.twoMinVersion || '');
          sendNotification(`☀️ Recordatorio de mediodía: ${habit.name}`, {
            body: twoMin ? `💡 Regla de 2 min: "${twoMin}"` : 'Tenés este hábito pendiente para el día de hoy.',
            tag: `habit-noon-${habit.id}`
          });
        }
      }
    }
  });

  // 2. Check To-Do items
  todos.forEach(todo => {
    if (todo.completed) return;
    if (todo.dueDate && todo.dueDate !== todayStr) return;

    if (todo.time) {
      if (todo.time === currentTimeStr) {
        const notifKey = `last_notif_todo_${todo.id}_${todayStr}_${todo.time}`;
        if (!localStorage.getItem(notifKey)) {
          localStorage.setItem(notifKey, Date.now().toString());
          sendNotification(`📝 Tarea pendiente: ${todo.name}`, {
            body: todo.tag ? `Etiqueta: ${todo.tag}` : 'Tienes una tarea programada para este horario.',
            tag: `todo-${todo.id}`
          });
        }
      }
    } else if (currentTimeStr === '12:00' && todo.dueDate === todayStr) {
      const notifKey = `last_notif_todo_${todo.id}_${todayStr}_noon`;
      if (!localStorage.getItem(notifKey)) {
        localStorage.setItem(notifKey, Date.now().toString());
        sendNotification(`📝 Tarea de hoy: ${todo.name}`, {
          body: todo.tag ? `Etiqueta: ${todo.tag}` : 'Tienes una tarea pendiente para el día de hoy.',
          tag: `todo-noon-${todo.id}`
        });
      }
    }
  });
};

export const startNotificationScheduler = () => {
  if (schedulerInterval) clearInterval(schedulerInterval);
  checkAndTriggerScheduledReminders();
  schedulerInterval = setInterval(checkAndTriggerScheduledReminders, 30000); // check every 30s
};

// === WEB PUSH (Cloudflare Worker) ===
const PUSH_WORKER_URL = 'https://habitelia-push.agustingranes.workers.dev';
const VAPID_PUBLIC_KEY = 'BBEJ_ddNYEHs2Ca22rm5vS8fspAw8hMR-wH0Wai_tcYCp_hv8Ev3jHtiOqDxuttv4oJMgcgx2DCIwZTxM0t0qRk';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPush = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Get user ID from Firebase auth
    const { auth } = await import('../firebase.js');
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

    // Build today's notification schedule
    const schedule = buildNotificationSchedule();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Send subscription + schedule to Cloudflare Worker
    await fetch(`${PUSH_WORKER_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
        schedule,
        timezone
      })
    });

    console.log('Push subscription registered successfully');
    return true;
  } catch (err) {
    console.error('Error subscribing to push:', err);
    return false;
  }
};

export const syncScheduleToWorker = async () => {
  try {
    const { auth } = await import('../firebase.js');
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    if (!areNotificationsEnabled()) return;

    const schedule = buildNotificationSchedule();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await fetch(`${PUSH_WORKER_URL}/sync-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, schedule, timezone })
    });
  } catch (err) {
    console.warn('Error syncing schedule to worker:', err);
  }
};

export const unsubscribeFromPush = async () => {
  try {
    const { auth } = await import('../firebase.js');
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Unsubscribe from push manager
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from Cloudflare Worker
    await fetch(`${PUSH_WORKER_URL}/unsubscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  } catch (err) {
    console.warn('Error unsubscribing from push:', err);
  }
};

export const buildNotificationSchedule = () => {
  const state = store.getState();
  const habits = state.habits || [];
  const todos = state.todos || [];
  const todayStr = store.getTodayString();
  const schedule = [];

  const now = new Date();
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDayKey = dayKeys[now.getDay()];

  // Add habits scheduled for today
  habits.forEach(habit => {
    // Check frequency
    if (habit.frequency && habit.frequency.type === 'weekly' && Array.isArray(habit.frequency.days)) {
      if (!habit.frequency.days.includes(currentDayKey)) return;
    }

    // Check if already completed/skipped/deleted
    const completion = habit.completions?.[todayStr];
    const isCompleted = completion === 'completed' || completion === 'completed_2min' || completion === 'skipped' || completion === 'deleted_today';

    // Get time for today
    const habitTime = (habit.cue?.timePerDay && habit.cue.timePerDay[currentDayKey]) || (habit.cue?.time || null);
    const time = habitTime || '12:00'; // Default to noon if no time set

    const twoMin = habit.noTwoMin ? '' : (habit.response?.twoMinVersion || '');

    schedule.push({
      id: habit.id,
      name: habit.name,
      time,
      type: 'habit',
      twoMinVersion: twoMin,
      completed: isCompleted
    });
  });

  // Add todos for today
  todos.forEach(todo => {
    if (todo.completed) return;
    if (todo.dueDate && todo.dueDate !== todayStr) return;
    if (!todo.dueDate && !todo.showInRoutine) return;

    const time = todo.time || '12:00';
    schedule.push({
      id: todo.id,
      name: todo.name,
      time,
      type: 'todo',
      tag: todo.tag || '',
      completed: false
    });
  });

  return schedule;
};
