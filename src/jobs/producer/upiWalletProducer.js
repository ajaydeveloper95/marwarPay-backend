import { Queue } from "bullmq";

const notificationQueue = new Queue("notifi-queue", {
    connection: {
        host: "127.0.0.1",
        port: "6379"
    }
});

async function init() {
    const Job = await notificationQueue.add("emailsend", { email: "ajaytest@gmail.com", amount: Date.now() })
    console.log("job added to queue id:", Job?.id)
}