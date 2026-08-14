export function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

export function formatTime(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return formatTime(hours, minutes);
}

export function getEndTime(startTime, durationMinutes) {
  const start = parseTime(startTime);
  return minutesToTime(start.totalMinutes + durationMinutes);
}

export function checkCollision(event1, event2) {
  const time1 = event1.startTime || event1.cue?.time || event1.time;
  const time2 = event2.startTime || event2.cue?.time || event2.time;
  if (!time1 || !time2) return { collides: false, overlapMinutes: 0 };

  const start1 = parseTime(time1).totalMinutes;
  const end1 = start1 + parseInt(event1.duration || 15);
  const start2 = parseTime(time2).totalMinutes;
  const end2 = start2 + parseInt(event2.duration || 15);

  if (start1 < end2 && start2 < end1) {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    return { collides: true, overlapMinutes: overlapEnd - overlapStart };
  }
  return { collides: false, overlapMinutes: 0 };
}

export function findAllCollisions(newEvent, existingEvents) {
  return existingEvents.filter(event => checkCollision(newEvent, event).collides);
}

export function findNextFreeSlot(duration, existingEvents, preferredTime) {
  let startMinutes = parseTime(preferredTime).totalMinutes;
  let maxTries = 24 * 4;
  let currentEvents = sortEventsByTime(existingEvents);

  while (maxTries > 0) {
    const testEvent = { startTime: minutesToTime(startMinutes), duration };
    const collides = currentEvents.some(event => checkCollision(testEvent, event).collides);
    
    if (!collides) {
      return minutesToTime(startMinutes);
    }
    
    startMinutes += 15;
    if (startMinutes >= 24 * 60) startMinutes -= 24 * 60;
    maxTries--;
  }
  return null;
}

export function getTimeRange(startTime, duration) {
  const endTime = getEndTime(startTime, duration);
  return `${startTime} - ${endTime}`;
}

export function sortEventsByTime(events) {
  return [...events].sort((a, b) => parseTime(a.startTime).totalMinutes - parseTime(b.startTime).totalMinutes);
}

export function getNextEvent(events) {
  if (!events || events.length === 0) return null;
  const nowStr = getCurrentTimeString();
  const nowTotal = parseTime(nowStr).totalMinutes;
  
  const sorted = sortEventsByTime(events).filter(e => !e.completed && !e.skipped);
  if (sorted.length === 0) return null;
  
  const future = sorted.find(e => parseTime(e.startTime).totalMinutes >= nowTotal);
  return future || sorted[0];
}

export function getCurrentTimeString() {
  const now = new Date();
  return formatTime(now.getHours(), now.getMinutes());
}
