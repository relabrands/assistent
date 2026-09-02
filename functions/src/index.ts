import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function to check tasks due soon and send push notifications.
 * Runs every 2 hours.
 */
export const checkTasksDueSoon = onSchedule("every 2 hours", async (event) => {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  console.log("Checking for tasks due between", todayStart, "and", todayEnd);

  try {
    // 1. Fetch all tasks that are due today and not completed
    const tasksSnapshot = await db
        .collection("tasks")
        .where("status", "!=", "completed")
        .get();

    if (tasksSnapshot.empty) {
      console.log("No pending tasks found.");
      return;
    }

    const notificationsToSend: { token: string; title: string; body: string }[] = [];

    // 2. Fetch all push subscriptions
    const subscriptionsSnapshot = await db.collection("push_subscriptions").get();
    const subscriptionsMap = new Map<string, string>();
    
    subscriptionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && data.enabled !== false) {
        subscriptionsMap.set(data.user_id, data.fcmToken);
      }
    });

    // 3. Process tasks and prepare notifications
    tasksSnapshot.forEach((doc) => {
      const task = doc.data();
      if (!task.due_date) return;

      const dueDate = new Date(task.due_date);
      
      // Check if task is due today
      if (dueDate >= todayStart && dueDate <= todayEnd) {
        const userId = task.assigned_to;
        const fcmToken = subscriptionsMap.get(userId);

        if (fcmToken) {
          notificationsToSend.push({
            token: fcmToken,
            title: `📋 Tarea por vencer: ${task.title}`,
            body: "Esta tarea vence hoy. ¡Recuerda completarla!"
          });
        }
      }
    });

    // 4. Send all notifications using sendEachForMulticast or send
    if (notificationsToSend.length > 0) {
      console.log(`Sending ${notificationsToSend.length} notifications...`);
      
      const promises = notificationsToSend.map(notification => {
        return admin.messaging().send({
          token: notification.token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          webpush: {
            fcmOptions: {
              link: "/" // Open the app when clicked
            }
          }
        }).catch((error) => {
          console.error("Error sending notification to token", notification.token, error);
        });
      });

      await Promise.all(promises);
      console.log("Finished sending notifications.");
    } else {
      console.log("No notifications needed to be sent.");
    }

    return;
  } catch (error) {
    console.error("Error checking tasks:", error);
    return;
  }
});
