import cron from "node-cron";
import axios from "axios";
import userDB from "../models/user.model.js";
import payOutModelGenerate from "../models/payOutGenerate.model.js";
import oldPayOutModelGenerate from "../models/oldPayOutGenerate.model.js";
import walletModel from "../models/Ewallet.model.js";
import payOutModel from "../models/payOutSuccess.model.js";
import LogModel from "../models/Logs.model.js";
import { Mutex } from "async-mutex";
import qrGenerationModel from "../models/qrGeneration.model.js";
import oldQrGenerationModel from "../models/oldQrGeneration.model.js";
import mongoose from "mongoose";
import Log from "../models/Logs.model.js";
import callBackResponseModel from "../models/callBackResponse.model.js";
import payInModel from "../models/payIn.model.js";
import moment from "moment";
import upiWalletModel from "../models/upiWallet.model.js";
import EwalletModel from "../models/Ewallet.model.js";
import { customCallBackPayoutUser } from "../controllers/adminPannelControllers/payOut.controller.js";
import crypto from "crypto";
import payOutSuccessModel from "../models/payOutSuccess.model.js";
// import jsonFile from "../../public/elbolineJsonEntry.json" with { type: "json" };
const matchingTrxIds = [
    "seabird6210244",
]

const trxIdList = [
    "seabird7010828",
    "seabird7009735"]

const payoutMigrateEntry = [
    "seabird8930492",
    "seabird8964113",
]

const transactionMutex = new Mutex();
const transactionMutexMindMatrix = new Mutex();
const transactionMutexImpactPeek = new Mutex();
const transactionMutexImpactFlipZik = new Mutex();
const dataMigratePayoutMutex = new Mutex();
const eWalletMutexQue = new Mutex();
const logsMutex = new Mutex();
const loopMutex = new Mutex();

let trxIdsToAvoid = []
function scheduleWayuPayOutCheckSecond() {
    cron.schedule('*/3 * * * *', async () => {
        const release = await transactionMutexImpactPeek.acquire();
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 2)
        let GetData = await payOutModelGenerate.find({
            isSuccess: "Pending",
            pannelUse: "waayupayPayOutApiSecond",
            createdAt: { $lt: threeHoursAgo },
            trxId: { $nin: trxIdsToAvoid }
        })
            .sort({ createdAt: 1 }).limit(10)
        try {
            if (GetData?.length !== 0) {
                GetData.forEach(async (item) => {
                    trxIdsToAvoid.push(item?.trxId)
                    // console.log(item)
                    await processWaayuPayOutFnSecond(item)
                });
            } else {
                console.log("No Pending Found In Range !")
            }
        } catch (error) {
            console.error('Error during payout check:', error.message);
        } finally {
            release()
        }
    });
}

let trxIdsToAvoidMindMatrix = []
function scheduleWayuPayOutCheckMindMatrix() {
    cron.schedule('*/2 * * * *', async () => {
        const release = await transactionMutexMindMatrix.acquire();
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 2)
        let GetData = await payOutModelGenerate.find({
            isSuccess: "Pending",
            pannelUse: "waayupayPayOutApiMindMatrix",
            createdAt: { $lt: threeHoursAgo },
            trxId: { $nin: trxIdsToAvoidMindMatrix }
        })
            .sort({ createdAt: -1 }).limit(10)
        try {
            if (GetData?.length !== 0) {
                GetData.forEach(async (item, index) => {
                    trxIdsToAvoidMindMatrix.push(item?.trxId)
                    // console.log(item)
                    await processWaayuPayOutFnMindMatrix(item, index)
                });
            } else {
                console.log("No Pending Found In Range !")
            }
        } catch (error) {
            console.error('Error during payout check:', error.message);
        } finally {
            release()
        }
    });
}

async function processWaayuPayOutFnSecond(item) {
    const uatUrl = "https://api.waayupay.com/api/api/api-module/payout/status-check";
    const postAdd = {
        clientId: process.env.WAAYU_CLIENT_ID_TWO,
        secretKey: process.env.WAAYU_SECRET_KEY_TWO,
        clientOrderId: item?.trxId,
    };
    const header = {
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    };

    const { data } = await axios.post(uatUrl, postAdd, header);
    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };
        if (data?.status === 1) {
            // Final update and commit in transaction
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Success" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with success")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            let PayoutStoreData = {
                memberId: item?.memberId,
                amount: item?.amount,
                chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.utr,
                trxId: data?.clientOrderId,
                optxId: data?.orderId,
                isSuccess: "Success",
            }

            let v = await payOutModel.create([PayoutStoreData], opts)
            await session.commitTransaction();

            // callback send 
            let callBackBody = {
                optxid: data?.orderId,
                status: "SUCCESS",
                txnid: data?.clientOrderId,
                amount: item?.amount,
                rrn: data?.utr,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)

            return true;
        }
        else if (data?.status === 4 || data?.status === 0 || data?.statusCode === 6) {
            // trx is falied and update the status
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Failed" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with falied")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: + finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })


            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Cr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await session.commitTransaction();
            // console.log('Transaction committed successfully');

            // console.log("trxId updated==>", item?.trxId);

            return true;
        }
        else {
            console.log(item?.trxId, "not success or failed")
            // trxIdsToAvoid.push(item?.trxId)
            await session.abortTransaction();
            return true;
        }

    } catch (error) {
        console.log("inside the error", error)
        await session.abortTransaction();
        return false
    } finally {
        session.endSession();
        release()
    }
}

async function processWaayuPayOutFnMindMatrix(item, indexNumber) {
    const uatUrl = "https://api.waayupay.com/api/api/api-module/payout/status-check";
    const postAdd = {
        clientId: process.env.WAAYU_CLIENT_ID_MINDMATRIX,
        secretKey: process.env.WAAYU_SECRET_KEY_MINDMATRIX,
        clientOrderId: item?.trxId,
    };
    const header = {
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    };

    const { data } = await axios.post(uatUrl, postAdd, header);
    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };
        if (data?.status === 1) {
            // Final update and commit in transaction
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Success" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with success, Index", indexNumber)
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            let PayoutStoreData = {
                memberId: item?.memberId,
                amount: item?.amount,
                chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.utr,
                trxId: data?.clientOrderId,
                optxId: data?.orderId,
                isSuccess: "Success",
            }

            let v = await payOutModel.create([PayoutStoreData], opts)
            await session.commitTransaction();

            // callback send 
            let callBackBody = {
                optxid: data?.orderId,
                status: "SUCCESS",
                txnid: data?.clientOrderId,
                amount: item?.amount,
                rrn: data?.utr,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)

            return true;
        }
        else if (data?.status === 4 || data?.status === 0 || data?.statusCode === 6) {
            // trx is falied and update the status
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Failed" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with falied, Index", indexNumber)
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: + finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Cr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await session.commitTransaction();
            // console.log('Transaction committed successfully');

            // console.log("trxId updated==>", item?.trxId);

            return true;
        }
        else {
            console.log(item?.trxId, "not success or failed ,Index", indexNumber)
            // trxIdsToAvoidMindMatrix.push(item?.trxId)
            await session.abortTransaction();
            return true;
        }

    } catch (error) {
        console.log("inside the error", error)
        await session.abortTransaction();
        return false
    } finally {
        session.endSession();
        release()
    }
}

