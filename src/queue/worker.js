import { Worker } from 'bullmq';
import { connection } from "./queue.js"
import upiWalletModel from "../models/upiWallet.model.js";
import eWalletModel from "../models/Ewallet.model.js";
import userDB from '../models/user.model.js';

const upiWalletWorker = new Worker("upiWallet", async job => {

    // start
    const { memberId, transactionAmount, txnID } = job?.data

    // db locking with deducted amount 
    const upiWalletAdd = await userDB.startSession();
    const transactionOptions = {
        readConcern: { level: 'linearizable' },
        writeConcern: { w: 'majority' },
        readPreference: { mode: 'primary' },
        maxTimeMS: 2000
    };


    try {
        await upiWalletAdd.startTransaction(transactionOptions);
        const opts = { upiWalletAdd };
        const upiWalletUpdateResult = await userDB.findByIdAndUpdate(memberId, { $inc: { upiWalletBalance: + transactionAmount } }, {
            returnDocument: 'after',
            upiWalletAdd
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

        await upiWalletModel.create([upiWalletDataObject], opts);

        // Commit the transaction
        await upiWalletAdd.commitTransaction();
    } catch (error) {
        console.log(error)
        await upiWalletAdd.abortTransaction();
    } finally {
        upiWalletAdd.endSession();
    }
    // session locking end

}, { concurrency: 1, connection, prefix: 'zanithpay-backend' })

upiWalletWorker.on('completed', (jobId) => {
    // console.log(jobId)
    // console.log(`✅ Job ${jobId?.data} completed`);
    null
});

// Listen to job failure
upiWalletWorker.on('failed', (jobId, failedReason) => {
    // console.log(jobId?.data, jobId, "data")
    // console.error(`❌ Job ${jobId?.data} failed: ${failedReason}`);
    null
});

const eWalletWorker = new Worker("eWallet", async job => {

    // start
    const { memberId, transactionType, transactionAmount, chargeAmount, txnID } = job?.data

    // db locking with deducted amount 
    const walletDucdsession = await userDB.startSession();
    const transactionOptions = {
        readConcern: { level: 'linearizable' },
        writeConcern: { w: 'majority' },
        readPreference: { mode: 'primary' },
        maxTimeMS: 2000
    };
    // wallet deducted and store ewallet trx
    try {
        walletDucdsession.startTransaction(transactionOptions);
        const opts = { walletDucdsession };

        if (transactionType === "Cr.") {
            // update wallet Cr.
            let userWallet = await userDB.findByIdAndUpdate(memberId, { $inc: { EwalletBalance: + transactionAmount, EwalletFundLock: + transactionAmount } }, {
                returnDocument: 'after',
                walletDucdsession
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - transactionAmount;

            // ewallet store 
            let walletModelDataStore = {
                memberId: user?._id,
                transactionType: "Cr.",
                transactionAmount: transactionAmount,
                beforeAmount: beforeAmount,
                chargeAmount: chargeAmount,
                afterAmount: afterAmount,
                description: `Successfully Dr. amount: ${Number(transactionAmount)} with transaction Id: ${txnID}`,
                transactionStatus: "Success",
            }

            await eWalletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await walletDucdsession.commitTransaction();
        } else if (transactionType === "Dr.") {
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(memberId, { $inc: { EwalletBalance: - transactionAmount, EwalletFundLock: - transactionAmount } }, {
                returnDocument: 'after',
                walletDucdsession
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance + transactionAmount;

            // ewallet store 
            let walletModelDataStore = {
                memberId: user?._id,
                transactionType: "Dr.",
                transactionAmount: transactionAmount,
                beforeAmount: beforeAmount,
                chargeAmount: chargeAmount,
                afterAmount: afterAmount,
                description: `Successfully Dr. amount: ${Number(transactionAmount)} with transaction Id: ${txnID}`,
                transactionStatus: "Success",
            }

            await eWalletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await walletDucdsession.commitTransaction();
        } else {
            null
        }
        // console.log('Transaction committed successfully');
    } catch (error) {
        // console.log(error)
        await walletDucdsession.abortTransaction();
    }
    finally {
        walletDucdsession.endSession();
    }
    // db locking end

}, { concurrency: 1, connection, prefix: 'zanithpay-backend' })

eWalletWorker.on('completed', (jobId) => {
    // console.log(jobId)
    // console.log(`✅ Job ${jobId?.data} completed`);
    null
});

// Listen to job failure
eWalletWorker.on('failed', (jobId, failedReason) => {
    // console.log(jobId?.data, jobId, "data")
    // console.error(`❌ Job ${jobId?.data} failed: ${failedReason}`);
    null
});

export { upiWalletWorker, eWalletWorker };