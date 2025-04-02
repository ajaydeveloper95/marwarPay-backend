import { Worker } from "bullmq";
import IORedis from "ioredis";
const connection = new IORedis({ maxRetriesPerRequest: null });

// defind which queue worker 
const worker = new Worker("ewallet-queue", async (job) => {
    console.log("I got a data", job.data)
    return "Success"
}, { connection })

worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
    return "Success"
});

worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
});

worker.on('active', (job) => {
    console.log(`Job ${job.id} is now active.`);
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});

export default worker;