let tempTrxIds = []
function scheduleFlipzikImpactPeek() {
    cron.schedule('*/40 * * * * *', async () => {
        const release = await transactionMutexImpactFlipZik.acquire();
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3)

        let GetData = await payOutModelGenerate.find({
            isSuccess: "Pending",
            trxId: { $nin: tempTrxIds },
            createdAt: { $lt: threeHoursAgo },
            pannelUse: "flipzikPayoutImpactPeek"
        })
            .sort({ createdAt: 1 }).limit(1)

        try {
            if (GetData?.length !== 0) {
                GetData.forEach(async (item) => {
                    tempTrxIds.push(item?.trxId)
                    // console.log(item)
                    await processFlipzikPayout(item)
                })
            } else {
                console.log("No Pending Found In Range !")
            }
        } catch (error) {
            console.error('Error during payout check:', error.message);
        }
        finally {
            release()
        }

    });
}

function generateSignature(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', process.env.IMPACTPEEK_FLIPZIK_SECRET_KEY);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

async function processFlipzikPayout(item) {
    const data = await flipzikStatusCheckImpactPeek(item?.trxId)

    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };

        // console.log(data)
        if (data.status === "Success" && data.master_status === "Success") {
            // Final update and commit in transaction
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Success" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with success")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            let PayoutStoreData = {
                memberId: item?.memberId,
                amount: item?.amount,
                chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
                finalAmount: finalEwalletDeducted,
                bankRRN: String(data?.bank_reference_id),
                trxId: item?.trxId,
                optxId: String(data?.id),
                isSuccess: "Success",
            }

            let v = await payOutModel.create([PayoutStoreData], opts)
            await session.commitTransaction();
            // console.log("trxId updated==>", item?.trxId);

            // callback send 
            let callBackBody = {
                optxid: data?.id,
                status: "SUCCESS",
                txnid: data?.merchant_order_id,
                amount: item?.amount,
                rrn: data?.bank_reference_id,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)

            return true;
        }
        else if (data.status === "Failed" || data.master_status === "Failed") {
            // trx is falied and update the status
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Failed" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with falied")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: + finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Cr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await session.commitTransaction();
            // console.log('Transaction committed successfully');

            // callback send 
            let callBackBody = {
                optxid: data?.id,
                status: "FAILED",
                txnid: data?.merchant_order_id,
                amount: item?.amount,
                rrn: data?.bank_reference_id,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)

            return true;
        }
        else if (data === "NotFound") {
            // trx is falied and update the status
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Failed" }, { session, new: true });
            console.log(payoutModelData?.trxId, "failed with not found trx")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: + finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Cr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await session.commitTransaction();

            // console.log('Transaction committed successfully');
            // callback send 
            let callBackBody = {
                optxid: data?.id,
                status: "FAILED",
                txnid: data?.merchant_order_id,
                amount: item?.amount,
                rrn: data?.bank_reference_id,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)

            return true;
        }
        else {
            // console.log(data, "data value")
            console.log("Failed and Success Not Both !", item?.trxId);
            await session.abortTransaction();
            return true;
        }
    } catch (error) {
        console.log("inside the error", error)
        await session.abortTransaction();
        return false
    } finally {
        session.endSession();
        release()
    }

}

async function flipzikStatusCheckImpactPeek(payout_id) {
    try {
        const url = "https://pending.zanithpay.com/pending/flipzikPendingClear";

        const headers = {
            "Content-Type": "application/json"
        };

        const BodyData = {
            "payout_id": payout_id,
            "SecretKey": process?.env?.IMPACTPEEK_FLIPZIK_SECRET_KEY,
            "AccessKey": process?.env?.IMPACTPEEK_FLIPZIK_ACCESS_KEY
        }

        const response = await axios.post(url, BodyData, { headers });

        // console.log("Transaction Status:", response?.data);
        return response?.data?.data;

    } catch (error) {
        console.log(" flipzikStatusCheckImpactPeek ~ error:", error);
        // console.log("error in process flipzik=>", error)
        const errrD = error?.response?.data?.message
        const errrDF = error?.response?.data?.detail
        const result = errrD?.match(/No transaction found with order ID/gi)
        const resultnew = errrDF?.match(/Not found/gi)
        if (result || resultnew) {
            // console.log("inside result and result new")
            return "NotFound"
        }

        return error.response.data.message
    }
}

function migrateDataPayin() {
    cron.schedule('*/20 * * * *', async () => {
        const release = await transactionMutex.acquire();
        try {
            console.log("Running cron job to migrate old data...");

            const threeHoursAgo = new Date();
            threeHoursAgo.setHours(threeHoursAgo.getHours() - 12)

            const oldData = await qrGenerationModel.find({ createdAt: { $lt: threeHoursAgo } }).sort({ createdAt: 1 }).limit(3000);

            if (oldData.length > 0) {
                const newData = oldData.map(item => ({
                    memberId: new mongoose.Types.ObjectId((String(item?.memberId))),
                    name: String(item?.name),
                    amount: Number(item?.amount),
                    trxId: String(item?.trxId),
                    refId: String(item?.refId),
                    ip: String(item?.ip),
                    qrData: String(item?.qrData),
                    qrIntent: String(item?.qrIntent),
                    pannelUse: String(item?.pannelUse),
                    callBackStatus: String(item?.callBackStatus),
                    migratedAt: new Date(),
                    createdAt: item?.createdAt,
                    updatedAt: item?.updatedAt
                })
                );
                await oldQrGenerationModel.insertMany(newData);

                const oldDataIds = oldData.map(item => item._id);
                await qrGenerationModel.deleteMany({ _id: { $in: oldDataIds } });

                console.log(`Successfully migrated ${oldData.length} records.`);
            } else {
                console.log("No data older than 1 day to migrate.");
            }
        } catch (error) {
            console.log("error=>", error.message);
        } finally {
            release()
        }
    }
    )
}

