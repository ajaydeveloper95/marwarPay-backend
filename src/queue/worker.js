import { Worker } from 'bullmq';
import { connection } from "./queue.js"
import upiWalletModel from "../models/upiWallet.model.js";
import userDB from '../models/user.model.js';

const upiWalletWorker = new Worker("upiWallet", async job => {

    // start
    const { memberId, transactionAmount, txnID } = job?.data

    if (!memberId || !transactionAmount || !txnID) {
        throw new Error("Invalid job data: memberId, transactionAmount, or txnID missing.");
    }

    // db locking with deducted amount 
    const upiWalletAdd = await userDB.startSession();
    const transactionOptions = {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        maxTimeMS: 3000
    };


    try {
        upiWalletAdd.startTransaction(transactionOptions);
        // const opts = { session: upiWalletAdd };
        const upiWalletUpdateResult = await userDB.findByIdAndUpdate(memberId, { $inc: { upiWalletBalance: + transactionAmount } }, {
            new: true,
            session: upiWalletAdd
        })

        const beforeAmount = upiWalletUpdateResult.upiWalletBalance - transactionAmount
        const afterAmount = upiWalletUpdateResult.upiWalletBalance

        const upiWalletDataObject = {
            memberId: memberId,
            transactionType: "Cr.",
            transactionAmount: transactionAmount,
            beforeAmount: beforeAmount,
            afterAmount: afterAmount,
            description: `Successfully Cr. amount: ${transactionAmount} with trxId: ${txnID}`,
            transactionStatus: "Success"
        }

        await upiWalletModel.create([upiWalletDataObject], { session: upiWalletAdd });

        // Commit the transaction
        await upiWalletAdd.commitTransaction();
    } catch (error) {
        // console.log(error)
        await upiWalletAdd.abortTransaction();
    } finally {
        upiWalletAdd.endSession();
    }
    // session locking end

}, { connection, prefix: 'zanithpay-backend' })

upiWalletWorker.on('completed', (jobId) => {
    // console.log(jobId)
    console.log(`✅ Job ${jobId} completed`);
    null
});

// Listen to job failure
upiWalletWorker.on('failed', (jobId, failedReason) => {
    console.error(`❌ Job ${jobId} failed: ${failedReason}`);
    null
});

export { upiWalletWorker };