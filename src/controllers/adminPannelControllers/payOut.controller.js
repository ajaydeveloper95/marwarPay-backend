import axios from "axios";
import payOutModelGenerate from "../../models/payOutGenerate.model.js";
import oldPayOutModelGenerate from "../../models/oldPayOutGenerate.model.js";
import payOutModel from "../../models/payOutSuccess.model.js";
import walletModel from "../../models/Ewallet.model.js";
import callBackResponse from "../../models/callBackResponse.model.js";
import userDB from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AESUtils } from "../../utils/CryptoEnc.js";
import { Mutex } from "async-mutex";
// import { ApiError } from "../../utils/ApiError.js";
// import { getPaginationArray } from "../../utils/helpers.js";
import mongoose from "mongoose";
import { Parser } from "json2csv";
import crypto from "crypto";
import BeneficiaryModel from "../../models/beneficiary.model.js";
import Log from "../../models/Logs.model.js";
import { genAplhaNumTrxIdUnique, genNumericTrxIdUnique } from "../../utils/TrxAutoGenerater.js";
import { eWalletCrJobs } from "../../jobs/eWallet.jobs.js";


const genPayoutMutex = new Mutex();
const iSmartMutex = new Mutex();
const flipzikMutex = new Mutex();
const proconceptMutex = new Mutex();

export const allPayOutPayment = asyncHandler(async (req, res) => {
    try {
        let { page = 1, limit = 25, keyword = "", startDate, endDate, memberId, status, export: exportToCSV } = req.query;

        page = Number(page) || 1;
        limit = Number(limit) || 25;
        const skip = (page - 1) * limit;

        const trimmedKeyword = keyword.trim();
        const trimmedStatus = status ? status.trim() : "";
        const trimmedMemberId = memberId && mongoose.Types.ObjectId.isValid(String(memberId))
            ? new mongoose.Types.ObjectId(String(memberId.trim()))
            : null;

        // Date filter
        let dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            endDate = new Date(endDate);
            endDate.setHours(23, 59, 59, 999);
            dateFilter.$lt = endDate;
        }

        // Match filters
        let matchFilters = {
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(trimmedKeyword && {
                $or: [
                    { trxId: { $regex: trimmedKeyword, $options: "i" } },
                    { accountHolderName: { $regex: trimmedKeyword, $options: "i" } }
                ]
            }),
            ...(trimmedStatus && { isSuccess: { $regex: trimmedStatus, $options: "i" } }),
            ...(trimmedMemberId && { memberId: trimmedMemberId })
        };

        // Get total count of matching documents
        const totalDocs = await payOutModelGenerate.countDocuments(matchFilters);
        const totalDocsOld = await oldPayOutModelGenerate.countDocuments(matchFilters);
        const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

        // Aggregation Pipeline
        const pipeline = [
            { $match: matchFilters },
            { $sort: { createdAt: sortDirection } },

            ...(exportToCSV !== "true" ? [{ $skip: skip }, { $limit: limit }] : []),

            {
                $lookup: {
                    from: "users",
                    localField: "memberId",
                    foreignField: "_id",
                    as: "userInfo",
                    pipeline: [{ $project: { userName: 1, fullName: 1, memberId: 1 } }]
                }
            },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "payoutrecodes",
                    localField: "trxId",
                    foreignField: "trxId",
                    as: "payoutSuccessData",
                    pipeline: [{ $project: { chargeAmount: 1, finalAmount: 1 } }]
                }
            },
            { $unwind: { path: "$payoutSuccessData", preserveNullAndEmptyArrays: true } },

            ...(exportToCSV === "true"
                ? [{
                    $addFields: {
                        createdAt: {
                            $dateToString: {
                                format: "%Y-%m-%d %H:%M:%S",
                                date: { $add: ["$createdAt", 0] },
                                timezone: "Asia/Kolkata"
                            }
                        }
                    }
                }]
                : []),

            {
                $project: {
                    _id: 1,
                    trxId: 1,
                    systemTrxId: 1,
                    accountHolderName: 1,
                    optxId: 1,
                    accountNumber: 1,
                    ifscCode: 1,
                    amount: 1,
                    isSuccess: 1,
                    pannelUse: 1,  // Ensure this field is correctly fetched
                    "payoutSuccessData.chargeAmount": 1,
                    "payoutSuccessData.finalAmount": 1,
                    createdAt: 1,
                    status: 1,
                    "userInfo.userName": 1,
                    "userInfo.fullName": 1,
                    "userInfo.memberId": 1
                }
            }
        ];

        // Execute aggregation query
        const payment = await payOutModelGenerate.aggregate(pipeline).allowDiskUse(true);

        let finalResult = payment;
        if (payment.length < limit || exportToCSV === "true") {

            // limit 
            let remainingLimit = limit - payment.length
            let oldSkip = skip - totalDocs

            if (oldSkip < 0) {
                oldSkip = 0
            }


            // handle aggragration
            const pipeline2 = [
                { $match: matchFilters },
                { $sort: { createdAt: sortDirection } },

                ...(exportToCSV !== "true" ? [{ $skip: oldSkip }, { $limit: remainingLimit }] : []),

                {
                    $lookup: {
                        from: "users",
                        localField: "memberId",
                        foreignField: "_id",
                        as: "userInfo",
                        pipeline: [{ $project: { userName: 1, fullName: 1, memberId: 1 } }]
                    }
                },
                { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },

                {
                    $lookup: {
                        from: "payoutrecodes",
                        localField: "trxId",
                        foreignField: "trxId",
                        as: "payoutSuccessData",
                        pipeline: [{ $project: { chargeAmount: 1, finalAmount: 1 } }]
                    }
                },
                { $unwind: { path: "$payoutSuccessData", preserveNullAndEmptyArrays: true } },

                ...(exportToCSV === "true"
                    ? [{
                        $addFields: {
                            createdAt: {
                                $dateToString: {
                                    format: "%Y-%m-%d %H:%M:%S",
                                    date: { $add: ["$createdAt", 0] },
                                    timezone: "Asia/Kolkata"
                                }
                            }
                        }
                    }]
                    : []),

                {
                    $project: {
                        _id: 1,
                        trxId: 1,
                        systemTrxId: 1,
                        accountHolderName: 1,
                        optxId: 1,
                        accountNumber: 1,
                        ifscCode: 1,
                        amount: 1,
                        isSuccess: 1,
                        pannelUse: 1,  // Ensure this field is correctly fetched
                        "payoutSuccessData.chargeAmount": 1,
                        "payoutSuccessData.finalAmount": 1,
                        createdAt: 1,
                        status: 1,
                        "userInfo.userName": 1,
                        "userInfo.fullName": 1,
                        "userInfo.memberId": 1
                    }
                }
            ];

            // Execute aggregation query
            const paymentOld = await oldPayOutModelGenerate.aggregate(pipeline2).allowDiskUse(true);

            // connect new data and old data
            // finalResult = [...payment, ...paymentOld]
            finalResult = finalResult.concat(paymentOld)
        }

        if (!finalResult || finalResult.length === 0) {
            return res.status(400).json({ message: "Failed", data: "No Transaction Available!" });
        }

        // Handle CSV Export
        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "trxId",
                "systemTrxId",
                "accountHolderName",
                "optxId",
                "accountNumber",
                "ifscCode",
                "amount",
                "isSuccess",
                "pannelUse",  // Ensure it's included in the CSV export
                { value: "payoutSuccessData.chargeAmount", label: "Charge Amount" },
                { value: "payoutSuccessData.finalAmount", label: "Final Amount" },
                "createdAt",
                "status",
                { value: "userInfo.userName", label: "User Name" },
                { value: "userInfo.fullName", label: "Full Name" },
                { value: "userInfo.memberId", label: "Member ID" }
            ];

            const json2csvParser = new Parser({ fields });
            // const csv = json2csvParser.parse(payment);
            const csv = json2csvParser.parse(finalResult);

            res.header('Content-Type', 'text/csv');
            res.attachment(`payoutPayments-${startDate || 'all'}-${endDate || 'all'}.csv`);

            return res.status(200).send(csv);
        }

        let TotalDocsBoth = totalDocsOld + totalDocs

        // API response
        return res.status(200).json(new ApiResponse(200, finalResult, TotalDocsBoth));

    } catch (err) {
        res.status(500).json({ message: "Failed", data: `Internal Server Error: ${err.message}` });
    }
});

export const updatePayoutStatus = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { trxId, bankRRN, optxId, memberId, status } = req.body;

        // Validate required fields
        if (!trxId || !memberId || !status) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "trxId, memberId, and status are required" });
        }

        // Fetch user details
        const user = await userDB.findOne({ memberId, isActive: true })
            .select("userName memberId EwalletBalance minWalletBalance")
            .session(session);

        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(401).json({ message: "Failed", data: "Invalid Credentials or User Inactive!" });
        }

        const isPending = await payOutModelGenerate.findOne({ trxId, isSuccess: "Pending" }).session(session);

        if (!isPending) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Failed", data: "Payout already updated" });
        }

        // Update payout status in payOutGen
        const payOutGen = await payOutModelGenerate.findOneAndUpdate(
            { trxId: trxId },
            { $set: { isSuccess: status.toLowerCase() === "failed" ? "Failed" : "Success" } },
            { new: true, session }
        );

        if (!payOutGen) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Payout record not found" });
        }

        const { EwalletBalance } = user;

        if (status.toLowerCase() === "failed") {
            // Reverse the wallet balance
            const updatedUserWallet = await userDB.findByIdAndUpdate(
                user._id,
                { $inc: { EwalletBalance: +Number(payOutGen.afterChargeAmount) } },
                { new: true, session }
            );

            if (!updatedUserWallet) {
                await session.abortTransaction();
                session.endSession();
                return res.status(500).json({ message: "Failed", data: "Wallet update failed" });
            }

            // Log wallet transaction
            const walletModelDataStore = {
                memberId: user._id,
                transactionType: "Cr.",
                transactionAmount: payOutGen.amount,
                beforeAmount: updatedUserWallet.EwalletBalance - payOutGen.afterChargeAmount,
                chargeAmount: payOutGen.gatwayCharge || 0,
                afterAmount: updatedUserWallet.EwalletBalance,
                description: `Successfully credited amount: ${Number(payOutGen.afterChargeAmount)} with transaction Id: ${trxId}`,
                transactionStatus: "Success",
            };

            await walletModel.create([walletModelDataStore], { session });

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();


            const callBackBody = {
                optxid: optxId,
                status: "FAILED",
                txnid: trxId,
                amount: payOutGen.amount,
                rrn: "",
            };
            try {
                await customCallBackPayoutUser(user._id, callBackBody)
            } catch (error) {
                null
            }
            return res.status(200).json({ message: "Success", data: "Status updated successfully" });
        }
        else if (status.toLowerCase() === "success") {
            if (!bankRRN) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "bank rrn is required" });
            }

            // Store payout data
            const payoutDataStore = {
                memberId: user._id,
                amount: payOutGen.amount,
                chargeAmount: payOutGen.gatwayCharge || 0,
                finalAmount: payOutGen.afterChargeAmount,
                bankRRN: bankRRN,
                trxId: trxId,
                systemTrxId: payOutGen?.systemTrxId,
                optxId: optxId,
                isSuccess: "Success"
            };

            const callBackBody = {
                optxid: optxId,
                status: "SUCCESS",
                txnid: trxId,
                amount: payOutGen.amount,
                rrn: bankRRN,
            };

            await Promise.all([
                payOutModel.create([payoutDataStore], { session }),
                await customCallBackPayoutUser(user?._id, callBackBody)
            ]);

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({ message: "Success", data: "Payout processed successfully" });
        }

        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Invalid status" });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Failed", data: "Status update failed", error: error.message });
    }
});