let idNotInclude = [
    "seabird8927040",
    "seabird8906626",
    "seabird8906647",
    "seabird8906606",
    "seabird8906579",
    "seabird8906601",
    "seabird8906585",
    "seabird8906574",
    "seabird8879008",
    "seabird8878927",
    "seabird8859293",
    "seabird8859993",
    "seabird8859897",
    "seabird8859865",
    "seabird8859272",
    "seabird8859017",
    "seabird8859017",
    "seabird8858964",
    "seabird8858964",
    "seabird8858917",
    "seabird8858917",
    "seabird8714692",
    "seabird8713988",
    "seabird8703372",
    "seabird8713877",
    "seabird8713877",
    "seabird8713771",
    "seabird8714092",
    "seabird8715120",
    "seabird8713713",
    "seabird8714255",
    "seabird8858799",
    "seabird8701372",
    "seabird8701098",
    "seabird8858691",
    "seabird8851357",
    "seabird8851356",
    "seabird8851337",
    "seabird8851298",
    "seabird8851262",
    "seabird8851268",
    "seabird8851265",
    "seabird8850584",
    "seabird8849979",
    "seabird8849980",
    "seabird8849855",
    "seabird8849836",
    "seabird8849807",
    "seabird8848786",
    "seabird8848463",
    "seabird8844910",
    "seabird8844877",
    "seabird10196957",
    "seabird10196959",
    "seabird10196958",
    "seabird10196960",
    "seabird10196930",
    "seabird10196161",
    "seabird10196160",
    "seabird10196158",
    "seabird10196159",
    "seabird10196154",
    "seabird10196152",
    "seabird10196153",
    "seabird10196151",
    "seabird10196146",
    "seabird10196128",
    "seabird10196121",
    "seabird10196125",
    "seabird10196118",
    "seabird10196127",
    "seabird10196116",
    "seabird10196114",
    "seabird10196126",
    "seabird10196115",
    "seabird10196112",
    "seabird10196117",
    "seabird10196110",
    "seabird10196109",
    "seabird10196108",
    "seabird10196107",
    "seabird10196124",
    "seabird10196123",
    "seabird10196122",
    "seabird10196120",
    "seabird10196111",
    "seabird10196119",
    "seabird10196113",
    "seabird10196104",
    "seabird10196106",
    "seabird10196103",
    "seabird10196097",
    "seabird10196101",
    "seabird10196088",
    "seabird10196089",
    "seabird10196094",
    "seabird10196096",
    "seabird10196099",
    "seabird10196086",
    "seabird10196100",
    "seabird10196093",
    "seabird10196095",
    "seabird10196090",
    "seabird10196092",
    "seabird10196091",
    "seabird10196083",
    "seabird10196077",
    "seabird10196087",
    "seabird10196082",
    "seabird10196078",
    "seabird10196081",
    "seabird10196085",
    "seabird10196080",
    "seabird10196075",
    "seabird10196079",
    "seabird10196073",
    "seabird10196084",
    "seabird10196076",
    "seabird10196071",
    "seabird10196074",
    "seabird10196062",
    "seabird10196066",
    "seabird10196054",
    "seabird10196052",
    "seabird10196065",
    "seabird10196070",
    "seabird10196056",
    "seabird10196063",
    "seabird10196068",
    "seabird10196047",
    "seabird10196067",
    "seabird10196060",
    "seabird10196058",
    "seabird10196053",
    "seabird10196064",
    "seabird10196061",
    "seabird10196051",
    "seabird10196059",
    "seabird10196049",
    "seabird10196057",
    "seabird10196055",
    "seabird10196050",
    "seabird10196069",
    "seabird10196046",
    "seabird10196041",
    "seabird10196048",
    "seabird10196045",
    "seabird10196044",
    "seabird10196026",
    "seabird10196034",
    "seabird10196042",
    "seabird10196043",
    "seabird10196038",
    "seabird10196039",
    "seabird10196036",
    "seabird10196027",
    "seabird10196031",
    "seabird10196028",
    "seabird10196029",
    "seabird10196022",
    "seabird10196024",
    "seabird10196023",
    "seabird10196021",
    "seabird10196020",
    "seabird10196030",
    "seabird10196016",
    "seabird10196006",
    "seabird10196037",
    "seabird10196015",
    "seabird10196013",
    "seabird10196019",
    "seabird10196017",
    "seabird10196014",
    "seabird10196012",
    "seabird10195999",
    "seabird10195997",
    "seabird10196000",
    "seabird10196010",
    "seabird10196002",
    "seabird10196005",
    "seabird10196009",
    "seabird10196008",
    "seabird10195996",
    "seabird10196004",
    "seabird10195998",
    "seabird10196003",
    "seabird10196001",
    "seabird10196011",
    "seabird10196032",
]

function migrateDataPayOut() {
    cron.schedule('*/20 * * * *', async () => {
        const release = await dataMigratePayoutMutex.acquire();
        try {
            console.log("Running cron job to migrate old data Payout...");

            const threeHoursAgo = new Date();
            threeHoursAgo.setHours(threeHoursAgo.getHours() - 12)

            const oldData = await payOutModelGenerate.find({ createdAt: { $lt: threeHoursAgo }, isSuccess: { $nin: ["Pending", "pending"] }, trxId: { $nin: idNotInclude } }).sort({ createdAt: 1 }).limit(1);

            if (oldData.length > 0) {
                const newData = oldData.map(item => ({
                    memberId: new mongoose.Types.ObjectId((String(item?.memberId))),
                    mobileNumber: String(item?.mobileNumber),
                    accountHolderName: String(item?.accountHolderName),
                    accountNumber: String(item?.accountNumber),
                    ifscCode: String(item?.ifscCode),
                    amount: Number(item?.amount),
                    gatwayCharge: Number(item?.gatwayCharge) || Number(item?.afterChargeAmount) - Number(item?.amount),
                    afterChargeAmount: Number(item?.afterChargeAmount),
                    trxId: String(item?.trxId),
                    pannelUse: String(item?.pannelUse),
                    isSuccess: String(item?.isSuccess),
                    migratedAt: new Date(),
                    createdAt: item?.createdAt,
                    updatedAt: item?.updatedAt
                })
                );
                await oldPayOutModelGenerate.insertMany(newData);

                const oldDataIds = oldData.map(item => item._id);
                await payOutModelGenerate.deleteMany({ _id: { $in: oldDataIds } });

                console.log(`Successfully migrated Payout ${oldData.length} records.`);
            } else {
                console.log("No data older than 1 day to migrate.");
            }
        } catch (error) {
            console.log("error=>", error.message);
        } finally {
            release()
        }
    }
    )
}

function logsClearFunc() {
    cron.schedule('* * */7 * *', async () => {
        let date = new Date();
        let DateComp = `${date.getFullYear()}-${(date.getMonth()) + 1}-${date.getDate() - 2}`
        await LogModel.deleteMany({ createdAt: { $lt: new Date(DateComp) } });
    });
}

// function payinScheduleTask() {
//     cron.schedule('*/10 * * * * *', async () => {
//         const release = await logsMutex.acquire()
//         try {
//             const logsToUpdate = await Log.aggregate([
//                 {
//                     $match: {
//                         "requestBody.status": 200,
//                         "responseBody": { $regex: "\"message\":\"Failed\"", $options: "i" }
//                     }
//                 },
//                 { $limit: 100 }
//             ]);

//             for (const log of logsToUpdate) {
//                 const trxId = log.requestBody.trxId;
//                 if (!trxId) continue;

//                 // Find QR Generation documents and update their callback status
//                 const qrDoc = await qrGenerationModel.findOneAndUpdate(
//                     { trxId, callBackStatus: "Pending" },
//                     { callBackStatus: "Success" }
//                 );

//                 if (!qrDoc) continue;

//                 // Prepare callback data from Log's requestBody
//                 let callBackData = log.requestBody;

//                 if (Object.keys(callBackData).length === 1) {
//                     const key = Object.keys(callBackData)[0];
//                     callBackData = JSON.parse(key);
//                 }

//                 const switchApi = callBackData.partnerTxnId
//                     ? "neyopayPayIn"
//                     : callBackData.txnID
//                         ? "marwarpayInSwitch"
//                         : null;

//                 if (!switchApi) continue;

//                 const data =
//                     switchApi === "neyopayPayIn"
//                         ? {
//                             status: callBackData?.txnstatus === "Success" ? 200 : 400,
//                             payerAmount: callBackData?.amount,
//                             payerName: callBackData?.payerName,
//                             txnID: callBackData?.partnerTxnId,
//                             BankRRN: callBackData?.rrn,
//                             payerVA: callBackData?.payerVA,
//                             TxnInitDate: callBackData?.TxnInitDate,
//                             TxnCompletionDate: callBackData?.TxnCompletionDate,
//                         }
//                         : {
//                             status: callBackData?.status,
//                             payerAmount: callBackData?.payerAmount,
//                             payerName: callBackData?.payerName,
//                             txnID: callBackData?.txnID,
//                             BankRRN: callBackData?.BankRRN,
//                             payerVA: callBackData?.payerVA,
//                             TxnInitDate: callBackData?.TxnInitDate,
//                             TxnCompletionDate: callBackData?.TxnCompletionDate,
//                         };

//                 if (data.status !== 200) continue;

//                 const userInfoPromise = userDB.aggregate([
//                     { $match: { _id: qrDoc.memberId } },
//                     { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
//                     { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
//                     { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
//                     { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
//                     { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } },
//                 ]);

//                 const callBackPayinUrlPromise = callBackResponseModel
//                     .find({ memberId: qrDoc.memberId, isActive: true })
//                     .select("_id payInCallBackUrl isActive");

//                 const [userInfoResult, callBackPayinUrlResult] = await Promise.allSettled([
//                     userInfoPromise,
//                     callBackPayinUrlPromise,
//                 ]);

