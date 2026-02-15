declare module 'web-push' {
  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface RequestOptions {
    TTL?: number;
    headers?: Record<string, string>;
    timeout?: number;
  }

  interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(subscription: PushSubscription, payload?: string | Buffer, options?: RequestOptions): Promise<SendResult>;
  function generateVAPIDKeys(): { publicKey: string; privateKey: string };

  export { setVapidDetails, sendNotification, generateVAPIDKeys, PushSubscription, RequestOptions, SendResult };
  export default { setVapidDetails, sendNotification, generateVAPIDKeys };
}