function generateSignature(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', process.env.FLIPZIK_SECRET_KEY);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

function generateSignatureFlipImpact(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', process.env.IMPACTPEEK_FLIPZIK_SECRET_KEY);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

function generateSignatureFlipMindmatrix(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', process.env.MINDMATRIX_FLIPZIK_SECRET_KEY);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

function generateSignatureFlipSilverZen(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', process.env.SILVERZEN_FLIPZIK_SECRET_KEY);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

export const allPayOutPaymentSuccess = asyncHandler(async (req, res) => {
    let { page = 1, limit = 25, keyword = "", startDate, endDate } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;

    let dateFilter = {};
    if (startDate) {
        dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999); // Modify endDate in place
        dateFilter.$lt = new Date(endDate); // Wrap in new Date() to maintain proper format
    }

    const pipeline = [
        {
            $match: {
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                ...(trimmedKeyword && {
                    $or: [
                        { trxId: { $regex: trimmedKeyword, $options: "i" } },
                        { accountHolderName: { $regex: trimmedKeyword, $options: "i" } },
                        { "userInfo.userName": { $regex: trimmedKeyword, $options: "i" } },
                        { "userInfo.fullName": { $regex: trimmedKeyword, $options: "i" } },
                    ],
                }),
            },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "memberId",
                foreignField: "_id",
                pipeline: [
                    { $project: { userName: 1, fullName: 1, memberId: 1 } },
                ],
                as: "userInfo",
            },
        },
        {
            $unwind: {
                path: "$userInfo",
                preserveNullAndEmptyArrays: true,
            },
        },
        ...(exportToCSV == "true"
            ? [{
                $addFields: {
                    createdAt: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M:%S",
                            date: {
                                $add: ["$createdAt", 0] // Convert UTC to IST
                            },
                            timezone: "Asia/Kolkata"
                        }
                    }
                }
            }] : []),
        {
            $project: {
                "_id": 1,
                "trxId": 1,
                "systemTrxId": 1,
                "accountHolderName": 1,
                "optxId": 1,
                "accountNumber": 1,
                "ifscCode": 1,
                "amount": 1,
                "chargeAmount": 1,
                "finalAmount": 1,
                "bankRRN": 1,
                "isSuccess": 1,
                "createdAt": 1,
                "userInfo.userName": 1,
                "userInfo.fullName": 1,
                "userInfo.memberId": 1,
            },
        },
    ];

    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    try {
        const GetData = await payOutModel.aggregate(pipeline, aggregationOptions).allowDiskUse(true);

        if (!GetData || GetData.length === 0) {
            return res.status(400).json({ message: "Failed", data: "No Successful Transactions Available!" });
        }

        res.status(200).json(new ApiResponse(200, GetData));
    } catch (err) {
        res.status(500).json({ message: "Failed", data: `Internal Server Error: ${err.message}` });
    }
});