//                 const userInfo = userInfoResult.value?.[0];
//                 const callBackPayinUrl = callBackPayinUrlResult.value?.[0]?.payInCallBackUrl;

//                 if (!userInfo || !callBackPayinUrl) continue;

//                 const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
//                 const charge = chargeRange.find(
//                     (range) => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount
//                 );

//                 const userChargeApply =
//                     charge.chargeType === "Flat"
//                         ? charge.charge
//                         : (charge.charge / 100) * data.payerAmount;
//                 const finalAmountAdd = data.payerAmount - userChargeApply;

//                 const [upiWalletUpdateResult, payInCreateResult] = await Promise.allSettled([
//                     userDB.findByIdAndUpdate(userInfo._id, {
//                         upiWalletBalance: userInfo.upiWalletBalance + finalAmountAdd,
//                     }),
//                     payInModel.create({
//                         memberId: qrDoc.memberId,
//                         payerName: data.payerName,
//                         trxId: data.txnID,
//                         amount: data.payerAmount,
//                         chargeAmount: userChargeApply,
//                         finalAmount: finalAmountAdd,
//                         vpaId: data.payerVA,
//                         bankRRN: data.BankRRN,
//                         description: `QR Generated Successfully Amount:${data.payerAmount} PayerVa:${data.payerVA} BankRRN:${data.BankRRN}`,
//                         trxCompletionDate: data.TxnCompletionDate,
//                         trxInItDate: data.TxnInitDate,
//                         isSuccess: data.status === 200 ? "Success" : "Failed",
//                     }),
//                 ]);

//                 if (
//                     upiWalletUpdateResult.status === "rejected" ||
//                     payInCreateResult.status === "rejected"
//                 ) {
//                     console.error("Error updating wallet or creating pay-in record");
//                     continue;
//                 }

//                 const userRespSendApi = {
//                     status: data.status,
//                     payerAmount: data.payerAmount,
//                     payerName: data.payerName,
//                     txnID: data.txnID,
//                     BankRRN: data.BankRRN,
//                     payerVA: data.payerVA,
//                     TxnInitDate: data.TxnInitDate,
//                     TxnCompletionDate: data.TxnCompletionDate,
//                 };

//                 await axios.post(callBackPayinUrl, userRespSendApi, {
//                     headers: {
//                         Accept: "application/json",
//                         "Content-Type": "application/json",
//                     },
//                 });
//             }
//         } catch (error) {

//         } finally {
//             release()
//         }
//     });
// }

function payinScheduleTask() {
    cron.schedule('0,30 * * * *', async () => {
        const release = await logsMutex.acquire()
        try {
            const startOfYesterday = moment().startOf('day').subtract(1, 'day').toDate();
            const endOfYesterday = moment().startOf('day').subtract(1, 'milliseconds').toDate();
            const endOfLastHalfHour = moment().toDate(); // Current time
            const startOfLastHalfHour = moment().subtract(30, 'minutes').toDate();
            const logs = await Log.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfYesterday,
                            $lte: endOfYesterday,
                            // $gte: startOfLastHalfHour,
                            // $lte: endOfLastHalfHour,
                        },

                        "requestBody.status": 200,
                        // "requestBody.txnID": { $regex: "seabird74280342", $options: "i" },
                        // "requestBody.txnID": {
                        //     $in: [
                        //         "seabird74592153", "seabird74592045", "seabird74592191",
                        //         "seabird74592244"
                        //     ],
                        // },
                        "responseBody": { $regex: "\"message\":\"Failed\"", $options: "i" },
                        url: { $regex: "/apiAdmin/v1/payin/callBackResponse", $options: "i" },
                        description: { $nin: ["Log processed for payin and marked success"] }
                    },
                },
                { $sort: { createdAt: -1 } },
                { $limit: 10 }
            ]);



            if (!logs.length) return;

            for (const log of logs) {
                const loopRelease = await loopMutex.acquire()
                try {
                    const trxId = log.requestBody.txnID;
                    if (!trxId) throw new Error("Missing trxId in log");
                    let qrDoc
                    qrDoc = await qrGenerationModel.findOneAndUpdate(
                        { trxId },
                        // { trxId, callBackStatus: "Pending" },
                        { callBackStatus: "Success" }
                    )

                    if (!qrDoc) {
                        qrDoc = await oldQrGenerationModel.findOneAndUpdate(
                            { trxId },
                            // { trxId, callBackStatus: "Pending" },
                            { callBackStatus: "Success" }
                        );
                    }
                    console.log("qrDoc>>", qrDoc);

                    if (!qrDoc) throw new Error("QR Generation document not found or already processed");

                    let callBackData = log.requestBody;
                    if (Object.keys(callBackData).length === 1) {
                        const key = Object.keys(callBackData)[0];
                        callBackData = JSON.parse(key);
                    }

                    const switchApi = callBackData.partnerTxnId
                        ? "neyopayPayIn"
                        : callBackData.txnID
                            ? "marwarpayInSwitch"
                            : null;

                    if (!switchApi) throw new Error("Invalid transaction data in log");

                    const data = switchApi === "neyopayPayIn"
                        ? {
                            status: callBackData?.txnstatus === "Success" ? 200 : 400,
                            payerAmount: callBackData?.amount,
                            payerName: callBackData?.payerName,
                            txnID: callBackData?.partnerTxnId,
                            BankRRN: callBackData?.rrn,
                            payerVA: callBackData?.payerVA,
                            TxnInitDate: callBackData?.TxnInitDate,
                            TxnCompletionDate: callBackData?.TxnCompletionDate,
                        }
                        : {
                            status: callBackData?.status,
                            payerAmount: callBackData?.payerAmount,
                            payerName: callBackData?.payerName,
                            txnID: callBackData?.txnID,
                            BankRRN: callBackData?.BankRRN,
                            payerVA: callBackData?.payerVA,
                            TxnInitDate: callBackData?.TxnInitDate,
                            TxnCompletionDate: callBackData?.TxnCompletionDate,
                        };

                    if (data.status !== 200) throw new Error("Transaction is pending or not successful");

                    const [userInfo] = await userDB.aggregate([
                        { $match: { _id: qrDoc.memberId } },
                        { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                        { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
                        { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } },
                    ])
                    const callBackPayinUrl = await callBackResponseModel.findOne({ memberId: qrDoc.memberId, isActive: true }).select("payInCallBackUrl")


                    if (!callBackPayinUrl) throw new Error("Callback URL is missing");


                    if (!userInfo) throw new Error("User info missing");

                    const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
                    const charge = chargeRange.find(
                        (range) => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount
                    );

                    if (!charge) return;

                    const userChargeApply =
                        charge.chargeType === "Flat"
                            ? charge.charge
                            : (charge.charge / 100) * data.payerAmount;
                    const finalAmountAdd = data.payerAmount - userChargeApply;

                    const tempPayin = await payInModel.findOne({ trxId: qrDoc?.trxId })

                    if (tempPayin) {
                        await Log.findByIdAndUpdate(log._id, {
                            $push: { description: "Log processed for payin and marked success" },
                        });
                        throw new Error("Trasaction already created");
                    }
                    const upiWalletDataObject = {
                        memberId: userInfo?._id,
                        transactionType: "Cr.",
                        transactionAmount: finalAmountAdd,
                        beforeAmount: userInfo?.upiWalletBalance,
                        afterAmount: Number(userInfo?.upiWalletBalance) + Number(finalAmountAdd),
                        description: `Successfully Cr. amount: ${finalAmountAdd}  trxId: ${data.txnID}`,
                        transactionStatus: "Success"
                    }

                    await upiWalletModel.create(upiWalletDataObject);
                    const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, {
                        $inc: { upiWalletBalance: finalAmountAdd },
                    })

                    const payInCreateResult = await payInModel.create({
                        memberId: qrDoc.memberId,
                        payerName: data.payerName,
                        trxId: data.txnID,
                        amount: data.payerAmount,
                        chargeAmount: userChargeApply,
                        finalAmount: finalAmountAdd,
                        vpaId: data.payerVA,
                        bankRRN: data.BankRRN,
                        description: `QR Generated Successfully Amount:${data.payerAmount} PayerVa:${data.payerVA} BankRRN:${data.BankRRN}`,
                        trxCompletionDate: data.TxnCompletionDate,
                        trxInItDate: data.TxnInitDate,
                        isSuccess: "Success",
                    })

                    if (!upiWalletUpdateResult || !payInCreateResult) {
                        throw new Error("Error updating wallet or creating pay-in record");
                    }

                    const userRespSendApi = {
                        status: data.status,
                        payerAmount: data.payerAmount,
                        payerName: data.payerName,
                        txnID: data.txnID,
                        BankRRN: data.BankRRN,
                        payerVA: data.payerVA,
                        TxnInitDate: data.TxnInitDate,
                        TxnCompletionDate: data.TxnCompletionDate,
                    };
                    console.log("callBackPayinUrl.payInCallBackUrl>>>", callBackPayinUrl.payInCallBackUrl, userRespSendApi);



                    await axios.post(callBackPayinUrl.payInCallBackUrl, userRespSendApi, {
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                    });

                    await Log.findByIdAndUpdate(log._id, {
                        $push: { description: "Log processed for payin and marked success" },
                    });

                } catch (error) {
                    console.error(`Error processing log with trxId ${log.requestBody.txnID}:`, error.message);
                } finally {
                    loopRelease()
                }
            }

        } catch (error) {
            console.log("Error in payin schedule task:", error.message);
        } finally {
            release()
        }
    });
}

