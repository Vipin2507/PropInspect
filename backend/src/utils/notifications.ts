import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'

export function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  try {
    getDB()
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(uuidv4(), userId, type, title, message, relatedId)
  } catch {
    // Notification failure must never break the main workflow
  }
}

/** Send the same notification to multiple users. Failures are silently ignored. */
export function createNotifications(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  for (const userId of userIds) {
    createNotification(userId, type, title, message, relatedId)
  }
}
