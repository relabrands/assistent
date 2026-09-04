"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTasksDueSoon = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
/**
 * Cloud Function to check tasks due soon and send push notifications.
 * Runs every 2 hours.
 */
exports.checkTasksDueSoon = (0, scheduler_1.onSchedule)("every 2 hours", async (event) => {
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
        const notificationsToSend = [];
        // 2. Fetch all push subscriptions
        const subscriptionsSnapshot = await db.collection("push_subscriptions").get();
        const subscriptionsMap = new Map();
        subscriptionsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken && data.enabled !== false) {
                subscriptionsMap.set(data.user_id, data.fcmToken);
            }
        });
        // 3. Process tasks and prepare notifications
        tasksSnapshot.forEach((doc) => {
            const task = doc.data();
            if (!task.due_date)
                return;
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
        }
        else {
            console.log("No notifications needed to be sent.");
        }
        return;
    }
    catch (error) {
        console.error("Error checking tasks:", error);
        return;
    }
});
//# sourceMappingURL=index.js.map