function payinScheduleTask2() {
    cron.schedule('*/10 * * * * *', async () => {
        const release = await logsMutex.acquire()
        try {
            const startOfYesterday = moment().startOf('day').subtract(1, 'day').toDate();
            const endOfYesterday = moment().startOf('day').subtract(1, 'milliseconds').toDate();
            const endOfLastHalfHour = moment().toDate(); // Current time
            const startOfLastHalfHour = moment().subtract(30, 'minutes').toDate();
            // const logs = await oldQrGenerationModel.aggregate([
            //     {
            //         $match: {
            //             trxId:{$in: matchingPayinTrxIds}
            //         },
            //     },
            //     { $limit: 1 }
            // ]);

            // if (!logs.length) return;

            for (const log of matchingPayinTrx) {
                const loopRelease = await loopMutex.acquire()
                try {
                    const trxId = log.trxId;
                    if (!trxId) throw new Error("Missing trxId in log");
                    let qrDoc
                    qrDoc = await qrGenerationModel.findOneAndUpdate(
                        { trxId, callBackStatus: { $ne: "Success" } },
                        // { trxId, callBackStatus: "Pending" },
                        { callBackStatus: "Success" },
                        { returnDocument: "after" }
                    )

                    if (!qrDoc) {
                        qrDoc = await oldQrGenerationModel.findOneAndUpdate(
                            { trxId, callBackStatus: { $ne: "Success" } },
                            // { trxId, callBackStatus: "Pending" },
                            { callBackStatus: "Success" },
                            { returnDocument: "after" }
                        );
                    }
                    console.log("qrDoc>>", qrDoc);

                    if (!qrDoc) throw new Error("QR Generation document not found or already processed");

                    // let callBackData = log.requestBody;
                    // if (Object.keys(callBackData).length === 1) {
                    //     const key = Object.keys(callBackData)[0];
                    //     callBackData = JSON.parse(key);
                    // }

                    // const switchApi = callBackData.partnerTxnId
                    //     ? "neyopayPayIn"
                    //     : callBackData.txnID
                    //         ? "marwarpayInSwitch"
                    //         : null;

                    // if (!switchApi) throw new Error("Invalid transaction data in log");

                    // const data = switchApi === "neyopayPayIn"
                    //     ? {
                    //         status: callBackData?.txnstatus === "Success" ? 200 : 400,
                    //         payerAmount: callBackData?.amount,
                    //         payerName: callBackData?.payerName,
                    //         txnID: callBackData?.partnerTxnId,
                    //         BankRRN: callBackData?.rrn,
                    //         payerVA: callBackData?.payerVA,
                    //         TxnInitDate: callBackData?.TxnInitDate,
                    //         TxnCompletionDate: callBackData?.TxnCompletionDate,
                    //     }
                    //     : {
                    //         status: callBackData?.status,
                    //         payerAmount: callBackData?.payerAmount,
                    //         payerName: callBackData?.payerName,
                    //         txnID: callBackData?.txnID,
                    //         BankRRN: callBackData?.BankRRN,
                    //         payerVA: callBackData?.payerVA,
                    //         TxnInitDate: callBackData?.TxnInitDate,
                    //         TxnCompletionDate: callBackData?.TxnCompletionDate,
                    //     };

                    // if (data.status !== 200) throw new Error("Transaction is pending or not successful");

                    const [userInfo] = await userDB.aggregate([
                        { $match: { _id: qrDoc.memberId } },
                        { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                        { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
                        { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } },
                    ])
                    const callBackPayinUrl = await callBackResponseModel.findOne({ memberId: qrDoc.memberId, isActive: true }).select("payInCallBackUrl")


                    if (!callBackPayinUrl) throw new Error("Callback URL is missing");


                    if (!userInfo) throw new Error("User info missing");
                    const payerAmount = qrDoc?.amount
                    const payerName = qrDoc?.name

                    const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
                    const charge = chargeRange.find(
                        (range) => range.lowerLimit <= payerAmount && range.upperLimit > payerAmount
                    );

                    if (!charge) throw new Error("Package details are invalid.");;

                    const userChargeApply =
                        charge.chargeType === "Flat"
                            ? charge.charge
                            : (charge.charge / 100) * payerAmount;
                    const finalAmountAdd = payerAmount - userChargeApply;

                    const tempPayin = await payInModel.findOne({ trxId: qrDoc?.trxId })
                    const [tempUpiDoc] = await upiWalletModel.find({ description: { $regex: trxId, $options: 'i' } })

                    if (tempPayin || tempUpiDoc) {
                        // await Log.findByIdAndUpdate(log._id, {
                        //     $push: { description: "Log processed for payin and marked success" },
                        // });
                        throw new Error(`Trasaction already created: ${tempPayin ? tempPayin : tempUpiDoc}`);
                    }
                    const upiWalletDataObject = {
                        memberId: userInfo?._id,
                        transactionType: "Cr.",
                        transactionAmount: finalAmountAdd,
                        beforeAmount: userInfo?.upiWalletBalance,
                        afterAmount: Number(userInfo?.upiWalletBalance) + Number(finalAmountAdd),
                        description: `Successfully Cr. amount: ${finalAmountAdd}  trxId: ${trxId}`,
                        transactionStatus: "Success"
                    }

                    await upiWalletModel.create(upiWalletDataObject);
                    const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, {
                        $inc: { upiWalletBalance: finalAmountAdd },
                    })

                    const payInCreateResult = await payInModel.create({
                        memberId: qrDoc.memberId,
                        payerName: payerName,
                        trxId: trxId,
                        amount: payerAmount,
                        chargeAmount: userChargeApply,
                        finalAmount: finalAmountAdd,
                        vpaId: log.VPA,
                        bankRRN: log.RRN,
                        description: `QR Generated Successfully Amount:${payerAmount} PayerVa:${log.VPA} BankRRN:${log.RRN}`,
                        trxCompletionDate: new Date(log.trxDate),
                        trxInItDate: qrDoc?.createdAt,
                        isSuccess: "Success",
                    })

                    if (!upiWalletUpdateResult || !payInCreateResult) {
                        throw new Error("Error updating wallet or creating pay-in record");
                    }

                    const userRespSendApi = {
                        status: 200,
                        payerAmount: payerAmount,
                        payerName: payerName,
                        txnID: trxId,
                        BankRRN: log.BankRRN,
                        payerVA: log.VPA,
                        TxnInitDate: new Date(qrDoc.createdAt),
                        TxnCompletionDate: log.trxDate,
                    };
                    console.log("callBackPayinUrl.payInCallBackUrl>>>", callBackPayinUrl.payInCallBackUrl, userRespSendApi);



                    await axios.post(callBackPayinUrl.payInCallBackUrl, userRespSendApi, {
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                    });
                    break
                    // await Log.findByIdAndUpdate(log._id, {
                    //     $push: { description: "Log processed for payin and marked success" },
                    // });

                } catch (error) {
                    console.error(`Error processing log with trxId ${log.trxId}:`, error.message);
                    break
                } finally {
                    loopRelease()
                }
            }

        } catch (error) {
            console.log("Error in payin schedule task:", error.message);
        } finally {
            release()
        }
    });
}

