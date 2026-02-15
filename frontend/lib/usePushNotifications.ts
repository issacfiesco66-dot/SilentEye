'use client';

import { useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(token: string | null) {
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (!token || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const vapidRes = await fetch(`${API_URL}/api/push/vapid-key`);
      if (!vapidRes.ok) {
        console.warn('VAPID key not available');
        return;
      }
      const { publicKey } = await vapidRes.json();
      if (!publicKey) return;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Send subscription to backend
      const res = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (res.ok) {
        subscribedRef.current = true;
        console.log('Push subscription registered');
      }
    } catch (err) {
      console.error('Push subscription error:', err);
    }
  }, [token]);

  useEffect(() => {
    subscribe();
  }, [subscribe]);
}
