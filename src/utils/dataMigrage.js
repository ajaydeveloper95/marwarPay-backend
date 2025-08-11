import cron from "node-cron";
import mongoose from "mongoose";
import EwalletModel from "../models/Ewallet.model.js";
import oldEwalletModel from "../models/oldEwallet.model.js";
import { Mutex } from "async-mutex";
const eWalletMigrate = new Mutex();

function migrateDataEwallet() {
    cron.schedule('*/40 * * * * *', async () => {
        const release = await eWalletMigrate.acquire();
        try {
            console.log("Running cron job to migrate old data...");

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const oldData = await EwalletModel.find({ createdAt: { $lt: thirtyDaysAgo } }).sort({ createdAt: 1 }).limit(20000);

            if (oldData.length > 0) {
                const newData = oldData.map(item => ({
                    memberId: new mongoose.Types.ObjectId((String(item?.memberId))),
                    transactionType: String(item?.transactionType),
                    transactionAmount: item?.transactionAmount,
                    beforeAmount: item?.beforeAmount,
                    chargeAmount: item?.chargeAmount || 0,
                    afterAmount: item?.afterAmount,
                    description: String(item?.description),
                    transactionStatus: String(item?.transactionStatus),
                    migratedAt: new Date(),
                    createdAt: item?.createdAt,
                    updatedAt: item?.updatedAt
                })
                );
                await oldEwalletModel.insertMany(newData);

                const oldDataIds = oldData.map(item => item._id);
                await EwalletModel.deleteMany({ _id: { $in: oldDataIds } });

                console.log(`Successfully migrated ${oldData.length} records.`);
            } else {
                console.log("No data older than 30 day to migrate.");
            }
        } catch (error) {
            console.log("error=>", error.message);
        } finally {
            release()
        }
    }
    )
}

export default function scheduleTask() {
    migrateDataEwallet()
}