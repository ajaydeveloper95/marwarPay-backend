import { QueueEvents } from 'bullmq';

import { connection } from "./queue.js"

const upiWalletEvents = new QueueEvents('upiWallet', { connection });

await upiWalletEvents.waitUntilReady();

// Listen to job completion
upiWalletEvents.on('completed', ({ jobId }) => {
  // console.log(`✅ Job ${jobId} completed`);
  null
});

// Listen to job failure
upiWalletEvents.on('failed', ({ jobId, failedReason }) => {
  // console.error(`❌ Job ${jobId} failed: ${failedReason}`);
  null
});

// Listen to other lifecycle events
upiWalletEvents.on('active', ({ jobId }) => {
  // console.log(`🏃 Job ${jobId} started running`);
  null
});

export default upiWalletEvents