export const generatePayOut = asyncHandler(async (req, res) => {
    // const release = await genPayoutMutex.acquire();
    const {
        userName, authToken, mobileNumber, accountHolderName, accountNumber,
        ifscCode, trxId, amount, bankName
    } = req.body;

    try {
        if (amount < 1) {
            return res.status(400).json({ message: "Failed", data: `Amount must be 1 or more: ${amount}` });
        }

        const [user] = await userDB.aggregate([
            {
                $match: {
                    $and: [{ userName }, { trxAuthToken: authToken }, { isActive: true }]
                }
            },
            { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } },
            { $unwind: "$payOutApi" },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: "$package" },
            { $lookup: { from: "payoutpackages", localField: "package.packagePayOutCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: "$packageCharge" },
            { $project: { "userName": 1, "memberId": 1, "EwalletBalance": 1, "EwalletFundLock": 1, "minWalletBalance": 1, "payOutApi": 1, "packageCharge": 1 } }
        ]);

        if (!user) {
            return res.status(401).json({ message: "Failed", data: "Invalid Credentials or User Inactive!" });
        }

        const { payOutApi, packageCharge, EwalletBalance, minWalletBalance, EwalletFundLock } = user;

        if (payOutApi?.apiName === "ServerMaintenance") {
            return res.status(400).json({ message: "Failed", data: { status_msg: "Server Under Maintenance!", status: 400, trxID: trxId } });
        }

        if (payOutApi?.trxIdType === undefined || payOutApi?.trxIdType === null) {
            return res.status(400).json({ message: "Failed", data: { status_msg: "Connect Admin ! Account not Config Properly !", status: 400, trxID: trxId } });
        }

        const chargeDetails = packageCharge.payOutChargeRange.find(value => value.lowerLimit <= amount && value.upperLimit > amount);
        if (!chargeDetails) {
            return res.status(400).json({ message: "Failed", data: "Invalid package!" });
        }

        const chargeAmount = chargeDetails.chargeType === "Flat" ? chargeDetails.charge : (chargeDetails.charge / 100) * amount;
        const finalAmountDeduct = amount + chargeAmount;
        const usableBalance = EwalletBalance - minWalletBalance;

        if (finalAmountDeduct > EwalletBalance || finalAmountDeduct > usableBalance) {
            return res.status(400).json({ message: "Failed", data: `Insufficient funds. Usable: ${usableBalance}` });
        }

        if (EwalletFundLock < finalAmountDeduct) {
            return res.status(400).json({ message: "Failed", data: `Total Limit Consume ! Available limit : ${EwalletFundLock}` })
        }

        const systemGenTrxId = payOutApi?.trxIdType === "AlphaNum" ? genAplhaNumTrxIdUnique() : genNumericTrxIdUnique()

        const payOutModelGen = await payOutModelGenerate.create({
            memberId: user._id, mobileNumber, accountHolderName, accountNumber, ifscCode,
            amount, gatwayCharge: chargeAmount, afterChargeAmount: finalAmountDeduct, trxId, systemTrxId: systemGenTrxId, pannelUse: payOutApi?.apiName
        });

        const release = await genPayoutMutex.acquire();
        // db locking with deducted amount 
        const walletDucdsession = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        // wallet deducted and store ewallet trx
        try {
            walletDucdsession.startTransaction(transactionOptions);
            const opts = { walletDucdsession };

            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: - finalAmountDeduct, EwalletFundLock: - finalAmountDeduct } }, {
                returnDocument: 'after',
                walletDucdsession
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance + finalAmountDeduct;

            // ewallet store 
            let walletModelDataStore = {
                memberId: user?._id,
                transactionType: "Dr.",
                transactionAmount: amount,
                beforeAmount: beforeAmount,
                chargeAmount: chargeAmount,
                afterAmount: afterAmount,
                description: `Successfully Dr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await walletDucdsession.commitTransaction();
            // console.log('Transaction committed successfully');
        } catch (error) {
            // console.log(error)
            await walletDucdsession.abortTransaction();
            // failed and return the response
            payOutModelGen.isSuccess = "Failed";
            await payOutModelGen.save();
            let respSend = {
                statusCode: "400",
                txnID: trxId
            }

            return res.status(400).json({ message: "Failed", data: respSend });
        }
        finally {
            walletDucdsession.endSession();
            release()
        }
        // db locking end

        const HeaderObj = {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            epoch: String(Date.now())
        }
        const BodyObj = {
            beneName: accountHolderName,
            beneAccountNo: accountNumber,
            beneifsc: ifscCode,
            benePhoneNo: mobileNumber,
            clientReferenceNo: trxId,
            amount,
            fundTransferType: "IMPS",
            latlong: "22.8031731,88.7874172",
            pincode: 302012,
            custName: accountHolderName,
            custMobNo: mobileNumber,
            custIpAddress: "110.235.219.55",
            beneBankName: bankName
        }


        const requestData = JSON.stringify({
            "address": "JAIPUR VASALI SECTOR-12",
            "payment_type": 3,
            "amount": amount * 100,
            "name": accountHolderName,
            "email": "abc@gmail.com",
            "mobile_number": mobileNumber,
            "account_number": accountNumber,
            "ifsc_code": ifscCode,
            "merchant_order_id": systemGenTrxId
        });
        const timestamp = Date.now().toString();
        const path = "/api/v1/payout/process";
        const signature = generateSignature(timestamp, requestData, path, '', 'POST');
        const signatureFlipImpact = generateSignatureFlipImpact(timestamp, requestData, path, '', 'POST');
        const signatureFlipMindmatrix = generateSignatureFlipMindmatrix(timestamp, requestData, path, '', 'POST');
        const signatureFlipSilverZen = generateSignatureFlipSilverZen(timestamp, requestData, path, '', 'POST');

        const headerSecrets = await AESUtils.EncryptRequest(HeaderObj, process.env.ENC_KEY)
        const BodyRequestEnc = await AESUtils.EncryptRequest(BodyObj, process.env.ENC_KEY)

        const apiConfig = {
            iServerEuApi: {
                url: payOutApi.apiURL,
                headers: {
                    'header_secrets': headerSecrets,
                    'pass_key': process.env.PASS_KEY,
                    'Content-Type': 'application/json'
                },
                data: {
                    RequestData: BodyRequestEnc
                },
                res: async (apiResponse) => {
                    try {
                        if (apiResponse === "Ip validation Failed") {
                            // console.log("api failed")
                            const release = await genPayoutMutex.acquire();
                            // db locking with added amount 
                            const walletAddsession = await userDB.startSession();
                            const transactionOptions = {
                                readConcern: { level: 'local' },
                                writeConcern: { w: 'majority' },
                                maxTimeMS: 1500
                            };
                            // wallet deducted and store ewallet trx
                            try {
                                walletAddsession.startTransaction(transactionOptions);
                                const opts = { walletAddsession };

                                // update wallet 
                                let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                    returnDocument: 'after',
                                    walletAddsession
                                })

                                let afterAmount = userWallet?.EwalletBalance
                                let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                                // ewallet store 
                                let walletModelDataStore = {
                                    memberId: user?._id,
                                    transactionType: "Cr.",
                                    transactionAmount: amount,
                                    beforeAmount: beforeAmount,
                                    chargeAmount: chargeAmount,
                                    afterAmount: afterAmount,
                                    description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                    transactionStatus: "Success",
                                }

                                await walletModel.create([walletModelDataStore], opts)
                                // Commit the transaction
                                await walletAddsession.commitTransaction();
                                // console.log('Transaction committed successfully');
                            } catch (error) {
                                // console.log(error)
                                await walletAddsession.abortTransaction();
                                // console.error('Transaction aborted due to error:', error);
                            }
                            finally {
                                walletAddsession.endSession();
                                release()
                            }
                            payOutModelGen.isSuccess = "Failed";
                            await payOutModelGen.save();
                            let faliedResp = {
                                statusCode: "400",
                                txnID: trxId
                            }
                            return { message: "Failed", data: faliedResp }
                        }

                        let bankServerResp = apiResponse?.ResponseData
                        let BodyResponceDec = await AESUtils.decryptRequest(bankServerResp, process.env.ENC_KEY);
                        let BankJsonConvt = await JSON.parse(BodyResponceDec);

                        // if Success  
                        // console.log("Success", bankServerResp?.subStatus, BankJsonConvt, "bank su status end")
                        if (BankJsonConvt?.subStatus === 0) {
                            // console.log("Inside the Bank substatus 0 or Ssccess", BankJsonConvt.subStatus, typeof BankJsonConvt?.subStatus)
                            // on Success
                            let payoutDataStore = {
                                memberId: user?._id,
                                amount: amount,
                                chargeAmount: chargeAmount,
                                finalAmount: finalAmountDeduct,
                                bankRRN: BankJsonConvt?.rrn,
                                trxId: trxId,
                                optxId: BankJsonConvt?.transactionId,
                                isSuccess: "Success"
                            }
                            await payOutModel.create(payoutDataStore);
                            payOutModelGen.isSuccess = "Success"
                            await payOutModelGen.save()

                            let userRespPayOut = {
                                statusCode: 1,
                                status: 1,
                                trxId: BankJsonConvt?.clientReferenceNo,
                                opt_msg: BankJsonConvt?.statusDesc
                            }

                            // console.log(userRespPayOut, "user resp send", userRespPayOut)
                            payoutCallBackResponse({ body: userRespPayOut })

                            return new ApiResponse(200, userRespPayOut)
                        } else {
                            // console.log("insdie the subStatus = -1-2,2 ", bankServerResp)

                            const release = await genPayoutMutex.acquire();
                            const walletAddsession = await userDB.startSession();
                            const transactionOptions = {
                                readConcern: { level: 'linearizable' },
                                writeConcern: { w: 1 },
                                readPreference: { mode: 'primary' },
                                maxTimeMS: 1500
                            };
                            try {
                                walletAddsession.startTransaction(transactionOptions);
                                const opts = { walletAddsession };

                                // Perform the update within the transaction
                                let userWallet = await userDB.findById(user?._id, "_id EwalletBalance", opts)
                                let beforeAmount = userWallet?.EwalletBalance;

                                userWallet.EwalletBalance += finalAmountDeduct;
                                await userWallet.save(opts)

                                // ewallet store 
                                let walletModelDataStore = {
                                    memberId: user?._id,
                                    transactionType: "Cr.",
                                    transactionAmount: amount,
                                    beforeAmount: beforeAmount,
                                    chargeAmount: chargeAmount,
                                    afterAmount: beforeAmount + finalAmountDeduct,
                                    description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                    transactionStatus: "Success",
                                }

                                await walletModel.create([walletModelDataStore], opts)
                                // Commit the transaction
                                await walletAddsession.commitTransaction();
                                // console.log('Transaction committed successfully');
                            } catch (error) {
                                // console.log(error)
                                await walletAddsession.abortTransaction();
                                // console.error('Transaction aborted due to error:', error);
                            }
                            finally {
                                walletAddsession.endSession();
                                release()
                            }
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()

                            let respSend = {
                                statusCode: BankJsonConvt?.subStatus,
                                status: BankJsonConvt?.subStatus,
                                trxId: BankJsonConvt?.clientReferenceNo,
                                opt_msg: BankJsonConvt?.statusDesc
                            }
                            return { message: "Failed", data: respSend }
                        }
                        // console.log("Final console", BankJsonConvt)
                    } catch (error) {
                        // console.log("server error section in error section")
                        // console.log(error)
                        payOutModelGen.isSuccess = "Failed";
                        await payOutModelGen.save();
                        let respSend = {
                            statusCode: "400",
                            txnID: trxId
                        }
                        return { message: "Failed", data: respSend }

                    }

                }
            },
            ImpactPeekSoftwareApi: {
                url: payOutApi.apiURL,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: {
                    txnID: trxId, amount, ifsc: ifscCode, account_no: accountNumber,
                    account_holder_name: accountHolderName, mobile: mobileNumber, response_type: 1
                },
                res: async (apiResponse) => {
                    const { status_code, status_msg, status, txn_amount, txnid, rrn, orderID, opt_msg } = apiResponse;

                    if (status === "SUCCESS") {
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: txn_amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: rrn,
                            trxId: txnid,
                            optxId: orderID,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let callBackBody = {
                            optxid: orderID,
                            status: "SUCCESS",
                            txnid: txnid,
                            amount: txn_amount,
                            rrn: rrn,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: status_code,
                            status: status === "SUCCESS" ? 1 : 2,
                            trxId: trxId || 0,
                            opt_msg: opt_msg || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    } else {
                        let userREspSend = {
                            statusCode: status_code,
                            status: status !== "FAILED" ? 2 : -2,
                            trxId: trxId || 0,
                            opt_msg: opt_msg || "Payout initiated, awaiting response from banking side."
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                }
            },
            waayupayPayOutApi: {
                url: payOutApi.apiURL,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': "application/json",
                    'mid': process.env.ISMART_PAY_MID,
                    'key': process.env.ISMART_PAY_ID
                },
                data: {
                    clientId: process.env.WAAYU_CLIENT_ID,
                    secretKey: process.env.WAAYU_SECRET_KEY,
                    number: String(mobileNumber),
                    amount: amount.toString(),
                    transferMode: "IMPS",
                    accountNo: accountNumber,
                    ifscCode,
                    beneficiaryName: accountHolderName,
                    vpa: "ajaybudaniya1@ybl",
                    clientOrderId: trxId
                },
                res: async (apiResponse) => {
                    const { statusCode, status, message, orderId, utr, clientOrderId } = apiResponse;

                    if (status == 1) {
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: utr,
                            trxId: trxId,
                            optxId: orderId,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let callBackBody = {
                            optxid: orderId,
                            status: "SUCCESS",
                            txnid: clientOrderId,
                            amount: amount,
                            rrn: utr,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    } else {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // wallet deducted and store ewallet trx
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            // console.log(error)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        payOutModelGen.isSuccess = "Failed"
                        await await payOutModelGen.save()
                        let userREspSend2 = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return { message: "Failed", data: userREspSend2 }
                    }
                }
            },
            waayupayPayOutApiSecond: {
                url: payOutApi.apiURL,
                headers: { 'Content-Type': 'application/json', 'Accept': "application/json" },
                data: {
                    clientId: process.env.WAAYU_CLIENT_ID_TWO,
                    secretKey: process.env.WAAYU_SECRET_KEY_TWO,
                    number: String(mobileNumber),
                    amount: amount.toString(),
                    transferMode: "IMPS",
                    accountNo: accountNumber,
                    ifscCode,
                    beneficiaryName: accountHolderName,
                    vpa: "ajaybudaniya1@ybl",
                    clientOrderId: trxId
                },
                res: async (apiResponse) => {
                    const { statusCode, status, message, orderId, utr, clientOrderId } = apiResponse;

                    if (status == 1) {
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: utr,
                            trxId: trxId,
                            optxId: orderId,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let callBackBody = {
                            optxid: orderId,
                            status: "SUCCESS",
                            txnid: clientOrderId,
                            amount: amount,
                            rrn: utr,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                    else if (status == 0 || statusCode == 0) {
                        const release = await genPayoutMutex.acquire();
                        // db locking with added amount 
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // wallet added and store ewallet trx
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // Perform the update within the transaction
                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            // console.log(error)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        payOutModelGen.isSuccess = "Failed"
                        await await payOutModelGen.save()
                        let userREspSend2 = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return { message: "Failed", data: userREspSend2 }
                    }
                    else {
                        // let callBackBody = {
                        //     optxid: orderId || "",
                        //     status: "Pending",
                        //     txnid: clientOrderId || "",
                        //     amount: amount,
                        //     rrn: utr || "",
                        // }
                        // customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "Payout initiated, awaiting response from banking side."
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                }
            },
            waayupayPayOutApiMindMatrix: {
                url: payOutApi.apiURL,
                headers: { 'Content-Type': 'application/json', 'Accept': "application/json" },
                data: {
                    clientId: process.env.WAAYU_CLIENT_ID_MINDMATRIX,
                    secretKey: process.env.WAAYU_SECRET_KEY_MINDMATRIX,
                    number: String(mobileNumber),
                    amount: amount.toString(),
                    transferMode: "IMPS",
                    accountNo: accountNumber,
                    ifscCode,
                    beneficiaryName: accountHolderName,
                    vpa: "ajaybudaniya1@ybl",
                    clientOrderId: trxId
                },
                res: async (apiResponse) => {
                    const { statusCode, status, message, orderId, utr, clientOrderId } = apiResponse;

                    if (status == 1) {
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: utr,
                            trxId: trxId,
                            optxId: orderId,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let callBackBody = {
                            optxid: orderId,
                            status: "SUCCESS",
                            txnid: clientOrderId,
                            amount: amount,
                            rrn: utr,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                    else if (status == 0 || statusCode == 0) {
                        const release = await genPayoutMutex.acquire();
                        // db locking with added amount 
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // wallet added and store ewallet trx
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // Perform the update within the transaction
                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            // console.log(error)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        payOutModelGen.isSuccess = "Failed"
                        await await payOutModelGen.save()
                        let userREspSend2 = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return { message: "Failed", data: userREspSend2 }
                    }
                    else {
                        // let callBackBody = {
                        //     optxid: orderId || "",
                        //     status: "Pending",
                        //     txnid: clientOrderId || "",
                        //     amount: amount,
                        //     rrn: utr || "",
                        // }
                        // customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: statusCode || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "Payout initiated, awaiting response from banking side."
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                }
            },
            iSmartPayPayoutApi: {
                url: payOutApi?.apiURL,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': "application/json",
                    'mid': process.env.ISMART_PAY_MID,
                    'key': process.env.ISMART_PAY_ID
                },
                data: {
                    amount,
                    "currency": "INR",
                    "purpose": "refund",
                    "order_id": trxId,
                    "narration": "Fund Transfer",
                    "phone_number": String(mobileNumber),
                    "payment_details": {
                        "type": "NB",
                        "account_number": accountNumber,
                        "ifsc_code": ifscCode,
                        "beneficiary_name": accountHolderName,
                        "mode": "IMPS"
                    }
                },
                res: async (apiResponse) => {
                    const { status, status_code, message, transaction_id, amount, bank_id, order_id, purpose, narration, currency, wallet_id, wallet_name, created_on } = apiResponse;

                    if (status && status_code == "CREATED") {
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: bank_id,
                            trxId: order_id,
                            optxId: transaction_id,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()

                        let callBackBody = {
                            optxid: transaction_id,
                            status: "SUCCESS",
                            txnid: order_id,
                            amount: amount,
                            rrn: bank_id,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)


                        let userREspSend = {
                            statusCode: status_code || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    } else {
                        const release = await genPayoutMutex.acquire();
                        // db locking with added amount 
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            // console.log(error)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        payOutModelGen.isSuccess = "Failed"
                        await await payOutModelGen.save()
                        let userREspSend2 = {
                            statusCode: status_code || 0,
                            status: status || 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return { message: "Failed", data: userREspSend2 }
                    }

                }
            },
            flipzikPayoutApi: {
                url: payOutApi.apiURL,
                headers: {
                    "access_key": process.env.FLIPZIK_ACCESS_KEY,
                    "signature": signature,
                    "X-Timestamp": timestamp,
                    "Content-Type": "application/json"
                },
                data: requestData,
                res: async (apiResponse) => {
                    const { data, success } = apiResponse;
                    if (!success) {
                        return { message: "Failed", data: `Bank server is down.` }
                    }

                    if (data.status === "Success" && data.master_status === "Success") {
                        // If successful, store the payout data
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: data?.bank_reference_id,
                            trxId: data?.merchant_order_id,
                            optxId: data?.id,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()

                        // Call back to notify the user
                        let callBackBody = {
                            optxid: String(data?.id),
                            status: "SUCCESS",
                            txnid: data?.merchant_order_id,
                            amount: String(amount),
                            rrn: data?.bank_reference_id,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userRespSend = {
                            statusCode: data?.status === "Success" ? 1 : 2 || 0,
                            status: data?.status === "Success" ? 1 : 2 || 0,
                            trxId: data?.merchant_order_id || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend)
                    } else if (data?.master_status === "Failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        let userRespSend2 = {
                            statusCode: data?.status === "Failed" ? 0 : 2 || 0,
                            status: data?.status === "Failed" ? 0 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    } else {
                        let userRespSend2 = {
                            statusCode: data?.status === "Pending" ? 2 : 0 || 0,
                            status: data?.status === "Pending" ? 2 : 0 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    }
                }
            },
            flipzikPayoutImpactPeek: {
                url: payOutApi.apiURL,
                headers: {
                    "access_key": process.env.IMPACTPEEK_FLIPZIK_ACCESS_KEY,
                    "signature": signatureFlipImpact,
                    "X-Timestamp": timestamp,
                    "Content-Type": "application/json"
                },
                data: requestData,
                res: async (apiResponse) => {
                    const { data, success } = apiResponse;
                    if (!success) {
                        return { message: "Failed", data: `Bank server is down.` }
                    }

                    if (data?.status === "Success" && data?.master_status === "Success") {
                        // If successful, store the payout data
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: data?.bank_reference_id,
                            trxId: trxId,
                            systemTrxId: data?.merchant_order_id,
                            optxId: data?.id,
                            isSuccess: "Success"
                        }
                        try {
                            await payOutModel.create(payoutDataStore);
                        } catch (error) {
                            null
                        }

                        // Call back to notify the user
                        let callBackBody = {
                            optxid: String(data?.id),
                            status: "SUCCESS",
                            txnid: trxId,
                            amount: String(amount),
                            rrn: data?.bank_reference_id,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userRespSend = {
                            statusCode: data?.status === "Success" ? 1 : 2 || 0,
                            status: data?.status === "Success" ? 1 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend)
                    } else if (data?.master_status === "Failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        let userRespSend2 = {
                            statusCode: data?.status === "Failed" ? 0 : 2 || 0,
                            status: data?.status === "Failed" ? 0 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    } else {
                        let userRespSend2 = {
                            statusCode: data?.status === "Pending" ? 2 : 0 || 0,
                            status: data?.status === "Pending" ? 2 : 0 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend2)
                    }
                }
            },
            flipzikPayoutMindMatrix: {
                url: payOutApi.apiURL,
                headers: {
                    "access_key": process.env.MINDMATRIX_FLIPZIK_ACCESS_KEY,
                    "signature": signatureFlipMindmatrix,
                    "X-Timestamp": timestamp,
                    "Content-Type": "application/json"
                },
                data: {
                    "address": "JAIPUR VASALI SECTOR-12",
                    "payment_type": 3,
                    "amount": amount * 100,
                    "name": accountHolderName,
                    "email": "abc@gmail.com",
                    "mobile_number": mobileNumber,
                    "account_number": accountNumber,
                    "ifsc_code": ifscCode,
                    "merchant_order_id": systemGenTrxId
                },
                res: async (apiResponse) => {
                    const { data, success } = apiResponse;
                    // console.log("flipzikPayoutMindMatrix data:", apiResponse);

                    if (!success) {
                        return { message: "Failed", data: `Bank server is down.` }
                    }

                    if (data?.status === "Success" && data?.master_status === "Success") {
                        // If successful, store the payout data
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: data?.bank_reference_id,
                            trxId: trxId,
                            systemTrxId: data?.merchant_order_id,
                            optxId: data?.id,
                            isSuccess: "Success"
                        }
                        try {
                            await payOutModel.create(payoutDataStore);
                        } catch (error) {
                            null
                        }
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()

                        // Call back to notify the user
                        let callBackBody = {
                            optxid: String(data?.id),
                            status: "SUCCESS",
                            txnid: trxId,
                            amount: String(amount),
                            rrn: data?.bank_reference_id,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userRespSend = {
                            statusCode: data?.status === "Success" ? 1 : 2 || 0,
                            status: data?.status === "Success" ? 1 : 2 || 0,
                            trxId: data?.merchant_order_id || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend)
                    } else if (data?.master_status === "Failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        let userRespSend2 = {
                            statusCode: data?.status === "Failed" ? 0 : 2 || 0,
                            status: data?.status === "Failed" ? 0 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    } else {
                        let userRespSend2 = {
                            statusCode: data?.status === "Pending" ? 2 : 0 || 0,
                            status: data?.status === "Pending" ? 2 : 0 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend2)
                    }
                }
            },
            flipzikSilverzenPayout: {
                url: payOutApi.apiURL,
                headers: {
                    "access_key": process.env.SILVERZEN_FLIPZIK_ACCESS_KEY,
                    "signature": signatureFlipSilverZen,
                    "X-Timestamp": timestamp,
                    "Content-Type": "application/json"
                },
                data: {
                    "address": "JAIPUR VASALI SECTOR-12",
                    "payment_type": 3,
                    "amount": amount * 100,
                    "name": accountHolderName,
                    "email": "abc@gmail.com",
                    "mobile_number": mobileNumber,
                    "account_number": accountNumber,
                    "ifsc_code": ifscCode,
                    "merchant_order_id": systemGenTrxId
                },
                res: async (apiResponse) => {
                    const { data, success } = apiResponse;
                    // console.log("flipzikPayoutMindMatrix data:", apiResponse);

                    if (!success) {
                        return { message: "Failed", data: `Bank server is down.` }
                    }

                    if (data?.status === "Success" && data?.master_status === "Success") {
                        // If successful, store the payout data
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: data?.bank_reference_id,
                            trxId: trxId,
                            systemTrxId: data?.merchant_order_id,
                            optxId: data?.id,
                            isSuccess: "Success"
                        }
                        try {
                            await payOutModel.create(payoutDataStore);
                        } catch (error) {
                            null
                        }
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()

                        // Call back to notify the user
                        let callBackBody = {
                            optxid: String(data?.id),
                            status: "SUCCESS",
                            txnid: data?.merchant_order_id,
                            amount: String(amount),
                            rrn: data?.bank_reference_id,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userRespSend = {
                            statusCode: data?.status === "Success" ? 1 : 2 || 0,
                            status: data?.status === "Success" ? 1 : 2 || 0,
                            trxId: data?.merchant_order_id || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend)
                    } else if (data?.master_status === "Failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        let userRespSend2 = {
                            statusCode: data?.status === "Failed" ? 0 : 2 || 0,
                            status: data?.status === "Failed" ? 0 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    } else {
                        let userRespSend2 = {
                            statusCode: data?.status === "Pending" ? 2 : 0 || 0,
                            status: data?.status === "Pending" ? 2 : 0 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.acquirer_message || "null"
                        }
                        return new ApiResponse(200, userRespSend2)
                    }
                }
            },
            proConceptPayoutApi: {
                url: payOutApi?.apiURL,
                headers: {
                    "AuthKey": process?.env?.proconceptKey,
                    "Content-Type": "application/json"
                },
                data: {
                    "Mobile": String(mobileNumber),
                    "AccountName": accountHolderName,
                    "AccountNo": accountNumber,
                    "IFSC": ifscCode,
                    "OrderId": trxId,
                    "amount": Number(amount)
                },
                res: async (apiResponse) => {
                    // const { statusCode, status, message, orderId, utr, clientOrderId, data, success } = apiResponse;
                    const { Statuscode,
                        Message,
                        Status,
                        OrderId,
                        RRN } = apiResponse;
                    let userRespSend = {
                        statusCode: Statuscode,
                        status: Status == "SUCCESS" ? 1 : 0,
                        trxId: OrderId || 0,
                        opt_msg: Message || "null"
                    }

                    if (Status.toLowerCase() === "success") {
                        return new ApiResponse(200, userRespSend)
                    }

                    if (Status.toLowerCase() === "failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                            payOutModelGen.isSuccess = "Failed"
                            await payOutModelGen.save()
                        } catch (error) {
                            // console.log("inside error:", error.message)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        return { message: "Failed", data: userRespSend }
                    }

                    return { message: "Failed", data: userRespSend }
                }
            },
            frescopayPayoutApi: {
                url: payOutApi.apiURL,
                headers: {
                    "Content-Type": "application/json"
                },
                data: {
                    "authToken": "220bb370851b5d5fc49ad34852f436eee050aaa5f05ec82446d50f3ef6f0e1e3",
                    "userName": "M1739525677788",
                    "mobileNumber": mobileNumber,
                    "accountHolderName": accountHolderName,
                    "accountNumber": accountNumber,
                    "ifscCode": ifscCode,
                    "bankName": bankName,
                    "amount": amount,
                    "trxId": trxId
                },
                res: async (apiResponse) => {
                    const { statusCode, data, message } = apiResponse;
                    if (data.status === "Success" && statusCode === 200) {
                        let userRespSend = {
                            statusCode: data?.statusCode || 0,
                            status: data?.status || 0,
                            trxId: String(data?.trxId) || "0",
                            opt_msg: data?.opt_msg || "null"
                        };
                        return new ApiResponse(200, userRespSend);
                    }
                    else if (String(message).toLowerCase() === "failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                            payOutModelGen.isSuccess = "Failed"
                            await payOutModelGen.save()
                        } catch (error) {
                            // console.log("inside error:", error.message)
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }
                        return { message: "Failed", data: userRespSend }
                    }
                    else {
                        return new ApiResponse(200, userRespSend);
                    }
                }
            },
            collectPayPayoutRaniGav: {
                url: payOutApi?.apiURL,
                headers: {
                    "APIkey": process.env.COLLECTPAY_API_KEY,
                    "tnxpassword": process.env.COLLECTPAY_TNX_PASSWORD,
                    "Content-Type": "application/json"
                },
                data: {
                    AccountMobile: mobileNumber,
                    AccountName: accountHolderName,
                    AccountNo: accountNumber,
                    AccountIfsc: ifscCode,
                    BankName: bankName,
                    Amount: amount,
                    AgentTrasID: trxId,
                    Status: "active",
                },
                res: async (apiResponse) => {
                    const { Data, Error } = apiResponse;
                    if (Error == true) {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }
                        let userRespSend2 = {
                            statusCode: 0,
                            status: 0,
                            trxId: trxId || 0,
                            opt_msg: "Bank server is down"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    }

                    if (Data?.Status.toLowerCase() === "success") {
                        // If successful, store the payout data
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: Data?.Bankrrn,
                            trxId: Data?.AgentTrasID,
                            optxId: Data?.TransID,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()

                        // Call back to notify the user
                        let callBackBody = {
                            optxid: String(Data?.TransID),
                            status: "SUCCESS",
                            txnid: Data?.AgentTrasID,
                            amount: String(amount),
                            rrn: Data?.Bankrrn,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userRespSend = {
                            statusCode: Data?.Status.toLowerCase === "success" ? 1 : 2 || 0,
                            status: Data?.Status.toLowerCase === "success" ? 1 : 2 || 0,
                            trxId: Data?.hellfodtddhddisis || 0,
                            opt_msg: Data?.hellfodtddhddisis || "null"
                        }
                        return new ApiResponse(200, userRespSend)
                    } else if (Data?.Status.toLowerCase() === "failed") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        let userRespSend2 = {
                            statusCode: Data?.Status.toLowerCase() === "failed" ? 0 : 2 || 0,
                            status: Data?.Status.toLowerCase() === "failed" ? 0 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: Data?.Status || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    } else {
                        let userRespSend2 = {
                            statusCode: Data?.Status.toLowerCase() === "pending" ? 2 : 0 || 0,
                            status: Data?.Status.toLowerCase() === "pending" ? 2 : 0 || 0,
                            trxId: trxId || 0,
                            opt_msg: Data?.Status || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    }
                }
            },
            huntoodPayout: {
                url: payOutApi?.apiURL,
                headers: {
                    "AuthKey": process.env.HUNTOOD_AUTH_KEY,
                    "IPAddress": process.env.HUNTOOD_IP_ADDRESS,
                    "Content-Type": "application/json"
                },
                data: {
                    AccountMobile: mobileNumber,
                    BenificiaryName: accountHolderName,
                    BenificiaryAccount: accountNumber,
                    BenificiaryIfsc: ifscCode,
                    BankName: bankName,
                    Amount: amount,
                    TransactionId: trxId,
                    Latitude: "26.848881",
                    Longitude: "75.807320"
                },
                res: async (apiResponse) => {
                    const { data, success } = apiResponse;

                    if (!success) {
                        return { message: "Failed", data: `Bank server is down.` }
                    }

                    if (data?.status === "SUCCESS" && data?.statusCode == "200") {
                        // If successful, store the payout data
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: data?.rrn,
                            trxId: data?.apiTransactionId,
                            optxId: data?.apiWalletTransactionId,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()

                        // Call back to notify the user
                        let callBackBody = {
                            optxid: String(data?.apiWalletTransactionId),
                            status: "SUCCESS",
                            txnid: data?.apiTransactionId,
                            amount: String(amount),
                            rrn: data?.rrn,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userRespSend = {
                            statusCode: data?.status === "SUCCESS" ? 1 : 2 || 0,
                            status: data?.status === "SUCCESS" ? 1 : 2 || 0,
                            trxId: data?.apiTransactionId || 0,
                            opt_msg: data?.apiWalletTransactionId || "null"
                        }
                        return new ApiResponse(200, userRespSend)
                    } else if (data?.status === "FAILURE" && data?.statusCode == "400") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // Handle failure: update wallet and store e-wallet transaction
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            payOutModelGen.isSuccess = "Failed"
                            await await payOutModelGen.save()
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        let userRespSend2 = {
                            statusCode: data?.statusCode == "400" ? 0 : 2 || 0,
                            status: data?.status === "FAILURE" ? 0 : 2 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.message || "null"
                        }
                        return { message: "Failed", data: userRespSend2 }
                    } else {
                        let userRespSend2 = {
                            statusCode: data?.statusCode == "201" ? 2 : 0 || 0,
                            status: data?.status === "PENDING" ? 2 : 0 || 0,
                            trxId: trxId || 0,
                            opt_msg: data?.message || "null"
                        }
                        return new ApiResponse(200, userRespSend2)
                    }
                }
            },
            jiffyWalletApi: {
                url: payOutApi?.apiURL,
                data: {
                    "AccountNumber": accountNumber,
                    "IfscCode": ifscCode,
                    "Amount": amount,
                    "OrderId": trxId,
                    "BeneficiaryName": accountHolderName,
                    "PaymentMode": "IMPS",
                    "MemberId": "MT17332757"
                },

                res: async (apiResponse) => {
                    const { status, message, data, errors } = JSON.parse(apiResponse?.response)
                    const { success } = apiResponse;

                    if (status === "SUCCESS" && Array.isArray(errors) && errors.length === 0) {
                        let userRespSend = {
                            statusCode: 1,
                            status: 1,
                            trxId: trxId || "0",
                            opt_msg: message || "null"
                        };
                        return new ApiResponse(200, userRespSend);
                    }
                    else if (status === "FAILED") {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                            payOutModelGen.isSuccess = "Failed"
                            await payOutModelGen.save()
                        } catch (error) {
                            // console.log("inside error:", error.message)
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }
                        let userRespSend = {
                            statusCode: 1,
                            status: 1,
                            trxId: trxId || "0",
                            opt_msg: message || "null"
                        };
                        return { message: "Failed", data: userRespSend }
                    }
                    // else {
                    //     let userRespSend = {
                    //         statusCode: 1,
                    //         status: 1,
                    //         trxId: trxId || "0",
                    //         opt_msg: message || "null"
                    //     };
                    //     return new ApiResponse(200, userRespSend);
                    // }
                }
            },
            jiffypayoutSkill: {
                url: payOutApi?.apiURL,
                data: {
                    "ClientReferenceId": trxId,
                    "BeneficiaryId": "",
                    "BeneficiaryName": accountHolderName,
                    "AccountNumber": accountNumber,
                    "IFSCCode": ifscCode,
                    "BeneficiaryMobile": "0",
                    "TransactionType": "IMPS",
                    "TransactionAmount": String(amount),
                    "AgentId": "63885503379121",
                    "BankName": bankName,
                    "Pincode": "302012",
                    "CustomerName": accountHolderName,
                    "CustomerNumber": String(mobileNumber),
                    "IpAddress": process.env.VAULTAGE_IP_ADDRESS,
                    "Latitude": "26.949498",
                    "Longitude": "75.710887",
                    "PIN": "23334856",
                    "MemberId": process.env.JIFFY_WALLET_MERCHANT_ID
                },

                res: async (apiResponse) => {
                    // console.log(" payOut.controller.js:2205 ~ res: ~ apiResponse:", apiResponse);

                    const { StatusCode, StatusMessage, ClientUniqueID, TransactionId, BeneName, BankRRN, TransactionAmount } = apiResponse
                    payOutModelGen.refId = ClientUniqueID
                    await payOutModelGen.save()
                    if (StatusCode == "0") {

                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: BankRRN,
                            trxId: trxId,
                            optxId: ClientUniqueID,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let callBackBody = {
                            optxid: ClientUniqueID,
                            status: "SUCCESS",
                            txnid: trxId,
                            amount: amount,
                            rrn: BankRRN,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: StatusCode == 0 ? 1 : 2,
                            status: StatusCode == 0 ? 1 : 2,
                            trxId: trxId || 0,
                            opt_msg: StatusMessage || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                    else if (StatusCode == "1") {
                        const release = await genPayoutMutex.acquire();
                        // db locking with added amount 
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // wallet added and store ewallet trx
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // Perform the update within the transaction
                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            // console.log(error)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        payOutModelGen.isSuccess = "Failed"
                        await await payOutModelGen.save()
                        let userREspSend2 = {
                            statusCode: StatusCode == 1 ? 0 : 2,
                            status: StatusCode == 1 ? 0 : 2,
                            trxId: trxId || 0,
                            opt_msg: StatusMessage || "null"
                        }
                        return { message: "Failed", data: userREspSend2 }
                    }
                    else {
                        // let callBackBody = {
                        //     optxid: orderId || "",
                        //     status: "Pending",
                        //     txnid: clientOrderId || "",
                        //     amount: amount,
                        //     rrn: utr || "",
                        // }
                        // customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: 2,
                            status: 2,
                            trxId: trxId || 0,
                            opt_msg: StatusMessage || "Payout initiated, awaiting response from banking side."
                        }
                        return new ApiResponse(200, userREspSend)
                    }

                }
            },
            vaultagePayoutApi: {
                url: payOutApi?.apiURL,
                data: {
                    BenificiaryAccount: accountNumber,
                    BenificiaryIfsc: ifscCode,
                    Amount: amount,
                    TransactionId: systemGenTrxId,
                    BenificiaryName: accountHolderName,
                    Latitude: "26.949501",
                    Longitude: "75.710884"
                },
                headers: {
                    AuthKey: process.env.VAULTAGE_AUTH_KEY,
                    IPAddress: process.env.VAULTAGE_IP_ADDRESS
                },
                res: async (apiResponse) => {
                    const { success, responseCode, message, data } = apiResponse;
                    if (responseCode === 200 && success && (data.rrn || data?.status === "PENDING")) {
                        let userRespSend = {
                            statusCode: 1,
                            status: 1,
                            trxId: trxId,
                            opt_msg: message

                        }
                        return { message: "Success", data: userRespSend }
                    } else {
                        const release = await genPayoutMutex.acquire();
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                            payOutModelGen.isSuccess = "Failed"
                            await payOutModelGen.save()
                        } catch (error) {
                            // console.log("inside error:", error.message)
                            await walletAddsession.abortTransaction();
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }
                        let userRespSend = {
                            statusCode: responseCode,
                            status: 0,
                            trxId: trxId,
                            opt_msg: message || "null"
                        }
                        return { message: "Failed", data: userRespSend }
                    }
                }
            },
            jiffyPayoutApiV2Mind: {
                url: payOutApi?.apiURL,
                data: {
                    latitude: "26.949501",
                    longitude: "75.710884",
                    account_no: accountNumber,
                    ifsc_code: ifscCode,
                    beneficiary_name: accountHolderName,
                    amount: amount,
                    reference_id: trxId,
                    payment_mode: "IMPS",
                    bene_email: "marwarpay@gmail.com",
                    bene_mobile: mobileNumber.toString()
                },
                headers: {
                    AuthToken: process.env.JIFFY_WALLET_AUTH_TOKEN,
                    IpAddress: process.env.VAULTAGE_IP_ADDRESS,
                    MerchantId: process.env.JIFFY_WALLET_MERCHANT_ID
                },
                res: async (apiResponse) => {

                    const { status, message, data } = apiResponse;
                    // console.log("apiRes", apiResponse)
                    const { response_code, subStatus, ref_id, transaction_id, utr, payment_mode, amount, payment_remark, account_number, ifsc, beneficiaryName } = data;


                    payOutModelGen.refId = transaction_id
                    await payOutModelGen.save()
                    if (status == 1 && response_code == 1) {
                        let payoutDataStore = {
                            memberId: user?._id,
                            amount: amount,
                            chargeAmount: chargeAmount,
                            finalAmount: finalAmountDeduct,
                            bankRRN: utr,
                            trxId: trxId,
                            optxId: transaction_id,
                            isSuccess: "Success"
                        }
                        await payOutModel.create(payoutDataStore);
                        payOutModelGen.isSuccess = "Success"
                        await payOutModelGen.save()
                        let callBackBody = {
                            optxid: transaction_id,
                            status: "SUCCESS",
                            txnid: trxId,
                            amount: amount,
                            rrn: utr,
                        }

                        customCallBackPayoutUser(user?._id, callBackBody)

                        let userREspSend = {
                            statusCode: status == 1 ? utr !== "" ? 1 : 2 : 0,
                            status: status == 1 ? utr !== "" ? 1 : 2 : 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return new ApiResponse(200, userREspSend)
                    }
                    else if (status == "0" || (response_code == 0 && subStatus == "100")) {
                        const release = await genPayoutMutex.acquire();
                        // db locking with added amount 
                        const walletAddsession = await userDB.startSession();
                        const transactionOptions = {
                            readConcern: { level: 'linearizable' },
                            writeConcern: { w: 'majority' },
                            readPreference: { mode: 'primary' },
                            maxTimeMS: 1500
                        };
                        // wallet added and store ewallet trx
                        try {
                            walletAddsession.startTransaction(transactionOptions);
                            const opts = { walletAddsession };

                            // Perform the update within the transaction
                            // update wallet 
                            let userWallet = await userDB.findByIdAndUpdate(user?._id, { $inc: { EwalletBalance: + finalAmountDeduct, EwalletFundLock: + finalAmountDeduct } }, {
                                returnDocument: 'after',
                                walletAddsession
                            })

                            let afterAmount = userWallet?.EwalletBalance
                            let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                            // ewallet store 
                            let walletModelDataStore = {
                                memberId: user?._id,
                                transactionType: "Cr.",
                                transactionAmount: amount,
                                beforeAmount: beforeAmount,
                                chargeAmount: chargeAmount,
                                afterAmount: afterAmount,
                                description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${trxId}`,
                                transactionStatus: "Success",
                            }

                            await walletModel.create([walletModelDataStore], opts)

                            try {
                                let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: user._id } }]);
                                if (userCallBackResp.length === 1) {
                                    let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
                                    const config = {
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    };
                                    let shareObjData = {
                                        "status": "FAILED",
                                        "txnid": trxId,
                                        "optxid": "",
                                        "amount": amount,
                                        "rrn": ""
                                    }
                                    await axios.post(payOutUserCallBackURL, shareObjData, config)
                                }
                            } catch (error) {
                                null
                            }
                            // Commit the transaction
                            await walletAddsession.commitTransaction();
                            // console.log('Transaction committed successfully');
                        } catch (error) {
                            // console.log(error)
                            await walletAddsession.abortTransaction();
                            // console.error('Transaction aborted due to error:', error);
                        }
                        finally {
                            walletAddsession.endSession();
                            release()
                        }

                        payOutModelGen.isSuccess = "Failed"
                        await await payOutModelGen.save()
                        let userREspSend = {
                            statusCode: status == 1 ? utr !== "" ? 1 : 2 : 0,
                            status: status == 1 ? utr !== "" ? 1 : 2 : 0,
                            trxId: trxId || 0,
                            opt_msg: message || "null"
                        }
                        return { message: "Failed", data: userREspSend }
                    }
                    else {
                        let userREspSend = {
                            statusCode: 2,
                            status: 2,
                            trxId: trxId || 0,
                            opt_msg: message || "Payout initiated, awaiting response from banking side."
                        }
                        return new ApiResponse(200, userREspSend)
                    }

                }
            },
        };

        const apiResponse = await performPayoutApiCall(payOutApi, apiConfig, accountNumber, ifscCode, bankName, accountHolderName, mobileNumber);
        if (!apiResponse || typeof apiResponse != "object") {
            // payOutModelGen.isSuccess = "Failed";
            // await payOutModelGen.save();
            return res.status(500).json({ message: "Failed", data: { statusCode: 400, txnID: trxId, message: apiResponse } });
        }
        const response = await apiConfig[payOutApi.apiName]?.res(apiResponse)
        return res.status(200).json(response);
    } catch (error) {
        const errorMsg = error.code === 11000 ? "Duplicate key error!" : error.message;
        return res.status(400).json({ message: "Failed", data: errorMsg });
    }
    // finally {
    //     release();
    // }
});

