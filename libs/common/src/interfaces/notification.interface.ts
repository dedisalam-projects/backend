export interface INotificationPayload {
  title?: string;
  message?: string;
  type?: string;
  recipientId?: string;
  userId?: string;
  email?: string;
  name?: string;
  timestamp?: string;
  correlationId?: string;
  [key: string]: unknown;
}
