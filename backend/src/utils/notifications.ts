import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../db/database'

export function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId = ''
): void {
  getDB()
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(uuidv4(), userId, type, title, message, relatedId)
}