function payoutDeductDoubleTaskScript() {
    cron.schedule('*/10 * * * * *', async () => {
        console.log('Cron job started:', new Date(),);

        try {
            const startOfLastDay = moment().subtract(1, 'day').startOf('day').toDate();
            const endOfLastDay = moment().subtract(1, 'day').endOf('day').toDate();

            const logs = await Log.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfLastDay,
                            $lte: new Date()
                        },
                        responseBody: { $regex: '"status":1', $options: 'i' }
                    }
                },
                {
                    $project: {
                        trxId: '$requestBody.trxId'
                    }
                }
            ]);

            if (!logs.length) {
                console.log('No matching logs found for the last day.');
                return;
            }

            const trxIds = logs.map(log => log.trxId);

            const regexPatterns = trxIds.map(trxId => new RegExp(trxId, 'i'));

            let updatedArrayOfEwallet = [];

            for (const txnId of trxIds) {
                const [updateResult] = await EwalletModel.find(
                    {
                        description: { $regex: txnId, $options: "i" },
                        transactionType: { $regex: 'Cr.', $options: "i" },
                    }
                );

                if (updateResult) {
                    try {
                        updatedArrayOfEwallet.push(updateResult)
                        const { transactionAmount, chargeAmount, memberId } = updateResult
                        const user = await userDB.findById(memberId)
                        const finalAmountDeduct = 2 * (Number(transactionAmount) + Number(chargeAmount))
                        user.EwalletBalance -= finalAmountDeduct;
                        await user.save()
                        const ewalletDoc = await EwalletModel.create({
                            memberId,
                            transactionType: "Dr.",
                            transactionAmount: transactionAmount,
                            beforeAmount: user.EwalletBalance,
                            chargeAmount: chargeAmount,
                            afterAmount: Number(user.EwalletBalance) - Number(finalAmountDeduct),
                            description: `Successfully Dr. amount: ${finalAmountDeduct} with transaction Id: ${txnId}`,
                            transactionStatus: "Success",
                        })

                        if (ewalletDoc) await updateResult.deleteOne({ _id: updateResult?._id })
                    } catch (error) {
                        console.log("error.message>>>", error.message);
                        break
                    }

                }
            }


            console.log(`Total modified documents in eWallets: ${updatedArrayOfEwallet.length}`);
        } catch (error) {
            console.error('Error in cron job:', error.message);
        } finally {
            console.log('Cron job completed:', new Date());
        }
    });
}
var scriptRan = false
function payoutDeductPackageTaskScript() {
    cron.schedule('*/10 * * * * *', async () => {
        console.log('Cron job started:', new Date());
        if (scriptRan) return
        scriptRan = true

        try {

            for (const txnId of matchedTrxIds) {
                const [updateResult] = await EwalletModel.find(
                    {
                        description: { $regex: txnId, $options: "i" },
                    }
                );

                const payoutRecord = await payOutModel.findOne({ trxId: txnId })
                if (updateResult && payoutRecord) {
                    try {
                        const [user] = await userDB.aggregate([
                            {
                                $match: {
                                    // $and: [{ userName }, { trxAuthToken: authToken }, { isActive: true }]
                                    _id: payoutRecord.memberId
                                }
                            },
                            { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } },
                            { $unwind: "$payOutApi" },
                            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                            { $unwind: "$package" },
                            { $lookup: { from: "payoutpackages", localField: "package.packagePayOutCharge", foreignField: "_id", as: "packageCharge" } },
                            { $unwind: "$packageCharge" },
                            { $project: { "userName": 1, "memberId": 1, "EwalletBalance": 1, "minWalletBalance": 1, "payOutApi": 1, "packageCharge": 1 } }
                        ]);
                        if (updateResult.transactionType != "Dr.") return
                        //Addition before deduction the real charge + amount
                        let finalAmountAdd = payoutRecord.chargeAmount + payoutRecord.amount
                        user.EwalletBalance += finalAmountAdd;
                        console.log("finalamountAdd>>>>", finalAmountAdd);

                        await userDB.updateOne({ _id: user._id }, { $set: { EwalletBalance: user.EwalletBalance } });

                        if (!user) {
                            return console.log({ message: "Failed", data: "Invalid Credentials or User Inactive!" });
                        }

                        const { payOutApi, packageCharge, EwalletBalance, minWalletBalance } = user;
                        const amount = payoutRecord.amount

                        if (payOutApi.apiName === "ServerMaintenance") {
                            return console.log({ message: "Failed", data: { status_msg: "Server Under Maintenance!", status: 400, trxID: txnId } });
                        }

                        const chargeDetails = packageCharge.payOutChargeRange.find(value => value.lowerLimit <= amount && value.upperLimit > amount);
                        if (!chargeDetails) {
                            return console.log({ message: "Failed", data: "Invalid package!" });
                        }

                        const chargeAmount = chargeDetails.chargeType === "Flat" ? chargeDetails.charge : (chargeDetails.charge / 100) * amount;
                        const finalAmountDeduct = amount + chargeAmount;
                        const usableBalance = EwalletBalance - minWalletBalance;

                        const payoutGen = await payOutModelGenerate.findOneAndUpdate(
                            { trxId: txnId },
                            { afterChargeAmount: finalAmountDeduct, gatwayCharge: chargeAmount },
                            { new: true, strict: true }
                        )

                        user.EwalletBalance -= finalAmountDeduct;
                        await userDB.updateOne({ _id: user._id }, { $set: { EwalletBalance: user.EwalletBalance } });

                        payoutRecord.chargeAmount = chargeAmount
                        payoutRecord.finalAmount = finalAmountDeduct
                        await payoutRecord.save()

                        updateResult.chargeAmount = chargeAmount
                        updateResult.afterAmount = Number(user.EwalletBalance) - Number(finalAmountDeduct)

                        await updateResult.save()
                        console.log("script ran for trxId:", txnId);
                    } catch (error) {
                        console.log("error.message>>>", error.message);
                        break
                    }

                }
            }
        } catch (error) {
            console.error('Error in cron job:', error.message);
        } finally {
            console.log('Cron job completed:', new Date());
        }
    });
}

