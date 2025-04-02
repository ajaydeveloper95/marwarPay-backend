import { Worker } from "bullmq";
import IORedis from "ioredis";
const connection = new IORedis({ maxRetriesPerRequest: null });

// defind which queue worker 
const worker = new Worker("notifi-queue", async (job) => {
    console.log("I got a message", job.id)
    console.log("I got a data", job.data)
}, { connection })

worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
});