export const performPayoutApiCall = async (payOutApi, apiConfig, accountNo, ifsc, bankName, accountHolderName, mobile) => {
    try {
        let apiDetails;
        if (payOutApi?.apiName === "jiffyWalletApi") {
            try {

                const { data } = await axios.post("https://jiffywallet.in/Api/Payout/Token", {}, {
                    headers: {
                        client_id: "ertertertererer",
                        client_secret: "gfhfgfghfgfggfgf",
                        Merchant_Id: "MT00008478"
                    }
                })

                const token = JSON.parse(data?.response).data.token;
                apiDetails = apiConfig[payOutApi?.apiName];
                apiDetails.headers = {};
                apiDetails.headers.token = token;
            } catch (error) {
                // console.log(" payOut.controller.js:2310 ~ performPayoutApiCall ~ error:", error);
            }
        } else if (payOutApi?.apiName === "jiffypayoutSkill") {
            const isBeneficiaryExists = await BeneficiaryModel.findOne({ accountNo, ifsc, bankName })
            let beneficiaryId;
            apiDetails = apiConfig[payOutApi?.apiName];
            if (!isBeneficiaryExists) {
                try {
                    const payload = {
                        "AgentId": "63885503379121",
                        "BeneficiaryName": accountHolderName,
                        "BeneficiaryAccountNumber": accountNo,
                        "BeneficiaryIFSCCode": ifsc,
                        "BeneficiaryMobile": "",
                        "BeneficiaryVerified": true
                    }
                    const headers = {
                        AuthToken: process.env.JIFFY_WALLET_AUTH_TOKEN,
                        IpAddress: process.env.VAULTAGE_IP_ADDRESS
                    }
                    const { data } = await axios.post("https://jiffywallet.in/Api/merchant/AddBeneficiary", payload, { headers })
                    if (data.result === 0) {
                        BeneficiaryModel.create({
                            accountNo, ifsc, bankName, beneficiaryId: data?.beneficiaryId, usedPanel: "jiffypayoutSkill"
                        })
                    }
                    beneficiaryId = data?.beneficiaryId
                } catch (error) {
                    // console.log(" payOut.controller.js:2419 ~ performPayoutApiCall ~ error:", error?.response?.data);
                    throw Error("Beneficery add issue")
                }
            } else {
                beneficiaryId = isBeneficiaryExists.beneficiaryId
            }
            apiDetails.data.BeneficiaryId = beneficiaryId
        }
        apiDetails ??= apiConfig[payOutApi?.apiName];
        if (!apiDetails) return null;
        const response = await axios.post(apiDetails.url, apiDetails.data, { headers: apiDetails.headers });
        return response?.data || null;


    } catch (error) {
        // console.log(" payOut.controller.js:2786 ~ performPayoutApiCall ~ error:", error?.response?.data);

        // console.log(error, "error")
        if (error?.response?.data?.fault?.detail?.errorcode === "steps.accesscontrol.IPDeniedAccess") {
            return "Ip validation Failed"
        }
        // console.error(`API Call Error for ${payOutApi?.apiName}:`, error?.message);
        return `Banking Server Error : ${error}`;
    }
};