function FailedToSuccessPayout() {
    trxIdList.forEach(async (trxId, index) => {
        let item = await payOutModelGenerate.findOne({ trxId: trxId });
        if (item?.isSuccess === "Failed") {
            let a = await FailedTOsuccessHelp(item)
            console.log(a)
            // console.log(item)
        }
    })
}

async function FailedTOsuccessHelp(item) {
    const uatUrl = "https://api.waayupay.com/api/api/api-module/payout/status-check";
    const postAdd = {
        clientId: process.env.WAAYU_CLIENT_ID_TWO,
        secretKey: process.env.WAAYU_SECRET_KEY_TWO,
        clientOrderId: item?.trxId,
    };
    const header = {
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    };

    const { data } = await axios.post(uatUrl, postAdd, header);
    // console.log("!!!!!!!!!!!!!!!!!!!!", data, "!!!!!!!!!!!!!!!!!!!!!")
    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };

        // console.log(data?.status)

        // if (data?.status === null) {
        //     await session.abortTransaction();
        //     return false
        // }
        if (data?.status === 1) {
            // Final update and commit in transaction
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Success" }, { session, new: true });
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: - finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance + finalEwalletDeducted;

            console.log("afterAmount", afterAmount)
            console.log("beforeAmount", beforeAmount)


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Dr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Dr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)

            let PayoutStoreData = {
                memberId: item?.memberId,
                amount: item?.amount,
                chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.utr,
                trxId: data?.clientOrderId,
                optxId: data?.orderId,
                isSuccess: "Success",
            }

            let v = await payOutModel.create([PayoutStoreData], opts)
            await session.commitTransaction();
            // console.log("trxId updated==>", item?.trxId);
            // send callback payout
            let callBackBody = {
                optxid: data?.orderId,
                status: "SUCCESS",
                txnid: data?.clientOrderId,
                amount: item?.amount,
                rrn: data?.utr,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)
            return true;
        }
    } catch (error) {
        console.log("inside the error", error)
        await session.abortTransaction();
        return false
    } finally {
        session.endSession();
        release()
    }
}

function EwalletManuplation() {
    let amount = 0;
    let charAmount = 0;
    let TotalAmount = 0;
    // jsonFile.forEach(async (item, index) => {

    //     // if (index > 2) {
    //     //     return false;
    //     // }
    //     // console.log(item)
    //     let trxType = "Dr."
    //     if (item?.memberId === "67600d55714301611294469e") {
    //         amount += item?.transactionAmount;
    //         charAmount += item?.chargeAmount;
    //         TotalAmount += item?.Total
    // await EwalletManuplationFunctionGen(item, trxType)
    //     }
    // })
    console.log("total amount", amount)
    console.log("total chargeamount", charAmount)
    console.log("total with char amount", TotalAmount)
}

// async function EwalletManuplationFunctionGen(item, transactionType) {
//     if (transactionType === "Dr.") {
//         console.log("It's Dr. !!")
//         // start debit
//         const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
//         const release = await eWalletMutexQue.acquire();
//         try {
//             session.startTransaction();
//             const opts = { session };

//             let finalEwalletDeducted = item?.Total

//             // update ewallets
//             // update wallet 
//             let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: - finalEwalletDeducted } }, {
//                 returnDocument: 'after',
//                 session
//             })

//             let afterAmount = userWallet?.EwalletBalance
//             let beforeAmount = userWallet?.EwalletBalance + finalEwalletDeducted;


//             // ewallet store 
//             let walletModelDataStore = {
//                 memberId: item?.memberId,
//                 transactionType: "Dr.",
//                 transactionAmount: item?.transactionAmount,
//                 beforeAmount: beforeAmount,
//                 chargeAmount: item?.chargeAmount,
//                 afterAmount: afterAmount,
//                 description: `Successfully Dr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.TXNID}`,
//                 transactionStatus: "Success",
//             }

//             await walletModel.create([walletModelDataStore], opts)
//             // Commit the transaction
//             await session.commitTransaction();
//             console.log("Success Dr. trx :", item?.TXNID)
//             return true;

//         } catch (error) {
//             console.log("inside the error", error)
//             await session.abortTransaction();
//             return false
//         } finally {
//             session.endSession();
//             release()
//         }
//         // end debit
//     } else if (transactionType === "Cr.") {
//         console.log("It's Cr. !!")
//         // start Credit
//         const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
//         const release = await eWalletMutexQue.acquire();
//         try {
//             session.startTransaction();
//             const opts = { session };

//             let finalEwalletDeducted = item?.Total

//             // update ewallets
//             // update wallet 
//             let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: + finalEwalletDeducted } }, {
//                 returnDocument: 'after',
//                 session
//             })

//             let afterAmount = userWallet?.EwalletBalance
//             let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;


//             // ewallet store 
//             let walletModelDataStore = {
//                 memberId: item?.memberId,
//                 transactionType: "Cr.",
//                 transactionAmount: item?.transactionAmount,
//                 beforeAmount: beforeAmount,
//                 chargeAmount: item?.chargeAmount,
//                 afterAmount: afterAmount,
//                 description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.TXNID}`,
//                 transactionStatus: "Success",
//             }

//             await walletModel.create([walletModelDataStore], opts)
//             // Commit the transaction
//             await session.commitTransaction();
//             console.log("Success Cr. trx :", item?.TXNID)
//             return true;

//         } catch (error) {
//             console.log("inside the error", error)
//             await session.abortTransaction();
//             return false
//         } finally {
//             session.endSession();
//             release()
//         }
//         // end Credit
//     } else {
//         console.log("Not Cr. and Dr. !!")
//         return false
//     }
// }

async function payOutDuplicateEntryRemove() {
    // remove duplicate entry
    let duplicate = await payOutModel.aggregate([
        {
            $group: {
                _id: {
                    trxId: "$trxId",
                    bankRRN: "$bankRRN",
                    optxId: "$optxId",
                    amount: "$amount"
                },
                count: { $sum: 1 },
                docs: { $push: "$_id" }
            }
        },
        {
            $match: { count: { $gt: 1 } }
        }
    ])

    duplicate.forEach(async (doc) => {
        doc.docs.shift();  //keep one
        console.log(doc.docs)
        await payOutModel.deleteMany({ _id: { $in: doc.docs } });
    });
    return true
}

function payoutMigrateDuplicateEntry() {
    payoutMigrateEntry.forEach(async (item, index) => {
        // if (index > 0) {
        //     return false
        // }
        await payoutMigrateDuplicateFunc(item)
    })
}

async function payoutMigrateDuplicateFunc(trxId) {
    // get old qr data 
    let oldPayout = await oldPayOutModelGenerate.findOne({ trxId: trxId })
    if (!oldPayout) {
        console.log("not found oldPayoutGen trxId :", trxId);
        return false
    } else {
        let payout = await payOutModelGenerate.findOne({ trxId: trxId, isSuccess: "Success" })
        if (!payout) {
            console.log("not Found payoutGen trxId :", trxId);
            return false;
        } else {
            if (String(oldPayout.memberId) === String(payout.memberId)) {
                // console.log("found ", payout.trxId)
                let DeleteEntry = await payOutModelGenerate.findByIdAndDelete(payout._id)
                console.log("Success Delete trxId : ", DeleteEntry?.trxId)
                return true
            } else {
                console.log("notmatch memberId both trxId :", trxId)
                return false
            }
        }
    }
}

