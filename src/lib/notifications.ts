/**
 * CASHAM Web Notification Manager
 * Handles native browser Notification permissions, sending task alerts,
 * and smart time-block reminders.
 */

import type { Task } from '../hooks/useTasks';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationStatus {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission as NotificationStatus;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
    if (!isNotificationSupported()) return 'unsupported';
    try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            localStorage.setItem('casham_notifications_enabled', 'true');
        }
        return result as NotificationStatus;
    } catch (e) {
        console.error('[Web Notification requestPermission error]', e);
        return 'denied';
    }
}

export function areNotificationsEnabled(): boolean {
    if (!isNotificationSupported()) return false;
    return Notification.permission === 'granted' && localStorage.getItem('casham_notifications_enabled') !== 'false';
}

export function setNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem('casham_notifications_enabled', enabled ? 'true' : 'false');
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
    if (!isNotificationSupported() || Notification.permission !== 'granted') return false;
    try {
        const notif = new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options,
        });

        notif.onclick = () => {
            window.focus();
            notif.close();
        };

        return true;
    } catch (e) {
        console.error('[Web Notification dispatch error]', e);
        return false;
    }
}

export function sendTestNotification(): boolean {
    return sendBrowserNotification('🔔 CASHAM Notifications Active!', {
        body: 'You are all set! CASHAM will remind you about your scheduled habits and focus tasks.',
        tag: 'casham-test',
    });
}

function getCurrentTimeBlockKey(): { key: string; label: string } {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { key: 'morning', label: 'Morning' };
    if (hour >= 12 && hour < 17) return { key: 'afternoon', label: 'Afternoon' };
    if (hour >= 17 && hour < 22) return { key: 'evening', label: 'Evening' };
    return { key: 'anytime', label: 'Anytime' };
}

/**
 * Checks pending tasks for the current time of day and dispatches a notification
 * if not already alerted for this specific block today.
 */
export function checkAndNotifyPendingTasks(tasks: Task[], todayStr: string): void {
    if (!areNotificationsEnabled()) return;

    const { key, label } = getCurrentTimeBlockKey();
    const notifRecordKey = `casham_notif_${todayStr}_${key}`;

    // Don't alert if we already notified for this block today
    if (localStorage.getItem(notifRecordKey)) return;

    // Filter incomplete tasks matching this block or 'anytime'
    const pending = tasks.filter(t => !t.completed_today && (t.time_block === key || t.time_block === 'anytime'));
    if (pending.length === 0) return;

    const first = pending[0];
    const moreCount = pending.length - 1;
    const bodyText = moreCount > 0
        ? `"${first.title}" and ${moreCount} more pending habit${moreCount > 1 ? 's' : ''}. Keep your streak alive!`
        : `"${first.title}" is waiting to be completed! Keep your streak alive!`;

    const dispatched = sendBrowserNotification(`⏰ CASHAM ${label} Focus (${pending.length} pending)`, {
        body: bodyText,
        tag: `casham-block-${key}`,
    });

    if (dispatched) {
        localStorage.setItem(notifRecordKey, Date.now().toString());
    }
}