export const payoutStatusCheck = asyncHandler(async (req, res) => {
    let trxIdGet = req.params.trxId;
    let pipline = [{ $match: { trxId: trxIdGet } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } },
    {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, {
        $project: { "_id": 1, "trxId": 1, "accountHolderName": 1, "optxId": 1, "accountNumber": 1, "ifscCode": 1, "amount": 1, "bankRRN": 1, "chargeAmount": 1, "finalAmount": 1, "isSuccess": 1, "createdAt": 1, "userInfo.userName": 1, "userInfo.fullName": 1, "userInfo.memberId": 1 }
    }]
    let pack = await payOutModelGenerate.aggregate(pipline);
    if (!pack.length) {
        let pack2 = await oldPayOutModelGenerate.aggregate(pipline);
        if (!pack2.length) {
            return res.status(400).json({ message: "Failed", data: "No Transaction !" })
        }
        pack = pack.concat(pack2)
    }
    res.status(200).json(new ApiResponse(200, pack))
});

// export const payoutStatusUpdate = asyncHandler(async (req, res) => {
//     let trxIdGet = req.params.trxId;
//     let pack = await payOutModelGenerate.findOne({ trxId: trxIdGet })
//     if (!pack) {
//         return res.status(400).json({ message: "Failed", data: "No Transaction !" })
//     }
//     if (pack.isSuccess === "Success" || pack.isSuccess === "Failed") {
//         return res.status(400).json({ message: "Failed", data: `Transaction Status Can't Update Already: ${pack?.isSuccess}` })
//     }
//     pack.isSuccess = req.body.isSuccess;
//     await pack.save()
//     res.status(200).json(new ApiResponse(200, pack))
// });

