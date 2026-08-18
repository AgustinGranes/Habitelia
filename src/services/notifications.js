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
    if (!habitTime) return;

    // Check if time matches current minute
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
  });

  // 2. Check To-Do items with time due today
  todos.forEach(todo => {
    if (todo.completed) return;
    if (todo.dueDate && todo.dueDate !== todayStr) return;
    if (!todo.time) return;

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
  });
};

export const startNotificationScheduler = () => {
  if (schedulerInterval) clearInterval(schedulerInterval);
  checkAndTriggerScheduledReminders();
  schedulerInterval = setInterval(checkAndTriggerScheduledReminders, 30000); // check every 30s
};
