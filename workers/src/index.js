import { sendWebPush } from './webpush.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/health' && request.method === 'GET') {
        return jsonResponse({ ok: true });
      }

      if (path === '/subscribe' && request.method === 'POST') {
        const body = await request.json();
        const { userId, subscription, schedule, timezone } = body;

        if (!userId || !subscription) {
          return jsonResponse({ error: 'Missing userId or subscription' }, 400);
        }

        await env.PUSH_STORE.put(`sub:${userId}`, JSON.stringify(subscription));
        if (schedule) {
          await env.PUSH_STORE.put(`schedule:${userId}`, JSON.stringify({ schedule, timezone }));
        }

        return jsonResponse({ success: true });
      }

      if (path === '/sync-schedule' && request.method === 'POST') {
        const body = await request.json();
        const { userId, schedule, timezone } = body;

        if (!userId || !schedule) {
          return jsonResponse({ error: 'Missing userId or schedule' }, 400);
        }

        await env.PUSH_STORE.put(`schedule:${userId}`, JSON.stringify({ schedule, timezone }));
        return jsonResponse({ success: true });
      }

      if (path === '/unsubscribe' && request.method === 'DELETE') {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
          return jsonResponse({ error: 'Missing userId' }, 400);
        }

        await env.PUSH_STORE.delete(`sub:${userId}`);
        await env.PUSH_STORE.delete(`schedule:${userId}`);
        return jsonResponse({ success: true });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Fetch error:', err);
      return jsonResponse({ error: 'Internal Server Error' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.processSchedules(env));
  },

  async processSchedules(env) {
    const vapidKeys = {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY
    };

    const keys = await env.PUSH_STORE.list({ prefix: 'schedule:' });
    const nowUtc = new Date();

    for (const key of keys.keys) {
      try {
        const userId = key.name.split(':')[1];
        const scheduleDataStr = await env.PUSH_STORE.get(key.name);
        if (!scheduleDataStr) continue;

        const { schedule, timezone } = JSON.parse(scheduleDataStr);
        if (!schedule || !Array.isArray(schedule)) continue;

        // Calculate local time for user
        const userTimeStr = nowUtc.toLocaleString('en-US', { timeZone: timezone || 'UTC', hour12: false });
        // userTimeStr format: MM/DD/YYYY, HH:mm:ss
        const [datePart, timePart] = userTimeStr.split(', ');
        const [hour, minute] = timePart.split(':');
        const currentLocalTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        
        // Use local date for sent marker
        const [month, day, year] = datePart.split('/');
        const localDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        const subStr = await env.PUSH_STORE.get(`sub:${userId}`);
        if (!subStr) continue;
        const subscription = JSON.parse(subStr);

        for (const item of schedule) {
          if (item.completed) continue;
          if (item.time === currentLocalTime) {
            const sentMarkerKey = `sent:${userId}:${item.id}:${localDateStr}`;
            const alreadySent = await env.PUSH_STORE.get(sentMarkerKey);

            if (!alreadySent) {
              const payload = JSON.stringify({
                title: 'Habitelia Reminder',
                body: `It's time for: ${item.name}`,
                data: { url: '/', id: item.id }
              });

              try {
                const response = await sendWebPush(subscription, payload, vapidKeys);
                
                if (response.status === 201) {
                  // Mark as sent for 24 hours
                  await env.PUSH_STORE.put(sentMarkerKey, '1', { expirationTtl: 86400 });
                } else if (response.status === 404 || response.status === 410) {
                  // Subscription expired or invalid
                  await env.PUSH_STORE.delete(`sub:${userId}`);
                  await env.PUSH_STORE.delete(`schedule:${userId}`);
                  break; // Stop processing this user
                } else {
                  console.error(`Push failed for ${userId} with status ${response.status}: ${await response.text()}`);
                }
              } catch (pushErr) {
                console.error(`Error sending push to ${userId}:`, pushErr);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing schedule for ${key.name}:`, err);
      }
    }
  }
};