export const payoutCallBackResponse = asyncHandler(async (req, res) => {
    try {
        let callBackPayout = req.body;
        let data = { txnid: callBackPayout?.txnid, optxid: callBackPayout?.optxid, amount: callBackPayout?.amount, rrn: callBackPayout?.rrn, status: callBackPayout?.status }

        if (req.body.UTR) {
            data = { txnid: callBackPayout?.ClientOrderId, optxid: callBackPayout?.OrderId, amount: callBackPayout?.Amount, rrn: callBackPayout?.UTR, status: (callBackPayout?.Status == 1) ? "SUCCESS" : "Pending" }
        }

        if (data.status != "SUCCESS") {
            return res.status(400).json({ succes: "Failed", message: "Payment Failed Operator Side !" })
        }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: data?.txnid });

        if (getDocoment?.isSuccess === "Success" || "Failed") {
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: getDocoment.memberId } }]);

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    // 'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            let shareObjData = {
                status: data?.status,
                txnid: data?.txnid,
                optxid: data?.optxid,
                amount: data?.amount,
                rrn: data?.rrn
            }

            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                return
            }
            if (res) {
                return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
            }
            return
        }

        if (getDocoment && data?.rrn && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let userWalletInfo = await userDB.findById(userInfo[0]?._id, "_id EwalletBalance");
            let beforeAmountUser = userWalletInfo.EwalletBalance;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let walletModelDataStore = {
                memberId: userWalletInfo._id,
                transactionType: "Dr.",
                transactionAmount: data?.amount,
                beforeAmount: beforeAmountUser,
                chargeAmount: chargePaymentGatway,
                afterAmount: beforeAmountUser - finalEwalletDeducted,
                description: `Successfully Dr. amount: ${finalEwalletDeducted}`,
                transactionStatus: "Success",
            }

            userWalletInfo.EwalletBalance -= finalEwalletDeducted
            await userWalletInfo.save();

            let storeTrx = await walletModel.create(walletModelDataStore)

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.rrn,
                trxId: data?.txnid,
                optxId: data?.optxid,
                isSuccess: "Success"
            }

            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);

            if (userCallBackResp.length !== 1) {
                return res.status(400).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            let shareObjData = {
                status: data?.status,
                txnid: data?.txnid,
                optxid: data?.optxid,
                amount: data?.amount,
                rrn: data?.rrn
            }

            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                return
            }
            if (res) {
                return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
            }
            return

        } else {
            return res.status(400).json({ message: "Failed", data: "Trx Id and user not Found !" })
        }
    } catch (error) {
        // console.log(error)
        return res.status(400).json({ message: "Failed", data: "Internal server error !" })
    }
});

export const payoutCallBackImpactPeek = asyncHandler(async (req, res) => {
    try {
        let callBackPayout = req.body;
        let data = { txnid: callBackPayout?.txnid, optxid: callBackPayout?.optxid, amount: callBackPayout?.amount, rrn: callBackPayout?.rrn, status: callBackPayout?.status }

        if (data.status != "SUCCESS") {
            return res.status(400).json({ succes: "Failed", message: "Payment Failed Operator Side !" })
        }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: data?.txnid });

        if (getDocoment?.isSuccess === "Success" || "Failed") {
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: getDocoment.memberId } }]);

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    // 'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            let shareObjData = {
                status: data?.status,
                txnid: data?.txnid,
                optxid: data?.optxid,
                amount: data?.amount,
                rrn: data?.rrn
            }

            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                return
            }
            if (res) {
                return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
            }
            return
        }

        if (getDocoment && data?.rrn && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let userWalletInfo = await userDB.findById(userInfo[0]?._id, "_id EwalletBalance");
            let beforeAmountUser = userWalletInfo.EwalletBalance;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let walletModelDataStore = {
                memberId: userWalletInfo._id,
                transactionType: "Dr.",
                transactionAmount: data?.amount,
                beforeAmount: beforeAmountUser,
                chargeAmount: chargePaymentGatway,
                afterAmount: beforeAmountUser - finalEwalletDeducted,
                description: `Successfully Dr. amount: ${finalEwalletDeducted}`,
                transactionStatus: "Success",
            }

            userWalletInfo.EwalletBalance -= finalEwalletDeducted
            await userWalletInfo.save();

            let storeTrx = await walletModel.create(walletModelDataStore)

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.rrn,
                trxId: data?.txnid,
                optxId: data?.optxid,
                isSuccess: "Success"
            }

            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);

            if (userCallBackResp.length !== 1) {
                return res.status(400).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            let shareObjData = {
                status: data?.status,
                txnid: data?.txnid,
                optxid: data?.optxid,
                amount: data?.amount,
                rrn: data?.rrn
            }

            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                return
            }
            if (res) {
                return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
            }
            return

        } else {
            return res.status(400).json({ message: "Failed", data: "Trx Id and user not Found !" })
        }
    } catch (error) {
        // console.log(error)
        return res.status(400).json({ message: "Failed", data: "Internal server error !" })
    }
});

export const iSmartPayCallback = asyncHandler(async (req, res) => {
    const release = await iSmartMutex.acquire()
    try {
        const { status, status_code, message, transaction_id, amount, bank_id, order_id, purpose, narration, currency, created_on } = req.body
        let data = { txnid: order_id, optxid: transaction_id, amount: amount, rrn: bank_id, status: status ? "SUCCESS" : status }

        // if (req.body.bank_id) {
        //     data = { txnid: callBackPayout?.ClientOrderId, optxid: callBackPayout?.OrderId, amount: callBackPayout?.Amount, rrn: callBackPayout?.UTR, status: (callBackPayout?.Status == 1) ? "SUCCESS" : "Pending" }
        // }

        if (data.status != "SUCCESS") {
            return res.status(400).json({ succes: "Failed", message: message })
        }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: data?.txnid });

        if (getDocoment?.isSuccess === "Success" || "Failed") {
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: getDocoment.memberId } }]);

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    // 'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            let shareObjData = {
                status: data?.status ? "SUCCESS" : "Failed",
                txnid: data?.txnid,
                optxid: data?.optxid,
                amount: data?.amount,
                rrn: data?.rrn
            }

            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                return true
            }
            if (res) {
                return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
            }
            return true
        }

        if (getDocoment && data?.rrn && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let userWalletInfo = await userDB.findById(userInfo[0]?._id, "_id EwalletBalance");
            let beforeAmountUser = userWalletInfo.EwalletBalance;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let walletModelDataStore = {
                memberId: userWalletInfo._id,
                transactionType: "Dr.",
                transactionAmount: data?.amount,
                beforeAmount: beforeAmountUser,
                chargeAmount: chargePaymentGatway,
                afterAmount: beforeAmountUser - finalEwalletDeducted,
                description: `Successfully Dr. amount: ${finalEwalletDeducted}`,
                transactionStatus: "Success",
            }

            userWalletInfo.EwalletBalance -= finalEwalletDeducted
            await userWalletInfo.save();

            let storeTrx = await walletModel.create(walletModelDataStore)

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.rrn,
                trxId: data?.txnid,
                optxId: data?.optxid,
                isSuccess: "Success"
            }

            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);

            if (userCallBackResp.length !== 1) {
                return res.status(400).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            let shareObjData = {
                status: data?.status,
                txnid: data?.txnid,
                optxid: data?.optxid,
                amount: data?.amount,
                rrn: data?.rrn
            }

            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                return
            }
            if (res) {
                return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
            }
            return

        } else {
            return res.status(400).json({ message: "Failed", data: "Trx Id and user not Found !" })
        }
    } catch (error) {

    } finally {
        release()
    }
})

