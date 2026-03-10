type NotificationPayload = {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
};

type Subscriber = {
    controller: ReadableStreamDefaultController<Uint8Array>;
    pingId: ReturnType<typeof setInterval>;
};

const encoder = new TextEncoder();

const globalHub = globalThis as unknown as {
    notificationHub?: Map<string, Set<Subscriber>>;
};

function getHub() {
    if (!globalHub.notificationHub) {
        globalHub.notificationHub = new Map();
    }
    return globalHub.notificationHub;
}

function formatEvent(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function subscribeToNotifications(userId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    const hub = getHub();
    const subscribers = hub.get(userId) ?? new Set<Subscriber>();

    const pingId = setInterval(() => {
        controller.enqueue(formatEvent("ping", { ts: Date.now() }));
    }, 25000);

    subscribers.add({ controller, pingId });
    hub.set(userId, subscribers);

    controller.enqueue(formatEvent("ready", { ok: true }));
}

export function unsubscribeFromNotifications(userId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    const hub = getHub();
    const subscribers = hub.get(userId);
    if (!subscribers) return;

    for (const subscriber of subscribers) {
        if (subscriber.controller === controller) {
            clearInterval(subscriber.pingId);
            subscribers.delete(subscriber);
        }
    }

    if (subscribers.size === 0) {
        hub.delete(userId);
    }
}

export function publishNotification(userId: string, payload: NotificationPayload) {
    const hub = getHub();
    const subscribers = hub.get(userId);
    if (!subscribers) return;

    const message = formatEvent("notification", payload);
    for (const subscriber of subscribers) {
        try {
            subscriber.controller.enqueue(message);
        } catch {
            clearInterval(subscriber.pingId);
            subscribers.delete(subscriber);
        }
    }

    if (subscribers.size === 0) {
        hub.delete(userId);
    }
}
