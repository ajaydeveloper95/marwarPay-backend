import { Queue } from "bullmq";
import IORedis from 'ioredis';
export const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null, });

export const upiWalletQueue = new Queue('upiWallet', { connection, prefix: 'zanithpay-backend', lockDuration: 60000, maxStalledCount: 3 });

export const eWalletQueue = new Queue('eWallet', { connection, prefix: 'zanithpay-backend', lockDuration: 60000, maxStalledCount: 3 });