export const customCallBackPayoutUser = async (userId, Body) => {
    let callBackPayout = Body;
    let data = { txnid: callBackPayout?.txnid, optxid: callBackPayout?.optxid, amount: callBackPayout?.amount, rrn: callBackPayout?.rrn, status: callBackPayout?.status }

    // send callback to user
    // let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userId } }]);
    let userCallBackResp = await callBackResponse.findOne({ memberId: userId });

    if (!userCallBackResp) {
        return false
    }

    let payOutUserCallBackURL = userCallBackResp?.payOutCallBackUrl;
    const config = {
        headers: {
            // 'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    let shareObjData = {
        status: data?.status,
        txnid: data?.txnid,
        optxid: data?.optxid,
        amount: data?.amount,
        rrn: data?.rrn
    }

    try {
        await axios.post(payOutUserCallBackURL, shareObjData, config)
    } catch (error) {
        null
    }
    return true
}

export const flipzikpayCallback = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        // const signatureHeader = req.headers['signature'];
        // if (!signatureHeader) {
        //     return res.status(400).json({ error: "Missing signature header" });
        // }
        // const parts = signatureHeader.split(',').reduce((acc, part) => {
        //     const [key, value] = part.split('=');
        //     acc[key] = value;
        //     return acc;
        // }, {});

        // const timestamp = parts['t'];
        // const receivedSignature = parts['v0'];

        // if (!timestamp || !receivedSignature) {
        //     return res.status(400).json({ error: "Invalid signature format" });
        // }

        // const bodyString = JSON.stringify(req.body);
        // const expectedSignature = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${bodyString}`).digest('hex');;

        // console.log(receivedSignature)
        // console.log(expectedSignature)

        // if (!crypto.timingSafeEqual(Buffer.from(receivedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        //     return res.status(401).json({ error: "Invalid signature" });
        // }
        const { event_type, data } = req.body

        const dataObject = { txnid: data?.object?.merchant_order_id, optxid: data?.object?.id, amount: data?.object?.amount, rrn: data?.object?.bank_reference_id, status: data.object?.status == "Success" ? "SUCCESS" : data.object?.status }


        if (event_type != "payout.txn_succeeded") {
            return res.status(200).json({ succes: "Failed", message: "Got It failed" })
        }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: dataObject?.txnid });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (getDocoment && dataObject?.rrn && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            // let userWalletInfo = await userDB.findById(userInfo[0]?._id, "_id EwalletBalance");
            // let beforeAmountUser = userWalletInfo.EwalletBalance;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            // let walletModelDataStore = {
            //     memberId: userWalletInfo._id,
            //     transactionType: "Dr.",
            //     transactionAmount: dataObject?.amount,
            //     beforeAmount: beforeAmountUser,
            //     chargeAmount: chargePaymentGatway,
            //     afterAmount: beforeAmountUser - finalEwalletDeducted,
            //     description: `Successfully Dr. amount: ${finalEwalletDeducted}`,
            //     transactionStatus: "Success",
            // }

            // userWalletInfo.EwalletBalance -= finalEwalletDeducted
            // await userWalletInfo.save();
            // await userDB.findByIdAndUpdate(userInfo[0]?._id,
            //     { $inc: { EwalletBalance: -finalEwalletDeducted } }
            // );

            // let storeTrx = await walletModel.create(walletModelDataStore)

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);
            if (userCallBackResp.length !== 1) {
                return res.status(200).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }
            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: dataObject?.txnid,
                optxid: dataObject?.optxid,
                amount: dataObject?.amount,
                rrn: dataObject?.rrn
            }
            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        } else if (dataObject.status.toLowerCase() == "failed" || data?.object?.master_status?.toLowerCase() == "failed") {
            const session = await mongoose.startSession();

            try {
                session.startTransaction();
                let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(
                    getDocoment?.memberId,
                    { isSuccess: "Failed" },
                    { new: true, session }
                );

                let finalEwalletDeducted = payoutModelData?.afterChargeAmount;

                // Update user wallet
                let userWallet = await userDB.findByIdAndUpdate(
                    payoutModelData?.memberId,
                    { $inc: { EwalletBalance: +finalEwalletDeducted } },
                    { returnDocument: "after", session }
                );

                if (!userWallet) {
                    throw new Error("User wallet not found!");
                }

                let afterAmount = userWallet?.EwalletBalance;
                let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;

                let walletModelDataStore = {
                    memberId: payoutModelData?.memberId,
                    transactionType: "Cr.",
                    transactionAmount: payoutModelData?.amount,
                    beforeAmount: beforeAmount,
                    chargeAmount: payoutModelData?.gatwayCharge,
                    afterAmount: afterAmount,
                    description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${payoutModelData?.trxId}`,
                    transactionStatus: "Success",
                };

                // Store eWallet transaction
                await walletModel.create([walletModelDataStore], { session }); // Pass session

                // Commit the transaction
                await session.commitTransaction();
                session.endSession();

                return res.status(200).json({ message: "Failed", data: "Transaction processed successfully!" });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                console.error("Transaction failed:", error);
                return res.status(200).json({ message: "Error", error: error.message });
            }
        }
    } catch (error) {
        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})

export const flipzikCallbackImpactPeek = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        // const signatureHeader = req.headers['signature'];
        // if (!signatureHeader) {
        //     return res.status(400).json({ error: "Missing signature header" });
        // }
        // const parts = signatureHeader.split(',').reduce((acc, part) => {
        //     const [key, value] = part.split('=');
        //     acc[key] = value;
        //     return acc;
        // }, {});

        // const timestamp = parts['t'];
        // const receivedSignature = parts['v0'];

        // if (!timestamp || !receivedSignature) {
        //     return res.status(400).json({ error: "Invalid signature format" });
        // }

        // const bodyString = JSON.stringify(req.body);
        // const expectedSignature = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${bodyString}`).digest('hex');;

        // console.log(receivedSignature)
        // console.log(expectedSignature)

        // if (!crypto.timingSafeEqual(Buffer.from(receivedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        //     return res.status(401).json({ error: "Invalid signature" });
        // }
        const { event_type, data } = req.body

        const dataObject = { systemGenTrxId: data?.object?.merchant_order_id, optxid: data?.object?.id, amount: data?.object?.amount, rrn: data?.object?.bank_reference_id, status: data.object?.status == "Success" ? "SUCCESS" : data.object?.status }


        if (event_type != "payout.txn_succeeded") {
            return res.status(200).json({ succes: "Failed", message: "Got It failed" })
        }

        let getDocoment = await payOutModelGenerate.findOne({ systemTrxId: dataObject?.systemGenTrxId });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (getDocoment && dataObject?.status === "SUCCESS" && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            // let userWalletInfo = await userDB.findById(userInfo[0]?._id, "_id EwalletBalance");
            // let beforeAmountUser = userWalletInfo.EwalletBalance;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: getDocoment?.trxId,
                systemTrxId: dataObject?.systemGenTrxId,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: dataObject?.systemGenTrxId,
                optxid: dataObject?.optxid,
                amount: dataObject?.amount,
                rrn: dataObject?.rrn
            }
            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        } else if (dataObject.status.toLowerCase() == "failed" || data?.object?.master_status?.toLowerCase() == "failed") {

            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(getDocoment?._id,
                { isSuccess: "Failed" },
                { new: true }
            );

            await eWalletCrJobs(payoutModelData?.memberId, payoutModelData?.amount, payoutModelData?.gatwayCharge, payoutModelData?.trxId);
            // done

            return res.status(200).json({ message: "Failed", data: "Transaction processed successfully!" });
        } else {
            return res.status(200).json({ message: "Failed", data: "Trx Not Found !" })
        }
    } catch (error) {
        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})

export const proConceptCallback = asyncHandler(async (req, res) => {
    // const release = await proconceptMutex.acquire()
    try {
        const { status, status_code, txnid, optxid, amount, rrn } = req?.body

        let dataObject = { txnid: txnid, optxid: optxid, amount: amount, rrn: rrn, status: status }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: dataObject?.txnid });

        if (!getDocoment) {
            return res.status(400).json({ message: "Failed", data: "Trx Id and user not Found !" });
        }

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (dataObject?.status === "SUCCESS") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }

            await payOutModel.create(payoutDataStore)

            // call back send to user
            let callBackBody = {
                optxid: dataObject?.optxid,
                status: "SUCCESS",
                txnid: dataObject?.txnid,
                amount: dataObject?.amount,
                rrn: dataObject?.rrn,
            }
            customCallBackPayoutUser(getDocoment?.memberId, callBackBody)

            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))

        } else if (dataObject?.status === "FAILED") {
            const release = await genPayoutMutex.acquire();
            const walletAddsession = await userDB.startSession();
            const transactionOptions = {
                readConcern: { level: 'linearizable' },
                writeConcern: { w: 'majority' },
                readPreference: { mode: 'primary' },
                maxTimeMS: 1500
            };
            // Handle failure: update wallet and store e-wallet transaction
            try {
                walletAddsession.startTransaction(transactionOptions);
                const opts = { walletAddsession };

                // update wallet 
                let userWallet = await userDB.findByIdAndUpdate(getDocoment?.memberId, { $inc: { EwalletBalance: + finalAmountDeduct } }, {
                    returnDocument: 'after',
                    walletAddsession
                })

                let afterAmount = userWallet?.EwalletBalance
                let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                // ewallet store 
                let walletModelDataStore = {
                    memberId: getDocoment?.memberId,
                    transactionType: "Cr.",
                    transactionAmount: amount,
                    beforeAmount: beforeAmount,
                    chargeAmount: chargeAmount,
                    afterAmount: afterAmount,
                    description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${dataObject?.txnid}`,
                    transactionStatus: "Success",
                }

                await walletModel.create([walletModelDataStore], opts)
                // Commit the transaction
                await walletAddsession.commitTransaction();
                // console.log('Transaction committed successfully');
                getDocoment.isSuccess = "Failed"
                await getDocoment.save()
            } catch (error) {
                // console.log("inside error:", error.message)
                await walletAddsession.abortTransaction();
                // console.error('Transaction aborted due to error:', error);
            }
            finally {
                walletAddsession.endSession();
                release()
            }

            return { message: "Failed", data: userRespSend }
        } else {
            return res.status(400).json({ message: "Failed", data: "Not success and not Failed !" })
        }
    } catch (error) {
        // console.log(error)
        return res.status(500).json({ message: "Failed", data: "Internel server Error Accured !" })
    }
    // finally {
    //     release()
    // }
})

export const frescopayCallback = asyncHandler(async (req, res) => {
    try {
        const { status, txnid, optxid, amount, rrn } = req.body

        let dataObject = { txnid: txnid, optxid: optxid, amount: amount, rrn: rrn, status: status }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: dataObject?.txnid });

        if (!getDocoment) {
            return res.status(400).json({ message: "Failed", data: "Trx Id and user not Found !" });
        }

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (dataObject?.status === "SUCCESS") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();
            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;
            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            // call back send to user
            let callBackBody = {
                optxid: "",
                status: "SUCCESS",
                txnid: dataObject?.txnid,
                amount: dataObject?.amount,
                rrn: dataObject?.rrn,
            }
            customCallBackPayoutUser(getDocoment?.memberId, callBackBody)
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        }
        else if (dataObject?.status === "FAILED") {
            const release = await genPayoutMutex.acquire();
            const walletAddsession = await userDB.startSession();
            const transactionOptions = {
                readConcern: { level: 'linearizable' },
                writeConcern: { w: 'majority' },
                readPreference: { mode: 'primary' },
                maxTimeMS: 1500
            };
            // Handle failure: update wallet and store e-wallet transaction
            try {
                walletAddsession.startTransaction(transactionOptions);
                const opts = { walletAddsession };

                // update wallet 
                let userWallet = await userDB.findByIdAndUpdate(getDocoment?.memberId, { $inc: { EwalletBalance: + finalAmountDeduct } }, {
                    returnDocument: 'after',
                    walletAddsession
                })

                let afterAmount = userWallet?.EwalletBalance
                let beforeAmount = userWallet?.EwalletBalance - finalAmountDeduct;

                // ewallet store 
                let walletModelDataStore = {
                    memberId: getDocoment?.memberId,
                    transactionType: "Cr.",
                    transactionAmount: amount,
                    beforeAmount: beforeAmount,
                    chargeAmount: chargeAmount,
                    afterAmount: afterAmount,
                    description: `Successfully Cr. amount: ${Number(finalAmountDeduct)} with transaction Id: ${dataObject?.txnid}`,
                    transactionStatus: "Success",
                }

                await walletModel.create([walletModelDataStore], opts)
                // Commit the transaction
                await walletAddsession.commitTransaction();
                // console.log('Transaction committed successfully');
                getDocoment.isSuccess = "Failed"
                await getDocoment.save()
            } catch (error) {
                // console.log("inside error:", error.message)
                await walletAddsession.abortTransaction();
                // console.error('Transaction aborted due to error:', error);
            }
            finally {
                walletAddsession.endSession();
                release()
            }
            return { message: "Failed", data: userRespSend }
        }
        else {
            return res.status(200).json({ message: "Failed", data: "Not success or callback response not in valid manner !" })
        }
    } catch (error) {
        return res.status(500).json({ message: "Failed", data: "Internel server Error Accured !" })
    }
})

export const jiffyCallbackResponse = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        const Data = req.body

        let dataObject = { jiffyId: Data?.ClientUniqueID, optxid: Data?.order_id, rrn: Data?.BankRRN, status: Data?.StatusCode }

        let getDocoment = await payOutModelGenerate.findOne({ refId: dataObject?.jiffyId });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }
        dataObject.txnid = getDocoment?.trxId

        if (getDocoment && dataObject?.status == "0" && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);
            if (userCallBackResp.length !== 1) {
                return res.status(200).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }
            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: dataObject?.txnid,
                optxid: dataObject?.optxid,
                amount: mainAmount,
                rrn: dataObject?.rrn
            }
            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        }
        // else if (dataObject.status == "1") {
        //     const release = await genPayoutMutex.acquire();
        //     const session = await mongoose.startSession();

        //     try {
        //         session.startTransaction();
        //         let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(
        //             getDocoment?._id,
        //             { isSuccess: "Failed" },
        //             { new: true, session }
        //         );

        //         // console.log(payoutModelData?.trxId, "with failed");

        //         let finalEwalletDeducted = payoutModelData?.afterChargeAmount;

        //         // Update user wallet
        //         let userWallet = await userDB.findByIdAndUpdate(
        //             payoutModelData?.memberId,
        //             { $inc: { EwalletBalance: +finalEwalletDeducted } },
        //             { returnDocument: "after", session }
        //         );

        //         if (!userWallet) {
        //             throw new Error("User wallet not found!");
        //         }

        //         let afterAmount = userWallet?.EwalletBalance;
        //         let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;

        //         let walletModelDataStore = {
        //             memberId: payoutModelData?.memberId,
        //             transactionType: "Cr.",
        //             transactionAmount: payoutModelData?.amount,
        //             beforeAmount: beforeAmount,
        //             chargeAmount: payoutModelData?.gatwayCharge,
        //             afterAmount: afterAmount,
        //             description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${payoutModelData?.trxId}`,
        //             transactionStatus: "Success",
        //         };

        //         // Store eWallet transaction
        //         await walletModel.create([walletModelDataStore], { session }); // Pass session

        //         // Commit the transaction
        //         await session.commitTransaction();
        //         session.endSession();

        //         return res.status(200).json({ message: "Failed", data: "Transaction processed successfully!" });
        //     } catch (error) {

        //         await session.abortTransaction();
        //         session.endSession();
        //         // console.error("Transaction failed:", error);
        //         return res.status(200).json({ message: "Error", error: error.message });
        //     } finally {
        //         release()
        //     }
        // }
        else {
            return res.status(200).json({ message: "Failed", data: "Trx Not Found !" })
        }
    } catch (error) {
        // console.log(" payOut.controller.js:3626 ~ jiffyCallbackResponse ~ error:", error);

        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})

export const callBackCollectPay = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        const Data = req.query;
        // console.log(Data, "data")
        // console.log(req.query, "req.query")

        const dataObject = { txnid: Data?.AgentTrasID, optxid: Data?.TransID, rrn: Data?.Bankrrn, status: Data?.Status }
        // console.log(dataObject, "callback iterate")

        let getDocoment = await payOutModelGenerate.findOne({ trxId: dataObject?.txnid });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (getDocoment && dataObject?.status.toLowerCase() === "success" && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            // let userWalletInfo = await userDB.findById(userInfo[0]?._id, "_id EwalletBalance");
            // let beforeAmountUser = userWalletInfo.EwalletBalance;
            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);
            if (userCallBackResp.length !== 1) {
                return res.status(200).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }
            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: dataObject?.txnid,
                optxid: dataObject?.optxid,
                amount: mainAmount,
                rrn: dataObject?.rrn
            }
            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        } else if (dataObject.status == "FAILURE") {
            const session = await mongoose.startSession();

            try {
                session.startTransaction();
                let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(
                    getDocoment?._id,
                    { isSuccess: "Failed" },
                    { new: true, session }
                );

                // console.log(payoutModelData?.trxId, "with failed");

                let finalEwalletDeducted = payoutModelData?.afterChargeAmount;

                // Update user wallet
                let userWallet = await userDB.findByIdAndUpdate(
                    payoutModelData?.memberId,
                    { $inc: { EwalletBalance: +finalEwalletDeducted } },
                    { returnDocument: "after", session }
                );

                if (!userWallet) {
                    throw new Error("User wallet not found!");
                }

                let afterAmount = userWallet?.EwalletBalance;
                let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;

                let walletModelDataStore = {
                    memberId: payoutModelData?.memberId,
                    transactionType: "Cr.",
                    transactionAmount: payoutModelData?.amount,
                    beforeAmount: beforeAmount,
                    chargeAmount: payoutModelData?.gatwayCharge,
                    afterAmount: afterAmount,
                    description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${payoutModelData?.trxId}`,
                    transactionStatus: "Success",
                };

                // Store eWallet transaction
                await walletModel.create([walletModelDataStore], { session }); // Pass session

                // Commit the transaction
                await session.commitTransaction();
                session.endSession();

                return res.status(200).json({ message: "Failed", data: "Transaction processed successfully!" });
            } catch (error) {

                await session.abortTransaction();
                session.endSession();
                // console.error("Transaction failed:", error);
                return res.status(200).json({ message: "Error", error: error.message });
            }
        } else {
            return res.status(200).json({ message: "Failed", data: "Trx Not Found !" })
        }
    } catch (error) {
        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})

export const webHookWaayupayImpactPeek = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        const Data = req.body;

        const dataObject = { txnid: Data?.ClientOrderId, optxid: Data?.OrderId, rrn: Data?.UTR, status: Data?.Status, statusCode: Data?.StatusCode }

        if (dataObject?.statusCode !== 1) {
            return res.status(400).json({ message: "Failed", data: `Not final Status : ${dataObject?.statusCode}` })
        }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: dataObject?.txnid });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (getDocoment && dataObject?.status == 1 && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);
            if (userCallBackResp.length !== 1) {
                return res.status(200).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }
            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: dataObject?.txnid,
                optxid: dataObject?.optxid,
                amount: mainAmount,
                rrn: dataObject?.rrn
            }
            try {
                axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        } else if (dataObject.status == 0 || dataObject.status == 4) {
            // console.log("inside the faliled", dataObject?.statusCode)
            const session = await mongoose.startSession();

            try {
                session.startTransaction();
                let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(
                    getDocoment?._id,
                    { isSuccess: "Failed" },
                    { new: true, session }
                );

                let finalEwalletDeducted = payoutModelData?.afterChargeAmount;

                // Update user wallet
                let userWallet = await userDB.findByIdAndUpdate(
                    payoutModelData?.memberId,
                    { $inc: { EwalletBalance: +finalEwalletDeducted } },
                    { returnDocument: "after", session }
                );

                if (!userWallet) {
                    throw new Error("User wallet not found!");
                }

                let afterAmount = userWallet?.EwalletBalance;
                let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;

                let walletModelDataStore = {
                    memberId: payoutModelData?.memberId,
                    transactionType: "Cr.",
                    transactionAmount: payoutModelData?.amount,
                    beforeAmount: beforeAmount,
                    chargeAmount: payoutModelData?.gatwayCharge,
                    afterAmount: afterAmount,
                    description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${payoutModelData?.trxId}`,
                    transactionStatus: "Success",
                };

                // Store eWallet transaction
                await walletModel.create([walletModelDataStore], { session }); // Pass session

                // Commit the transaction
                await session.commitTransaction();
                session.endSession();

                return res.status(200).json({ message: "Success", data: "Transaction processed successfully with Failed !" });
            } catch (error) {

                await session.abortTransaction();
                session.endSession();
                // console.error("Transaction failed:", error);
                return res.status(200).json({ message: "Error", error: error.message });
            }
        } else {
            return res.status(200).json({ message: "Failed", data: "Trx Not Found or Pending !" })
        }
    } catch (error) {
        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})

