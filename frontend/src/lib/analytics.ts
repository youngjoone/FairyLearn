import { v4 as uuidv4 } from 'uuid';

interface AnalyticsEvent {
  eventName: string;
  payload?: Record<string, any>;
  ts: string;
  sessionId: string;
}

const ANALYTICS_QUEUE_KEY = 'analytics_queue';
const BATCH_SIZE = 5;
const BATCH_SEND_URL = 'http://localhost:8080/api/analytics/batch';

let sessionId: string;

function getSessionId(): string {
  if (!sessionId) {
    let storedSessionId = localStorage.getItem('sessionId');
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem('sessionId', storedSessionId);
    }
    sessionId = storedSessionId;
  }
  return sessionId;
}

async function sendBatch(batch: AnalyticsEvent[]) {
  try {
    const response = await fetch(BATCH_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: batch }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send analytics batch:', response.status, errorText);
      // Retry once if failed (simple retry logic)
      console.warn('Retrying analytics batch send...');
      const retryResponse = await fetch(BATCH_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: batch }),
      });
      if (!retryResponse.ok) {
        console.error('Analytics batch retry failed:', retryResponse.status, await retryResponse.text());
      }
    }
  } catch (error) {
    console.error('Network error sending analytics batch:', error);
  }
}

function processQueue() {
  const queueString = localStorage.getItem(ANALYTICS_QUEUE_KEY);
  let queue: AnalyticsEvent[] = queueString ? JSON.parse(queueString) : [];

  if (queue.length >= BATCH_SIZE) {
    const batchToSend = queue.splice(0, BATCH_SIZE);
    localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue)); // Update queue before sending
    sendBatch(batchToSend);
  }
}

export function track(eventName: string, payload?: Record<string, any>) {
  const event: AnalyticsEvent = {
    eventName,
    payload,
    ts: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  const queueString = localStorage.getItem(ANALYTICS_QUEUE_KEY);
  let queue: AnalyticsEvent[] = queueString ? JSON.parse(queueString) : [];
  queue.push(event);
  localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));

  processQueue();
}

// Process queue on page load to send any remaining events
window.addEventListener('load', processQueue);
window.addEventListener('beforeunload', () => {
  // Attempt to send any remaining events before unload
  const queueString = localStorage.getItem(ANALYTICS_QUEUE_KEY);
  let queue: AnalyticsEvent[] = queueString ? JSON.parse(queueString) : [];
  if (queue.length > 0) {
    sendBatch(queue); // Send all remaining events
    localStorage.removeItem(ANALYTICS_QUEUE_KEY);
  }
});