let tempTrxIdMigrate = []
function payOutDuplicateEntryRemoveDB() {
    cron.schedule('*/20 * * * * *', async () => {
        const release = await transactionMutexMindMatrix.acquire();
        let GetData = await oldPayOutModelGenerate.find({
            trxId: { $nin: tempTrxIdMigrate }
        })
            .sort({ createdAt: -1 }).limit(15000)
        try {
            if (GetData?.length !== 0) {
                GetData.forEach(async (item, index) => {
                    tempTrxIdMigrate.push(item?.trxId)
                    // console.log(item?.trxId)
                    await payoutDuplicateEntryRemoveDBFunc(item)
                });
            } else {
                console.log("No Pending Found In Range !")
            }
        } catch (error) {
            console.error('Error during payout check:', error.message);
        } finally {
            release()
        }
    });
}

async function payoutDuplicateEntryRemoveDBFunc(oldPayoutItem) {
    let payout = await payOutModelGenerate.findOne({ trxId: oldPayoutItem?.trxId })

    if (!payout) {
        // console.log("not Found payoutGen trxId :", oldPayoutItem?.trxId);
        return false;
    } else {
        if (String(oldPayoutItem.memberId) === String(payout.memberId)) {
            console.log("found ", payout?.trxId)
            // let DeleteEntry = await payOutModelGenerate.findByIdAndDelete(payout._id)
            // console.log("Success Delete trxId : ", DeleteEntry?.trxId)
            return true
        } else {
            console.log("fount but memberId diff trxId :", oldPayoutItem?.trxId)
            return false
        }
    }


}

const payinTxnIds = [
    "seabird24131668672",
    "seabird24131668681",
    "seabird24131668652",
    "20250426211815uw67WKJBYs",
    "seabird24131594139",
    "aiipuoo347dddkk",
    "202505021606588cr3AWSZRH",
    "20250502160749V5SeX2Y2pF",
    "20250502160756REQd95TiDa",
    "20250502160751KhPy97YUKC",
    "20250502160845XV8Bi2xkpT",
    "20250502160852cIYWlJ5KtD",
    "20250502160614T57MPx5HMI",
    "20250502160909HyfhkImVu2",
    "20250502160930yfW45kmAIB",
    "20250502160932h9p9ExV2pM",
    "aiipuoo344dddkk",
    "aiipuoo1144dddkk",
    "20250502152544mtrCvuazrt",
    "202505021525588Z9gzUpXbU",
    "20250502135526sqmwCuHxIf",
    "20250502152843GNCBunPeYA",
    "20250502152927JHCnsdgVPr",
    "ZPG2505081236054871686577",
    "ZPG2505081236153284587837",
    "seabird24132843211",
    "seabird24132843243",
    "seabird16132843137",
    "seabird16132843206",
    "seabird24132843182",
    "seabird16132843071",
    "seabird24132843223",
    "seabird24132843265",
    "seabird24132843159",
    "seabird24132843268",
    "seabird24132843224",
    "seabird24132843210",
    "seabird24132843168",
    "seabird16132843273",
    "seabird24132843249",
    "seabird16132843208",
    "seabird24132843267",
    "seabird16132843201",
    "SMI250509155802360lPdXo",
    "seabird24132890364",
]

async function vaultagePayinStatusCheck() {
    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };
        let index = 0
        for (const id of payinTxnIds) {
            const isAlreadyExists = await payInModel.findOne({ trxId: id })
            console.log(++index);
            if (isAlreadyExists) {
                console.log("Already exists trxId:", id);
                continue;
            }
            const callbackData = await Log.findOne({ "requestBody.Data.ApiUserReferenceId": id }).lean()
            if (!callbackData) {
                console.log("No callback data found for trxId:", id);
                continue;
            }
            const requestBody = callbackData.requestBody;
            try {
                const { data } = await axios.post("http://localhost:5000/apiAdmin/v1/payin/vaultageCallBack", requestBody)
                console.log(" scheduleTask.js:1964 ~ vaultagePayinStatusCheck ~ data:", data);
            } catch (error) {
                console.log("Error parsing requestBody:", error);
                continue;

            }
        }

        await session.commitTransaction();
    } catch (error) {
        console.log(" scheduleTask.js:1961 ~ vaultagePayinStatusCheck ~ error:", error);
        await session.abortTransaction();
    } finally {
        session.endSession();
        release()
    }
}

let vaultageTrxids = []
async function vaultagePendingsPayout() {
    try {
        setInterval(async () => {
            const pendingTransactions = await payOutModelGenerate.find({
                isSuccess: "Pending",
                pannelUse: "vaultagePayoutApi",
                trxId: { $nin: vaultageTrxids },
            }).limit(1);
            if (pendingTransactions.length === 0) {
                console.log("No pending transactions found");
                return;
            }
            const transaction = pendingTransactions[0];
            vaultageTrxids.push(transaction.trxId);
            console.log("Processing transaction:", transaction.trxId);
            const trxId = transaction.trxId
            await clearPayoutPending(trxId);
        }, 10 * 1000);

    } catch (error) {
        console.log("🚀 ~ :2037 ~ vaultagePendingsPayout ~ error:", error);
    }
}

async function clearPayoutPending(trxId) {
    const release = await transactionMutex.acquire();
    try {
        const isAlreadyProcessed = await payOutSuccessModel.findOne({ trxId: trxId });
        if (isAlreadyProcessed) {
            console.log(" scheduleTask.js:694 ~ clearPayoutPending ~ isAlreadyProcessed:", isAlreadyProcessed);
            return;
        }
        const payload = {
            payout_id: trxId,
            AuthKey: process.env.VAULTAGE_AUTH_KEY,
        }
        const { data: vaultageData } = await axios.post("https://pending.zanithpay.com/pending/voltagePending", payload);
        const data = vaultageData.data;
        console.log(" scheduleTask.js:710 ~ clearPayoutPending ~ data:", data, trxId);
        if (data.data?.status === "PENDING") {
            console.log(" scheduleTask.js:712 ~ clearPayoutPending ~ data.data.status:", data.data?.status);
            return;
        }
        let callbackPayload = {
            event: "Payout",
            Data: {
                RRN: data?.data?.rrn,
                Status: data?.data?.status,
                StatusCode: data?.data?.statusCode,
                Message: data?.data?.Message,
                ApiWalletTransactionId: data?.data?.apiWalletTransactionId,
                APITransactionId: data?.data?.apiTransactionId,
                mode: "manual"
            }
        }
        if (data.data === null) {
            console.log(" scheduleTask.js:721 ~ clearPayoutPending ~ data.data:", trxId);
            callbackPayload.Data.Status = "FAILED"
            callbackPayload.Data.StatusCode = 400
            callbackPayload.Data.APITransactionId = trxId
            callbackPayload.Data.Message = "Transaction not found"
        }
        console.log("callbackPayload", callbackPayload)
        const { data: callbackResp } = await axios.post("http://localhost:5000/apiAdmin/v1/payin/vaultageCallBack", callbackPayload)

        console.log(" scheduleTask.js:725 ~ clearPayoutPending ~ callbackResp:", callbackResp);
    } catch (error) {
        console.log(" scheduleTask.js:685 ~ clearPayoutPending ~ error:", error);
    } finally {
        release()
    }
}

export default function scheduleTask() {
    // FailedToSuccessPayout()
    // scheduleWayuPayOutCheckSecond()
    // scheduleWayuPayOutCheckMindMatrix()
    // logsClearFunc()
    // migrateDataPayin()
    // migrateDataPayOut()
    // payinScheduleTask()
    // payoutTaskScript()
    // payoutDeductPackageTaskScript()
    // payinScheduleTask2()
    // scheduleFlipzikImpactPeek()
    // EwalletManuplation()
    // payOutDuplicateEntryRemove()
    // payoutMigrateDuplicateEntry()
    // payOutDuplicateEntryRemoveDB()
    // vaultagePayinStatusCheck()
    // vaultagePendingsPayout()
}