export const vaultagePayoutCallback = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        const { event, Data } = req.body
        const { RRN, Status, StatusCode, Message, ApiWalletTransactionId, APITransactionId } = Data;
        // const Data = req.body

        const dataObject = { systemGenTrxId: APITransactionId, optxid: ApiWalletTransactionId, rrn: RRN, status: Status }

        let getDocoment = await payOutModelGenerate.findOne({ systemTrxId: dataObject?.systemGenTrxId });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }

        if (getDocoment && dataObject?.status === "SUCCESS" && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: getDocoment?.trxId,
                systemTrxId: dataObject?.systemGenTrxId,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);

            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: getDocoment?.trxId,
                optxid: dataObject?.optxid,
                amount: mainAmount,
                rrn: dataObject?.rrn
            }
            try {
                const { data } = await axios.post(payOutUserCallBackURL, shareObjData, config)

            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        } else if (dataObject.status == "FAILED" || dataObject.status == "FAILURE" && getDocoment?.isSuccess === "Pending") {
            const session = await mongoose.startSession();

            try {
                session.startTransaction();
                let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(
                    getDocoment?._id,
                    { isSuccess: "Failed" },
                    { new: true, session }
                );

                // console.log(payoutModelData?.trxId, "with failed");

                let finalEwalletDeducted = payoutModelData?.afterChargeAmount;

                // Update user wallet
                let userWallet = await userDB.findByIdAndUpdate(
                    payoutModelData?.memberId,
                    { $inc: { EwalletBalance: +finalEwalletDeducted } },
                    { returnDocument: "after", session }
                );

                if (!userWallet) {
                    throw new Error("User wallet not found!");
                }

                let afterAmount = userWallet?.EwalletBalance;
                let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;

                let walletModelDataStore = {
                    memberId: payoutModelData?.memberId,
                    transactionType: "Cr.",
                    transactionAmount: payoutModelData?.amount,
                    beforeAmount: beforeAmount,
                    chargeAmount: payoutModelData?.gatwayCharge,
                    afterAmount: afterAmount,
                    description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${payoutModelData?.trxId}`,
                    transactionStatus: "Success",
                };

                // Store eWallet transaction
                await walletModel.create([walletModelDataStore], { session }); // Pass session

                // Commit the transaction
                await session.commitTransaction();
                session.endSession();

                try {
                    let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                        $unwind: {
                            path: "$payOutApi",
                            preserveNullAndEmptyArrays: true,
                        }
                    }, {
                        $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
                    }]);

                    let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);

                    let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
                    const config = {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };
                    let mainAmount = getDocoment?.amount;
                    let shareObjData = {
                        status: "FAILED",
                        txnid: getDocoment?.trxId,
                        optxid: dataObject?.optxid,
                        amount: mainAmount,
                        rrn: dataObject?.rrn
                    }
                    const { data } = await axios.post(payOutUserCallBackURL, shareObjData, config)

                } catch (error) {
                    null
                }
                return res.status(200).json({ message: "Failed", data: "Transaction processed successfully!" });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                // console.error("Transaction failed:", error);
                return res.status(200).json({ message: "Error", error: error.message });
            }
        }
        else {
            return res.status(200).json({ message: "Failed", data: "Trx Not Found !" })
        }
    } catch (error) {
        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})

export const callbackJiffyV2Mind = asyncHandler(async (req, res) => {
    // const release = await flipzikMutex.acquire()
    try {
        const Data = req.body

        const dataObject = { txnid: Data?.ref_id, optxid: Data?.transaction_id, rrn: Data?.utr, status: Data?.response_code }

        let getDocoment = await payOutModelGenerate.findOne({ trxId: dataObject?.txnid });

        if (getDocoment?.isSuccess === "Success" || getDocoment?.isSuccess === "Failed") {
            return res.status(200).json({ message: "Failed", data: `Trx Status Already ${getDocoment?.isSuccess}` })
        }
        dataObject.txnid = getDocoment?.trxId

        if (getDocoment && dataObject?.status == "0" && getDocoment?.isSuccess === "Pending") {
            getDocoment.isSuccess = "Success"
            await getDocoment.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: getDocoment?.memberId } }, { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } }, {
                $unwind: {
                    path: "$payOutApi",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "EwalletBalance": 1, "createdAt": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.apiURL": 1, "payOutApi.isActive": 1 }
            }]);

            let chargePaymentGatway = getDocoment?.gatwayCharge;
            let mainAmount = getDocoment?.amount;

            let finalEwalletDeducted = mainAmount + chargePaymentGatway;

            let payoutDataStore = {
                memberId: getDocoment?.memberId,
                amount: mainAmount,
                chargeAmount: chargePaymentGatway,
                finalAmount: finalEwalletDeducted,
                bankRRN: dataObject?.rrn,
                trxId: dataObject?.txnid,
                optxId: dataObject?.optxid,
                isSuccess: "Success"
            }
            await payOutModel.create(payoutDataStore)
            let userCallBackResp = await callBackResponse.aggregate([{ $match: { memberId: userInfo[0]?._id } }]);
            if (userCallBackResp.length !== 1) {
                return res.status(200).json({ message: "Failed", data: "User have multiple callback Url or Not Found !" })
            }
            let payOutUserCallBackURL = userCallBackResp[0]?.payOutCallBackUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            let shareObjData = {
                status: dataObject?.status,
                txnid: dataObject?.txnid,
                optxid: dataObject?.optxid,
                amount: mainAmount,
                rrn: dataObject?.rrn
            }
            try {
                await axios.post(payOutUserCallBackURL, shareObjData, config)
            } catch (error) {
                null
            }
            return res.status(200).json(new ApiResponse(200, null, "Successfully !"))
        }
        // else if (dataObject.status == "1") {
        //     const release = await genPayoutMutex.acquire();
        //     const session = await mongoose.startSession();

        //     try {
        //         session.startTransaction();
        //         let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(
        //             getDocoment?._id,
        //             { isSuccess: "Failed" },
        //             { new: true, session }
        //         );

        //         // console.log(payoutModelData?.trxId, "with failed");

        //         let finalEwalletDeducted = payoutModelData?.afterChargeAmount;

        //         // Update user wallet
        //         let userWallet = await userDB.findByIdAndUpdate(
        //             payoutModelData?.memberId,
        //             { $inc: { EwalletBalance: +finalEwalletDeducted } },
        //             { returnDocument: "after", session }
        //         );

        //         if (!userWallet) {
        //             throw new Error("User wallet not found!");
        //         }

        //         let afterAmount = userWallet?.EwalletBalance;
        //         let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;

        //         let walletModelDataStore = {
        //             memberId: payoutModelData?.memberId,
        //             transactionType: "Cr.",
        //             transactionAmount: payoutModelData?.amount,
        //             beforeAmount: beforeAmount,
        //             chargeAmount: payoutModelData?.gatwayCharge,
        //             afterAmount: afterAmount,
        //             description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${payoutModelData?.trxId}`,
        //             transactionStatus: "Success",
        //         };

        //         // Store eWallet transaction
        //         await walletModel.create([walletModelDataStore], { session }); // Pass session

        //         // Commit the transaction
        //         await session.commitTransaction();
        //         session.endSession();

        //         return res.status(200).json({ message: "Failed", data: "Transaction processed successfully!" });
        //     } catch (error) {

        //         await session.abortTransaction();
        //         session.endSession();
        //         // console.error("Transaction failed:", error);
        //         return res.status(200).json({ message: "Error", error: error.message });
        //     } finally {
        //         release()
        //     }
        // }
        else {
            return res.status(200).json({ message: "Failed", data: "Trx Not Found !" })
        }
    } catch (error) {
        // console.log(" payOut.controller.js:3626 ~ jiffyCallbackResponse ~ error:", error);

        return res.status(200).json({ message: "Failed", data: "Internel server Error !" })
    }
    // finally {
    // release()
    // }
})