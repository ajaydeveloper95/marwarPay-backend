import axios from "axios";
import qrGenerationModel from "../../models/qrGeneration.model.js";
import payInModel from "../../models/payIn.model.js";
import upiWalletModel from "../../models/upiWallet.model.js";
import userDB from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import callBackResponseModel from "../../models/callBackResponse.model.js";
import FormData from "form-data";
import { Mutex } from "async-mutex";
// import { getPaginationArray } from "../../utils/helpers.js";
import mongoose from "mongoose";
import razorpay from "../../utils/RazorPay.js";
import { Parser } from 'json2csv';
// import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";
import oldQrGenerationModel from "../../models/oldQrGeneration.model.js";
import SambhavPay from "./sambhavPay.controller.js";
import packageModel from "../../models/package.model.js";
import payInChargeModel from "../../models/payInCharge.model.js";
import crypto from "crypto"
import { airPaydecryptText, airPayencryptText } from "../../utils/CryptoEnc.js";
import SambhavPayin from '../../utils/SambhavPay.js'

const transactionMutex = new Mutex();
// const generatePayinMutex = new Mutex();
const razorPayMutex = new Mutex();
const iSmartMutex = new Mutex();

// export const allGeneratedPayment = asyncHandler(async (req, res) => {
//     let { page = 1, limit = 25, keyword = "", startDate, endDate, memberId, export: exportToCSV } = req.query;
//     page = Number(page) || 1;
//     limit = Number(limit) || 25;
//     const trimmedKeyword = keyword.trim();
//     const trimmedMemberId = memberId && mongoose.Types.ObjectId.isValid(memberId)
//         ? new mongoose.Types.ObjectId(String(memberId.trim()))
//         : null;

//     let dateFilter = {};
//     if (startDate) {
//         dateFilter.$gte = new Date(startDate);
//     }
//     if (endDate) {
//         endDate = new Date(endDate);
//         endDate.setHours(23, 59, 59, 999);
//         dateFilter.$lt = new Date(endDate);
//     }

//     let matchFilters = {
//         ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
//         ...(trimmedKeyword && {
//             $or: [
//                 { trxId: { $regex: trimmedKeyword, $options: "i" } },
//                 { payerName: { $regex: trimmedKeyword, $options: "i" } },
//             ]
//         }),
//         ...(trimmedMemberId && { memberId: trimmedMemberId })
//     };
//     try {
//         const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;
//         const aggregationPipeline = [
//             {
//                 $match: matchFilters
//             },
//             { $sort: { createdAt: sortDirection } },

//             ...(exportToCSV != "true"
//                 ? [
//                     { $skip: (page - 1) * limit },
//                     { $limit: limit }
//                 ]
//                 : []),

//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "memberId",
//                     foreignField: "_id",
//                     pipeline: [
//                         { $project: { userName: 1, fullName: 1, memberId: 1 } }
//                     ],
//                     as: "userInfo"
//                 }
//             },

//             {
//                 $unwind: {
//                     path: "$userInfo",
//                     preserveNullAndEmptyArrays: false
//                 }
//             },

//             {
//                 $project: {
//                     "_id": 1,
//                     "trxId": 1,
//                     "amount": 1,
//                     "name": 1,
//                     "callBackStatus": 1,
//                     "qrData": 1,
//                     "refId": 1,
//                     "createdAt": 1,
//                     "userInfo.userName": 1,
//                     "userInfo.fullName": 1,
//                     "userInfo.memberId": 1
//                 }
//             }
//         ];

//         let payments = exportToCSV != "true" ? await qrGenerationModel.aggregate(aggregationPipeline).allowDiskUse(true) : await oldQrGenerationModel.aggregate(aggregationPipeline).allowDiskUse(true);

//         const totalDocs = exportToCSV === "true" ? payments.length : await qrGenerationModel.countDocuments(matchFilters);

//         if (exportToCSV === "true") {
//             const fields = [
//                 "_id",
//                 "trxId",
//                 "amount",
//                 "name",
//                 "callBackStatus",
//                 "qrData",
//                 "refId",
//                 "createdAt",
//                 "userInfo.userName",
//                 "userInfo.fullName",
//                 "userInfo.memberId"
//             ];
//             const json2csvParser = new Parser({ fields });
//             const csv = json2csvParser.parse(payments);

//             res.header('Content-Type', 'text/csv');
//             res.attachment('payments.csv');

//             return res.status(200).send(csv);
//         }

//         if (!payments || payments.length === 0) {
//             return res.status(200).json({ message: "Success", data: "No Transaction Available!" });
//         }

//         res.status(200).json(new ApiResponse(200, payments, totalDocs));
//     } catch (err) {
//         res.status(500).json({
//             message: "Failed",
//             data: `Internal Server Error: ${err.message}`,
//         });
//     }
// });

export const allGeneratedPayment = asyncHandler(async (req, res) => {
    let { page = 1, limit = 25, keyword = "", startDate, endDate, memberId, export: exportToCSV } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const trimmedMemberId = memberId && mongoose.Types.ObjectId.isValid(memberId)
        ? new mongoose.Types.ObjectId(String(memberId.trim()))
        : null;

    let dateFilter = {};
    if (startDate) {
        dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lt = new Date(endDate);
    }

    let matchFilters = {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { trxId: { $regex: trimmedKeyword, $options: "i" } },
                { payerName: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(trimmedMemberId && { memberId: trimmedMemberId })
    };

    try {
        const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

        // Compute Success Rate Per Minute
        const successRatePipeline = [
            { $match: matchFilters },
            {
                $group: {
                    _id: {
                        minute: { $minute: "$updatedAt" },
                        hour: { $hour: "$updatedAt" },
                        day: { $dayOfMonth: "$updatedAt" },
                        month: { $month: "$updatedAt" },
                        year: { $year: "$updatedAt" }
                    },
                    successCount: {
                        $sum: { $cond: [{ $eq: ["$callBackStatus", "Success"] }, 1, 0] }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: 1 },
                    totalSuccess: { $sum: "$successCount" }
                }
            },
            {
                $project: {
                    successRatePerMinute: {
                        $cond: [
                            { $gt: ["$totalMinutes", 0] },
                            { $divide: ["$totalSuccess", "$totalMinutes"] },
                            0
                        ]
                    }
                }
            }
        ];

        const aggregationOptions = {
            readPreference: 'secondaryPreferred'
        };

        const successRateResult = await qrGenerationModel.aggregate(successRatePipeline, aggregationOptions).allowDiskUse(true);
        const successRatePerMinute = successRateResult.length > 0 ? successRateResult[0].successRatePerMinute : 0;

        // Fetch paginated results
        const aggregationPipeline = [
            {
                $match: matchFilters
            },
            { $sort: { createdAt: sortDirection } },

            ...(exportToCSV != "true"
                ? [
                    { $skip: (page - 1) * limit },
                    { $limit: limit }
                ]
                : []),

            {
                $lookup: {
                    from: "users",
                    localField: "memberId",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { userName: 1, fullName: 1, memberId: 1 } }
                    ],
                    as: "userInfo"
                }
            },

            {
                $unwind: {
                    path: "$userInfo",
                    preserveNullAndEmptyArrays: false
                }
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
                    "amount": 1,
                    "name": 1,
                    "callBackStatus": 1,
                    "qrData": 1,
                    "refId": 1,
                    "createdAt": 1,
                    "userInfo.userName": 1,
                    "userInfo.fullName": 1,
                    "userInfo.memberId": 1,
                    "pannelUse": 1
                }
            }
        ];

        // let payments = exportToCSV != "true" ? await qrGenerationModel.aggregate(aggregationPipeline, aggregationOptions).allowDiskUse(true) : await oldQrGenerationModel.aggregate(aggregationPipeline, aggregationOptions).allowDiskUse(true);
        let payments
        if (exportToCSV == "true") {
            let newPayments = await qrGenerationModel.aggregate(aggregationPipeline, aggregationOptions).allowDiskUse(true)
            let oldPayments = await oldQrGenerationModel.aggregate(aggregationPipeline, aggregationOptions).allowDiskUse(true)
            payments = [...oldPayments, ...newPayments]

        } else {
            payments = await qrGenerationModel.aggregate(aggregationPipeline, aggregationOptions).allowDiskUse(true)
        }
        const totalDocs = exportToCSV === "true" ? payments.length : await qrGenerationModel.countDocuments(matchFilters);

        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "trxId",
                "amount",
                "name",
                "callBackStatus",
                "qrData",
                "refId",
                "createdAt",
                "userInfo.userName",
                "userInfo.fullName",
                "userInfo.memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(payments);

            res.header('Content-Type', 'text/csv');
            res.attachment('payments.csv');

            return res.status(200).send(csv);
        }

        if (!payments || payments.length === 0) {
            return res.status(200).json({ message: "Success", data: "No Transaction Available!" });
        }

        res.status(200).json(new ApiResponse(200, payments, totalDocs, { successRatePerMinute }));
    } catch (err) {
        res.status(500).json({
            message: "Failed",
            data: `Internal Server Error: ${err.message}`,
        });
    }
});

export const allSuccessPayment = asyncHandler(async (req, res) => {
    let { page = 1, limit = 25, keyword = "", startDate, endDate, memberId, export: exportToCSV, timezoneOffset = 0 } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;

    const trimmedMemberId = memberId && mongoose.Types.ObjectId.isValid(memberId)
        ? new mongoose.Types.ObjectId(String(memberId.trim()))
        : null;

    let dateFilter = {};
    const offsetMillis = timezoneOffset * 60 * 1000;

    if (startDate) {
        let start = new Date(startDate); // Convert to Date object
        start.setUTCHours(0, 0, 0, 0); // Start of day in local timezone
        start = new Date(start.getTime() + offsetMillis); // Convert to UTC
        dateFilter.$gte = start;
    }

    if (endDate) {
        let end = new Date(endDate); // Convert to Date object
        end.setUTCHours(23, 59, 59, 999); // End of day in local timezone
        end = new Date(end.getTime() + offsetMillis); // Convert to UTC
        dateFilter.$lte = end;
    }

    // if (startDate) {
    //     let start = new Date(startDate + "T00:00:00");
    //     start.setMinutes(start.getMinutes() - timezoneOffset);
    //     dateFilter.$gte = start;
    // }

    // if (endDate) {
    //     let end = new Date(endDate + "T23:59:59.999");
    //     end.setMinutes(end.getMinutes() - timezoneOffset);
    //     dateFilter.$lt = end;
    // }

    let matchFilters = {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { trxId: { $regex: trimmedKeyword, $options: "i" } },
                { payerName: { $regex: trimmedKeyword, $options: "i" } },
                { bankRRN: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(trimmedMemberId && { memberId: trimmedMemberId })
    };
    const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

    let paymentQuery = [
        { $match: matchFilters },
        { $sort: { createdAt: sortDirection } },
        ...(exportToCSV != "true"
            ? [
                { $skip: skip },
                { $limit: limit }
            ]
            : []),
        {
            $lookup: {
                from: "users",
                localField: "memberId",
                foreignField: "_id",
                pipeline: [
                    { $project: { userName: 1, fullName: 1, memberId: 1 } }
                ],
                as: "userInfo"
            }
        },
        {
            $unwind: {
                path: "$userInfo",
                preserveNullAndEmptyArrays: false
            }
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
                "amount": 1,
                "chargeAmount": 1,
                "finalAmount": 1,
                "payerName": 1,
                "isSuccess": 1,
                "vpaId": 1,
                "bankRRN": 1,
                "createdAt": 1,
                "userInfo.userName": 1,
                "userInfo.fullName": 1,
                "userInfo.memberId": 1
            }
        }
    ];

    try {
        const aggregationOptions = {
            readPreference: 'secondaryPreferred'
        };

        let payments = await payInModel.aggregate(paymentQuery, aggregationOptions).allowDiskUse(true);

        if (!payments || payments.length === 0) {
            return res.status(200).json({ message: "Success", data: "No Transaction Available!" });
        }

        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "trxId",
                "amount",
                "chargeAmount",
                "finalAmount",
                "payerName",
                "isSuccess",
                "vpaId",
                "bankRRN",
                "createdAt",
                "userInfo.userName",
                "userInfo.fullName",
                "userInfo.memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(payments);

            res.header('Content-Type', 'text/csv');
            res.attachment(`payments-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }


        const totalDocs = await payInModel.countDocuments(matchFilters);

        res.status(200).json(new ApiResponse(200, payments, totalDocs));
    } catch (err) {
        res.status(500).json({ message: "Failed", data: `Internal Server Error: ${err.message}` });
    }
});

export const generatePayment = async (req, res) => {
    try {
        const { userName, authToken, name, amount, trxId, mobileNumber, email } = req.body
        // const tempTransaction = await qrGenerationModel.findOne({ trxId })
        // const tempOldTransaction = await oldQrGenerationModel.findOne({ trxId })
        // if (tempTransaction || tempOldTransaction) return res.status(400).json({ message: "Failed", data: "Transaction Id alrteady exists !" })
        // if (tempTransaction) return res.status(400).json({ message: "Failed", data: "Transaction Id alrteady exists !" })
        let user = await userDB.aggregate([{ $match: { $and: [{ userName: userName }, { trxAuthToken: authToken }, { isActive: true }] } }, { $lookup: { from: "payinswitches", localField: "payInApi", foreignField: "_id", as: "payInApi" } }, {
            $unwind: {
                path: "$payInApi",
                preserveNullAndEmptyArrays: true,
            }
        }])

        if (user.length === 0) {
            return res.status(400).json({ message: "Failed", data: "Incorrect package configuration Please Try again !" })
        }

        const userPackageId = user[0]?.package?.toString();
        if (!userPackageId) {
            return res.status(400).json({ message: "Failed", data: "User package not found!" });
        }

        const pack = await packageModel.findById(userPackageId).lean();
        if (!pack) {
            return res.status(400).json({ message: "Failed", data: "Package not found, please connect to admin!" });
        }

        const packagePayInChargeId = pack.packagePayInCharge?.toString();
        if (!packagePayInChargeId) {
            return res.status(400).json({ message: "Failed", data: "Payin package not found, please connect to admin!" });
        }

        const payinPackage = await payInChargeModel.findById(packagePayInChargeId).lean();
        if (!payinPackage) {
            return res.status(400).json({ message: "Failed", data: "Payin package not found, please connect to admin!" });
        }

        const charge = payinPackage.payInChargeRange?.find(range =>
            amount >= range.lowerLimit && amount < range.upperLimit
        );

        if (!charge) {
            return res.status(400).json({ message: "Failed", data: "Charge not found for the given amount, limit exceed" });
        }

        // let apiSwitchApiOption = "vaultagePayIn";
        let apiSwitchApiOption = user[0]?.payInApi?.apiName;
        switch (apiSwitchApiOption) {
            case "neyopayPayIn":
                let url = user[0].payInApi.apiURL
                let formData = new FormData()
                formData.append("amount", amount)
                formData.append("Apikey", "14205")
                formData.append("url", "https://zanithpay.com")
                formData.append("transactionId", trxId)
                formData.append("mobile", mobileNumber)

                // store database
                await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId, pannelUse: apiSwitchApiOption }).then(async (data) => {
                    // Bankking api calling !
                    let resp = await axios.post(url, formData)

                    let dataApiResponse = {
                        status_msg: resp?.data?.message,
                        status: resp?.data?.status == true ? 200 : 400,
                        qrImage: resp?.data?.Payment_link,
                        trxID: trxId,
                    }

                    if (resp?.data?.status !== true) {
                        data.callBackStatus = "Failed";
                        await data.save();
                        return res.status(400).json({ message: "Failed", data: dataApiResponse })
                    } else {
                        data.qrData = resp?.data?.Payment_link;
                        data.refId = resp?.data?.refId;
                        await data.save();
                    }

                    // Send response
                    return res.status(200).json(new ApiResponse(200, dataApiResponse))
                }).catch((error) => {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: "Internel Server Error !" })
                    }
                })
                break;
            case "impactpeaksoftwareApi":
                // store database
                await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId, pannelUse: apiSwitchApiOption }).then(async (data) => {
                    // Banking Api
                    let API_URL = `https://impactpeaksoftware.in/portal/api/generateQrAuth?memberid=IMPSAPI837165&txnpwd=8156&name=${name}&mobile=${mobileNumber}&amount=${amount}&txnid=${trxId}`
                    let bank = await axios.get(API_URL);

                    let dataApiResponse = {
                        status_msg: bank?.data?.status_msg,
                        status: bank?.data?.status_code,
                        qrImage: bank?.data?.qr_image,
                        qr: bank?.data?.intent,
                        trxID: data?.trxId,
                    }

                    if (bank?.data?.status_code !== 200) {
                        data.callBackStatus = "Failed";
                        await data.save();
                        return res.status(400).json({ message: "Failed", data: dataApiResponse })
                    } else {
                        data.qrData = bank?.data?.qr_image;
                        data.qrIntent = bank?.data?.intent;
                        data.refId = bank?.data?.refId;
                        await data.save();
                    }

                    // Send response
                    return res.status(200).json(new ApiResponse(200, dataApiResponse))
                }).catch((error) => {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                })
                break;
            case "proconceptPayIn":
                // store database
                let proconceptPayload = {
                    authKey: process?.env?.proconceptKey,
                    orderid: trxId,
                    amount: amount,
                    name: name
                }

                let proconceptHeader = {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }

                await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId, pannelUse: apiSwitchApiOption }).then(async (data) => {
                    // Banking Api
                    let API_URL = user[0]?.payInApi?.apiURL
                    let bank = await axios.post(API_URL, proconceptPayload, proconceptHeader);
                    let dataApiResponse = {
                        status_msg: bank?.data?.status_msg,
                        status: bank?.data?.status_code,
                        qrImage: bank?.data?.qr_image,
                        qr: bank?.data?.Intent,
                        trxID: data?.txnID,
                    }

                    if (bank?.data?.status_code != 200) {
                        data.callBackStatus = "Failed";
                        await data.save();
                        return res.status(400).json({ message: "Failed", data: dataApiResponse })
                    } else {
                        data.qrData = bank?.data?.qr_image;
                        data.qrIntent = bank?.data?.Intent;
                        data.refId = bank?.data?.refId;
                        await data.save();
                    }

                    // Send response
                    return res.status(200).json(new ApiResponse(200, dataApiResponse))
                }).catch((error) => {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                })
                break;
            case "comprismoPayIn":
                // store database
                let comprismoPayload = {
                    userName: process?.env?.COMPRISMO_USERNAME,
                    authToken: process?.env?.COMPRISMO_TRX_TOKEN,
                    trxId: trxId,
                    amount: amount,
                    name: name,
                    mobileNumber: mobileNumber,
                }

                let comprismoHeader = {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }

                await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId, pannelUse: apiSwitchApiOption }).then(async (data) => {
                    // Banking Api
                    let API_URL = user[0]?.payInApi?.apiURL
                    let bank = await axios.post(API_URL, comprismoPayload, comprismoHeader);
                    let dataApiResponse = {
                        status_msg: bank?.data?.data?.status_msg,
                        status: bank?.data?.data?.status,
                        qrImage: bank?.data?.data?.qrImage,
                        qr: bank?.data?.data?.qr,
                        trxID: data?.trxID,
                    }

                    if (bank?.data?.data?.status != 200) {
                        data.callBackStatus = "Failed";
                        await data.save();
                        return res.status(400).json({ message: "Failed", data: dataApiResponse })
                    } else {
                        data.qrData = bank?.data?.data?.qrImage;
                        data.qrIntent = bank?.data?.data?.qr;
                        data.refId = bank?.data?.data?.refId;
                        await data.save();
                    }

                    // Send response
                    return res.status(200).json(new ApiResponse(200, dataApiResponse))
                }).catch((error) => {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                })
                break;
            case "razorpayPayIn":
                try {
                    const paymentData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });

                    const rzOptions = {
                        upi_link: true,
                        amount: Number(amount * 100),
                        currency: "INR",
                        accept_partial: false,
                        // first_min_partial_amount: 0,
                        reference_id: trxId,
                        description: "For XYZ purpose",
                        customer: {
                            name: name,
                            email: "gaurav.kumar@example.com",
                            contact: mobileNumber
                        },
                        notify: {
                            sms: true,
                            email: true
                        },
                        reminder_enable: true,
                        notes: {
                            policy_name: "Jeevan Bima"
                        }
                    }
                    const paymentLink = await razorpay.paymentLink.create(rzOptions);

                    paymentData.qrData = paymentLink.short_url;
                    paymentData.refId = paymentLink.id;
                    await paymentData.save();

                    return res.status(200).json(new ApiResponse(200, {
                        status_msg: "Payment link generated successfully",
                        status: 200,
                        qrIntent: paymentLink.short_url,
                        qrImage: paymentLink.short_url,
                        trxID: trxId,
                    }));
                } catch (error) {
                    console.error("Error creating Razorpay payment link:", error);

                    if (error.code === 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate found!" });
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.description || "Internal Server Error!" });
                    }
                }
                break;
            case "vaultagePayIn":
                try {
                    const qrData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });

                    const vaultagePayload = {
                        amount,
                        Email: email,
                        ReferenceId: trxId,
                        Phone: mobileNumber,
                        Name: name
                    }

                    const vaultageHeader = {
                        AuthKey: process.env.VAULTAGE_AUTH_KEY,
                        IPAddress: process.env.VAULTAGE_IP_ADDRESS,
                    }

                    const API_URL = user[0]?.payInApi?.apiURL

                    const { data: vaultageResponse } = await axios.post(API_URL, vaultagePayload, { headers: vaultageHeader });

                    let apiResponse = {}
                    if (vaultageResponse?.responseCode === 200 && vaultageResponse?.message === "SUCCESS") {
                        qrData.qrIntent = vaultageResponse?.data?.qr;
                        qrData.refId = vaultageResponse?.data?.walletTransactionId;
                        qrData.save();
                        apiResponse.status_msg = vaultageResponse?.message;
                        apiResponse.status = vaultageResponse?.responseCode;
                        apiResponse.qr = vaultageResponse?.data?.qr?.replace(/\s+/g, '');
                        apiResponse.trxID = trxId;
                    } else {
                        qrData.callBackStatus = "Failed";
                        qrData.save();
                        apiResponse = {
                            status_msg: vaultageResponse?.message || "FAILED",
                            status: vaultageResponse?.responseCode || 500,
                            trxID: trxId,
                        }
                    }
                    return res.status(vaultageResponse?.responseCode || 500).json(new ApiResponse(vaultageResponse?.responseCode || 500, apiResponse, undefined, vaultageResponse?.message === "SUCCESS" ? "Success" : "Failed"));
                } catch (error) {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                }
            case "vaultagePayInTest":
                try {
                    const qrData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });

                    const vaultagePayload = {
                        amount,
                        Email: email,
                        ReferenceId: trxId,
                        Phone: mobileNumber,
                        Name: name
                    }

                    const vaultageHeader = {
                        AuthKey: process.env.VAULTAGE_AUTH_KEY_TEST,
                        IPAddress: process.env.VAULTAGE_IP_ADDRESS,
                    }

                    const API_URL = user[0]?.payInApi?.apiURL

                    const { data: vaultageResponse } = await axios.post(API_URL, vaultagePayload, { headers: vaultageHeader });

                    let apiResponse = {}
                    if (vaultageResponse?.responseCode === 200 && vaultageResponse?.message === "SUCCESS") {
                        qrData.qrIntent = vaultageResponse?.data?.qr;
                        qrData.refId = vaultageResponse?.data?.walletTransactionId;
                        qrData.save();
                        apiResponse.status_msg = vaultageResponse?.message;
                        apiResponse.status = vaultageResponse?.responseCode;
                        apiResponse.qr = vaultageResponse?.data?.qr;
                        apiResponse.trxID = trxId;
                    } else {
                        qrData.callBackStatus = "Failed";
                        qrData.save();
                        apiResponse = {
                            status_msg: vaultageResponse?.message || "FAILED",
                            status: vaultageResponse?.responseCode || 500,
                            trxID: trxId,
                        }
                    }
                    return res.status(vaultageResponse?.responseCode || 500).json(new ApiResponse(vaultageResponse?.responseCode || 500, apiResponse, undefined, vaultageResponse?.message === "SUCCESS" ? "Success" : "Failed"));
                } catch (error) {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                }
            case "sambhavPayIn":
                try {
                    const qrData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });
                    const api_url = user[0]?.payInApi?.apiURL
                    const sambhavPayload = {
                        orderNo: trxId,
                        amount: String(amount),
                        emailId: email,
                        mobileNo: mobileNumber,
                        customerName: name,
                        api_url,
                        mid: process.env.SAMBHAVPAY_MID,
                        secretKey: process.env.SAMBHAVPAY_SECRET_KEY,
                        saltKey: process.env.SAMBHAVPAY_SALT_KEY
                    }

                    const response = await sambhavPayin(sambhavPayload);

                    let apiResponse = {}
                    if (response?.status === false) {
                        qrData.callBackStatus = "Failed";
                        qrData.save();
                        apiResponse = {
                            status_msg: response?.message || "FAILED",
                            status: 500,
                            trxID: trxId,
                        }
                    } else {
                        qrData.qrIntent = response?.upiString;
                        qrData.refId = response?.txnRefNo;
                        qrData.save();
                        apiResponse.status_msg = response?.respMessage;
                        apiResponse.status = 200;
                        apiResponse.qr = response?.upiString;
                        apiResponse.trxID = trxId;
                    }
                    return res.status(apiResponse.status || 500).json(new ApiResponse(apiResponse.status || 500, apiResponse, undefined, response?.respMessage === "FAILURE" ? "Failed" : "Success"));
                } catch (error) {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                }
            case "sambhavPayInESRGMG":
                try {
                    const qrData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });
                    const api_url = user[0]?.payInApi?.apiURL
                    const sambhavPayload = {
                        orderNo: trxId,
                        amount: String(amount),
                        emailId: email,
                        mobileNo: mobileNumber,
                        customerName: name,
                        api_url,
                        mid: process.env.SAMBHAVPAY_ESRGMG_MID,
                        secretKey: process.env.SAMBHAVPAY_ESRGMG_SECRET_KEY,
                        saltKey: process.env.SAMBHAVPAY_ESRGMG_SALT_KEY
                    }

                    const response = await sambhavPayin2(sambhavPayload);

                    let apiResponse = {}
                    if (response?.status === false) {
                        qrData.callBackStatus = "Failed";
                        qrData.save();
                        apiResponse = {
                            status_msg: response?.message || "FAILED",
                            status: 500,
                            trxID: trxId,
                        }
                    } else {
                        qrData.qrIntent = response?.upiString;
                        qrData.refId = response?.txnRefNo;
                        qrData.save();
                        apiResponse.status_msg = response?.respMessage;
                        apiResponse.status = 200;
                        apiResponse.qr = response?.upiString;
                        apiResponse.trxID = trxId;
                    }
                    return res.status(apiResponse.status || 500).json(new ApiResponse(apiResponse.status || 500, apiResponse, undefined, response?.respMessage === "FAILURE" ? "Failed" : "Success"));
                } catch (error) {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                }
            case "jiffyWalletPayinMind": {
                try {
                    const qrData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });
                    const API_URL = user[0]?.payInApi?.apiURL
                    const jiffyWalletPayload = {
                        merchant_reference_id: trxId,
                        amount,
                        currency: "INR",
                        service: "upi",
                        MerchantId: process.env.JIFFY_WALLET_MERCHANT_ID,
                        Password: process.env.JIFFY_WALLET_MERCHANT_PASSWORD,
                        service_details: {
                            upi: {
                                channel: "UPI_INTENT"
                            }
                        },
                        customer_details: {
                            customer_mobile: mobileNumber,
                            customer_name: name,
                            customer_email: email
                        },
                        device_details: {
                            device_name: "Desktop",
                            device_id: "hdbjkcndfs34234",
                            device_ip: process.env.VAULTAGE_IP_ADDRESS,
                        },
                        geo_location: {
                            latitude: "26.949498",
                            longitude: "75.710887"
                        },
                        webhook_url: "https://api.zanithpay.com/apiAdmin/v1/payin/callBackJiffy"
                    }

                    const headers = {
                        AuthToken: process.env.JIFFY_WALLET_AUTH_TOKEN,
                        IpAddress: process.env.VAULTAGE_IP_ADDRESS
                    }

                    const { data } = await axios.post(API_URL, jiffyWalletPayload, { headers });
                    let apiResponse = {}
                    if (data.response?.data === null) {
                        qrData.callBackStatus = "Failed";
                        qrData.save();
                        apiResponse = {
                            status_msg: data.response?.message || "FAILED",
                            status: 500,
                            trxID: trxId,
                        }
                    } else if (data.response.data !== null) {
                        const metaData = data.response?.data?.data
                        qrData.qrIntent = metaData?.payload?.url;
                        qrData.refId = metaData?.apx_payment_id;
                        qrData.save();
                        apiResponse.status_msg = metaData?.meta?.message;
                        apiResponse.status = 200;
                        apiResponse.qr = metaData?.payload?.url;
                        apiResponse.trxID = trxId;
                    }
                    return res.status(apiResponse.status || 500).json(new ApiResponse(apiResponse.status || 500, apiResponse, undefined, apiResponse.status !== 200 ? "Failed" : "Success"));
                } catch (error) {
                    return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                }
            }
            case "airpayPayin": {
                try {
                    const qrData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });
                    const API_URL = user[0]?.payInApi?.apiURL
                    const username = process?.env?.AIRPAY_USERNAME;
                    const password = process?.env?.AIRPAY_PASSWORD;
                    const secret = process?.env?.AIRPAY_SECRET;
                    const mercid = process?.env?.AIRPAY_MERCHANT_ID;

                    const key256 = crypto
                        .createHash("sha256")
                        .update(`${username}~:~${password}`)
                        .digest("hex");

                    const orderid = trxId;
                    const amt = amount;
                    const buyerPhone = mobileNumber;
                    const buyerEmail = email;
                    const mer_dom = "aHR0cHM6Ly9taW5kbWF0cml4MTEuY29t";
                    const call_type = "upiqr";

                    const alldata = `${mercid}${orderid}${amt}${buyerPhone}${buyerEmail}${mer_dom}${call_type}${new Date()
                        .toISOString()
                        .slice(0, 10)}`;

                    const checksum = crypto
                        .createHash("sha256")
                        .update(`${key256}@${alldata}`)
                        .digest("hex");

                    const fields = {
                        mercid: mercid,
                        orderid: orderid,
                        amount: amt,
                        buyerPhone: buyerPhone,
                        buyerEmail: buyerEmail,
                        mer_dom: mer_dom,
                        call_type: call_type,
                    };

                    const json_data = JSON.stringify(fields);
                    const encKey = crypto.createHash("md5").update(secret).digest("hex");

                    const encData = airPayencryptText(json_data, encKey);

                    const post_fields = JSON.stringify({
                        encData: encData,
                        checksum: checksum,
                        mercid: mercid,
                    });

                    const response = await axios.post("https://payments.airpay.co.in/api/generateUpiQr.php", post_fields, {
                        headers: {
                            "Content-Type": "application/json",
                        }
                    }
                    )

                    const encryptedDataAirpay = response?.data?.data;
                    let decryptedString = airPaydecryptText(encryptedDataAirpay, encKey);
                    let decryptedResp = JSON.parse(decryptedString);

                    let dataApiResponse = {
                        status_msg: decryptedResp?.status == 200 ? "generated" : "failed",
                        status: decryptedResp?.status,
                        qrImage: decryptedResp?.QRCODE_STRING,
                        qr: decryptedResp?.QRCODE_STRING,
                        trxID: qrData?.trxID,
                    }

                    if (decryptedResp?.status != 200) {
                        qrData.callBackStatus = "Failed";
                        await qrData.save();
                        return res.status(400).json({ message: "Failed", data: dataApiResponse })
                    } else {
                        qrData.qrData = decryptedResp?.QRCODE_STRING;
                        qrData.qrIntent = decryptedResp?.QRCODE_STRING;
                        qrData.refId = decryptedResp?.RID;
                        await qrData.save();
                    }

                    // Send response
                    return res.status(200).json(new ApiResponse(200, dataApiResponse))
                } catch (error) {
                    if (error.code == 11000) {
                        return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                    } else {
                        return res.status(500).json({ message: "Failed", data: error.message || "Internel Server Error !" })
                    }
                }
            }
            case "ServerMaintenance":
                let serverResp = {
                    status_msg: "Server Under Maintenance !",
                    status: 400,
                    trxID: trxId,
                }
                return res.status(400).json({ message: "Failed", data: serverResp })
            case "iSmartPayPayin":
                try {
                    const paymentData = await qrGenerationModel.create({
                        memberId: user[0]?._id,
                        name,
                        amount,
                        trxId,
                        pannelUse: apiSwitchApiOption
                    });
                    const iSmartPayUrl = process.env.ISMART_PAY_PAYIN_URL
                    // const iSmartPayload = {
                    //     "currency": "INR",
                    //     "amount": amount,
                    //     "order_id": trxId,
                    //     "email": "wwee@gg.com",
                    //     "mobile": mobileNumber,
                    //     "name": name,
                    //     "redirect_url": "https://www.google.com/",
                    //     "webhook_url": " https://2958-182-69-106-224.ngrok-free.app/apiAdmin/v1/payin/iSmartPayWebhook",
                    //     // "utf": {
                    //     //     "customer_id": "97987",
                    //     //     "hash_key": "ATRN090HKJHT9TVHVJ"
                    //     // }
                    // }
                    const iSmartPayload = {
                        "currency": "INR",
                        "amount": amount,
                        "order_id": trxId,
                        "email": email,
                        "mobile": mobileNumber,
                        "name": name,
                        "redirect_url": "https://www.google.com/",
                        // "webhook_url": `${process.env.BASE_URL}apiAdmin/v1/payin/iSmartPayWebhook`,
                        "webhook_url": `https://c508-183-83-53-236.ngrok-free.app/apiAdmin/v1/payin/iSmartPayWebhook`,
                        "pay_type": "UPI",
                        "vpa": "abc@icici"
                    }
                    // "utf":{
                    //     "customer_id":"97987",
                    //     "hash_key":"ATRN090HKJHT9TVHVJ"
                    // }
                    const iSmartHeader = {
                        headers: {
                            'mid': process.env.ISMART_PAY_MID,
                            'key': process.env.ISMART_PAY_ID
                        }
                    }
                    const iSmartResponse = await axios.post(iSmartPayUrl, iSmartPayload, iSmartHeader)

                    if (iSmartResponse?.data?.status) {
                        paymentData.qrData = iSmartResponse?.data?.payment_url;
                        paymentData.refId = iSmartResponse?.data?.transaction_id;
                        await paymentData.save();
                        return res.status(200).json(new ApiResponse(200, {
                            status_msg: "Payment link generated successfully",
                            status: 200,
                            qrImage: iSmartResponse?.data?.payment_url,
                            qr: iSmartResponse?.data?.intent,
                            trxID: trxId,
                        }));
                    } else {
                        return res.status(400).json({ message: "Failed", data: iSmartResponse?.data?.errors })
                    }
                } catch (error) {
                    return res.status(400).json({ message: "Failed", data: error.message })
                }
            default:
                let dataApiResponse = {
                    status_msg: "failed",
                    status: 400,
                    trxID: trxId,
                }
                return res.status(400).json({ message: "Failed", data: dataApiResponse })
        }
    } catch (error) {
        // console.log(" payIn.controller.js:943 ~ generatePayment ~ error:", error);

        // console.log("error==>", error.message);
        return res.status(400).json({ message: "Failed", data: "Server Side Problem !" })
    }

};

export const paymentStatusCheck = asyncHandler(async (req, res) => {
    let trxIdGet = req.params.trxId;
    let pack = await qrGenerationModel.aggregate([{ $match: { trxId: trxIdGet } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } },
    {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, {
        $project: { "_id": 1, "trxId": 1, "amount": 1, "name": 1, "callBackStatus": 1, "qrData": 1, "createdAt": 1, "userInfo.userName": 1, "userInfo.fullName": 1, "userInfo.memberId": 1 }
    }]);
    if (!pack.length) {
        return res.status(400).json({ message: "Faild", data: "No Transaction !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const paymentStatusUpdate = asyncHandler(async (req, res) => {
    let trxIdGet = req.params.trxId;
    let pack = await qrGenerationModel.findOne({ trxId: trxIdGet }).then(async (data) => {
        if (!data) {
            return res.status(400).json({ message: "Failed", data: "No Transaction !" })
        }
        if (data.callBackStatus === "Success" || data.callBackStatus === "Failed") {
            return res.status(400).json({ message: "Failed", data: `Transaction Status Can't Update Already : ${data.callBackStatus}` })
        }
        data.callBackStatus = req.body.callBackStatus;
        await data.save()
        res.status(200).json(new ApiResponse(200, data))
    })
});

export const callBackResponse = asyncHandler(async (req, res) => {
    // const release = await transactionMutex.acquire();
    try {
        let callBackData = req.body;

        if (Object.keys(req.body).length === 1) {
            let key = Object.keys(req.body)[0];
            req.body = JSON.parse(key);
            callBackData = req.body;
        }

        let switchApi = req.body.partnerTxnId ? "neyopayPayIn" : req.body.txnID ? "marwarpayInSwitch" : null;
        if (!switchApi) {
            return res.status(400).json({ message: "Failed", data: "Invalid transaction data" });
        }

        const data = switchApi === "neyopayPayIn" ? {
            status: callBackData?.txnstatus === "Success" ? 200 : 400,
            payerAmount: callBackData?.amount,
            payerName: callBackData?.payerName,
            txnID: callBackData?.partnerTxnId,
            BankRRN: callBackData?.rrn,
            payerVA: callBackData?.payerVA,
            TxnInitDate: callBackData?.TxnInitDate,
            TxnCompletionDate: callBackData?.TxnCompletionDate
        } : {
            status: callBackData?.status,
            payerAmount: callBackData?.payerAmount,
            payerName: callBackData?.payerName,
            txnID: callBackData?.txnID,
            BankRRN: callBackData?.BankRRN,
            payerVA: callBackData?.payerVA,
            TxnInitDate: callBackData?.TxnInitDate,
            TxnCompletionDate: callBackData?.TxnCompletionDate
        };

        if (data?.status != 200) {
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

        let pack = await qrGenerationModel.findOne({ trxId: data?.txnID });
        if (!pack) {
            pack = await oldQrGenerationModel.findOne({ trxId: data?.txnID });
        }
        if (!pack || pack?.callBackStatus !== "Pending") {
            return res.status(400).json({ message: "Failed", data: `Transaction already processed or not created: ${pack?.callBackStatus}` });
        }

        pack.callBackStatus = "Success";
        await pack.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: pack?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: pack?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount);

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * data.payerAmount;
        const finalAmountAdd = data.payerAmount - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: pack.memberId,
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
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        // const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${data.txnID}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            // release()
        }
        // session locking end

        const userRespSendApi = {
            status: data.status,
            payerAmount: data.payerAmount,
            payerName: data.payerName,
            txnID: data.txnID,
            BankRRN: data.BankRRN,
            payerVA: data.payerVA,
            TxnInitDate: data.TxnInitDate,
            TxnCompletionDate: data.TxnCompletionDate
        };
        if (!callBackPayinUrl) {
            return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json(new ApiResponse(200, { pid: process.pid }, "Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }
    // finally {
    //     release();
    // }
});

export const testCallBackResponse = asyncHandler(async (req, res) => {
    const release = await transactionMutex.acquire();
    try {
        let callBackData = req.body;
        if (Object.keys(req.body).length === 1) {
            let key = Object.keys(req.body)
            let stringfi = JSON.parse(key)
            req.body = stringfi;
            callBackData = stringfi;
        }

        var data;
        let switchApi;
        if (req.body.partnerTxnId) {
            switchApi = "neyopayPayIn"
        }
        if (req.body.txnID) {
            switchApi = "marwarpayInSwitch"
        }
        switch (switchApi) {
            case "neyopayPayIn":
                data = { status: callBackData?.txnstatus == "Success" || "success" ? "200" : "400", payerAmount: callBackData?.amount, payerName: callBackData?.payerName, txnID: callBackData?.partnerTxnId, BankRRN: callBackData?.rrn, payerVA: callBackData?.payerVA, TxnInitDate: callBackData?.TxnInitDate, TxnCompletionDate: callBackData?.TxnCompletionDate }
                break;
            case "marwarpayInSwitch":
                data = { status: callBackData?.status, payerAmount: callBackData?.payerAmount, payerName: callBackData?.payerName, txnID: callBackData?.txnID, BankRRN: callBackData?.BankRRN, payerVA: callBackData?.payerVA, TxnInitDate: callBackData?.TxnInitDate, TxnCompletionDate: callBackData?.TxnCompletionDate }
                break;
            default:
                // console.log("its default")
                break;
        }

        if (data?.status != "200") {
            return res.status(400).json({ message: "Failed", data: "trx is pending or not success" })
        }

        let pack = await qrGenerationModel.findOne({ trxId: data?.txnID });

        if (pack?.callBackStatus !== "Pending") {
            return res.status(400).json({ message: "Failed", data: `Trx already done status or not created : ${pack?.callBackStatus}` })
        }

        if (pack && data?.BankRRN) {
            pack.callBackStatus = "Success"
            await pack.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: pack?.memberId } }, { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } }, {
                $unwind: {
                    path: "$package",
                    preserveNullAndEmptyArrays: true,
                }
            }, { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } }, {
                $unwind: {
                    path: "$packageCharge",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "upiWalletBalance": 1, "createdAt": 1, "packageCharge._id": 1, "packageCharge.payInPackageName": 1, "packageCharge.payInChargeRange": 1, "packageCharge.isActive": 1 }
            }])

            let chargeRange = userInfo[0]?.packageCharge?.payInChargeRange;
            var chargeTypePayIn;
            var chargeAmoutPayIn;

            chargeRange.forEach((value) => {
                if (value.lowerLimit <= data?.payerAmount && value.upperLimit > data?.payerAmount) {
                    chargeTypePayIn = value.chargeType
                    chargeAmoutPayIn = value.charge
                    return 0;
                }
            })

            var userChargeApply;
            var finalAmountAdd;

            if (chargeTypePayIn === "Flat") {
                userChargeApply = chargeAmoutPayIn;
                finalAmountAdd = data?.payerAmount - userChargeApply;
            } else {
                userChargeApply = (chargeAmoutPayIn / 100) * data?.payerAmount;
                finalAmountAdd = data?.payerAmount - userChargeApply;
            }

            let gatwarCharge = userChargeApply;
            let finalCredit = finalAmountAdd;

            let payinDataStore = {
                memberId: pack?.memberId, payerName: data?.payerName, trxId: data?.txnID, amount: data?.payerAmount, chargeAmount: gatwarCharge, finalAmount: finalCredit, vpaId: data?.payerVA, bankRRN: data?.BankRRN, description: `Qr Generated Successfully Amount:${data?.payerAmount} PayerVa:${data?.payerVA} BankRRN:${data?.BankRRN}`, trxCompletionDate: data?.TxnCompletionDate, trxInItDate: data?.TxnInitDate, isSuccess: (data?.status === 200 || data?.status === "200" || data?.status === "Success" || data?.status === "success")
                    ? "Success"
                    : "Failed"
            }

            let upiWalletDataObject = { memberId: userInfo[0]?._id, transactionType: "Cr.", transactionAmount: finalCredit, beforeAmount: userInfo[0]?.upiWalletBalance, afterAmount: userInfo[0]?.upiWalletBalance + finalCredit, description: `Successfully Cr. amount: ${finalCredit}`, transactionStatus: "Success" }

            await upiWalletModel.create(upiWalletDataObject);

            await payInModel.create(payinDataStore);
            await userDB.findByIdAndUpdate(userInfo[0]?._id, { upiWalletBalance: userInfo[0]?.upiWalletBalance + finalCredit })

            // callback send to the user url
            let callBackPayinUrl = await callBackResponseModel.find({ memberId: userInfo[0]?._id, isActive: true }).select("_id payInCallBackUrl isActive");
            const userCallBackURL = callBackPayinUrl[0]?.payInCallBackUrl;
            const config = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            let userRespSendApi = {
                status: data?.status,
                payerAmount: data?.payerAmount,
                payerName: data?.payerName,
                txnID: data?.txnID,
                BankRRN: data?.BankRRN,
                payerVA: data?.payerVA,
                TxnInitDate: data?.TxnInitDate,
                TxnCompletionDate: data?.TxnCompletionDate
            }

            await axios.post(userCallBackURL, userRespSendApi, config)
            res.status(200).json(new ApiResponse(200, null, "Successfully"))
            // callback end to the user url
        } else {
            return res.status(400).json({ succes: "Failed", message: "Txn Id Not Avabile!" })
        }

    } catch (error) {
        // console.log("error==>", error.message);
        null
    } finally {
        release()
    }

});

export const rezorPayCallback = asyncHandler(async (req, res) => {
    const release = await razorPayMutex.acquire()
    try {

        if (req.body.event.includes("payment_link")) {
            const { payment_link: reqPaymentLinkObj } = req.body.payload;
            const { payment: reqPaymentObj } = req.body.payload
            const qrGenDoc = await qrGenerationModel.findOne({ refId: reqPaymentLinkObj.entity.id });

            if (typeof qrGenDoc == "undefined" || !qrGenDoc || qrGenDoc.callBackStatus == "Success" || reqPaymentLinkObj.entity.status !== "paid") return res.status(400).json({ success: "Failed", message: "Txn Id Not available!" });

            if (req.body.event === "payment_link.paid") {
                qrGenDoc.callBackStatus = "Success";
            } else {
                qrGenDoc.callBackStatus = "Failed";
            }

            const [userInfo] = await userDB.aggregate([
                { $match: { _id: qrGenDoc?.memberId } },
                { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
                { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        userName: 1,
                        memberId: 1,
                        fullName: 1,
                        trxPassword: 1,
                        upiWalletBalance: 1,
                        createdAt: 1,
                        "packageCharge._id": 1,
                        "packageCharge.payInPackageName": 1,
                        "packageCharge.payInChargeRange": 1,
                        "packageCharge.isActive": 1
                    }
                }
            ]);

            if (!userInfo) return;

            const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
            const payerAmount = qrGenDoc.amount;
            let chargeTypePayIn, chargeAmountPayIn;

            for (const value of chargeRange) {
                if (value.lowerLimit <= payerAmount && value.upperLimit > payerAmount) {
                    chargeTypePayIn = value.chargeType;
                    chargeAmountPayIn = value.charge;
                    break;
                }
            }

            const userChargeApply = chargeTypePayIn === "Flat" ? chargeAmountPayIn : (chargeAmountPayIn / 100) * payerAmount;

            const finalAmountAdd = payerAmount - userChargeApply;

            const payinDataStore = {
                memberId: qrGenDoc?.memberId,
                payerName: qrGenDoc?.name,
                trxId: qrGenDoc?.trxId,
                amount: payerAmount,
                chargeAmount: userChargeApply,
                finalAmount: finalAmountAdd,
                vpaId: reqPaymentObj.entity.vpa,
                bankRRN: reqPaymentObj.entity.acquirer_data.rrn,
                description: `Qr Generated Successfully Amount:${payerAmount} PayerVa:${reqPaymentObj.entity.vpa} BankRRN:${reqPaymentObj.entity.acquirer_data.rrn}`,
                trxCompletionDate: reqPaymentLinkObj.entity.created_at,
                trxInItDate: reqPaymentLinkObj.entity.updated_at,
                isSuccess: "Success"
            };

            const upiWalletDataObject = {
                memberId: userInfo._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: userInfo.upiWalletBalance,
                afterAmount: userInfo.upiWalletBalance + finalAmountAdd,
                description: `Successfully Cr. amount: ${finalAmountAdd} with transaction Id: ${qrGenDoc?.trxId}`,
                transactionStatus: "Success"
            };

            const callBackPayinUrls = await callBackResponseModel.find({
                memberId: userInfo._id,
                isActive: true
            }).select("payInCallBackUrl");

            const userCallBackURL = callBackPayinUrls[0]?.payInCallBackUrl;

            const userRespSendApi = {
                status: reqPaymentLinkObj.entity.status,
                payerAmount,
                payerName: qrGenDoc?.name,
                txnID: qrGenDoc?.trxId,
                BankRRN: reqPaymentObj.entity.acquirer_data.rrn,
                payerVA: reqPaymentObj.entity.vpa,
                TxnInitDate: reqPaymentLinkObj.entity.created_at,
                TxnCompletionDate: reqPaymentLinkObj.entity.updated_at
            };
            // console.log("error logging", upiWalletDataObject, qrGenDoc, payinDataStore, userCallBackURL, userRespSendApi);


            await Promise.allSettled([
                qrGenDoc.save(),
                upiWalletModel.create(upiWalletDataObject),
                payInModel.create(payinDataStore),
                userDB.findByIdAndUpdate(userInfo._id, { upiWalletBalance: userInfo.upiWalletBalance + finalAmountAdd }),
                axios.post(userCallBackURL, userRespSendApi, {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json"
                    }
                })
            ]);

            res.status(200).json(new ApiResponse(200, null, "Successfully"));
        } else if ("payment.failed") {
            qrGenDoc.callBackStatus = "Failed";
            return res.status(400).json({ succes: "Failed", message: "Txn Id Not Avabile!" })
        }
    } catch (error) {
        // console.log("error=>", error.message);
        return res.status(400).json({ succes: "Failed", message: error.message || "Txn Id Not Avabile!" })

    } finally {
        release()
    }

})

export const iSmartPayCallback = asyncHandler(async (req, res) => {
    const release = await iSmartMutex.acquire()
    const { status, status_code, currency, amount, bank_id, order_id, transaction_id } = req.body
    try {
        const qrGenDoc = await qrGenerationModel.findOne({ trxId: order_id });
        if (!qrGenDoc || qrGenDoc.callBackStatus == "Success") return res.status(400).json({ succes: "Failed", message: "Txn Id Not available!" });
        if (status && status_code == "SUCCESS") {
            qrGenDoc.callBackStatus = "Success";

            const [userInfo] = await userDB.aggregate([
                { $match: { _id: qrGenDoc?.memberId } },
                { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
                { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        userName: 1,
                        memberId: 1,
                        fullName: 1,
                        trxPassword: 1,
                        upiWalletBalance: 1,
                        createdAt: 1,
                        "packageCharge._id": 1,
                        "packageCharge.payInPackageName": 1,
                        "packageCharge.payInChargeRange": 1,
                        "packageCharge.isActive": 1
                    }
                }
            ]);

            if (!userInfo) return;
            const payerAmount = amount
            const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
            const charge = chargeRange.find(range => range.lowerLimit <= payerAmount && range.upperLimit > payerAmount);

            const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * payerAmount;
            const finalAmountAdd = payerAmount - userChargeApply;

            const payinDataStore = {
                memberId: qrGenDoc?.memberId,
                payerName: qrGenDoc?.name,
                trxId: qrGenDoc?.trxId,
                amount: payerAmount,
                chargeAmount: userChargeApply,
                finalAmount: finalAmountAdd,
                vpaId: "",
                bankRRN: bank_id,
                description: `Qr Generated Successfully Amount:${payerAmount} PayerVa:${""} BankRRN:${bank_id}`,
                trxCompletionDate: "",
                trxInItDate: "",
                isSuccess: "Success"
            };

            const upiWalletDataObject = {
                memberId: userInfo._id,
                transactionType: "Cr.",
                transactionAmount: Number(finalAmountAdd),
                beforeAmount: userInfo.upiWalletBalance,
                afterAmount: userInfo.upiWalletBalance + Number(finalAmountAdd),
                description: `Successfully Cr. amount: ${finalAmountAdd} with transaction Id: ${qrGenDoc?.trxId}`,
                transactionStatus: "Success"
            };

            const callBackPayinUrls = await callBackResponseModel.find({
                memberId: userInfo._id,
                isActive: true
            }).select("payInCallBackUrl");

            const userCallBackURL = callBackPayinUrls[0]?.payInCallBackUrl;

            const userRespSendApi = {
                status: 200,
                payerAmount,
                payerName: qrGenDoc?.name,
                txnID: qrGenDoc?.trxId,
                BankRRN: bank_id,
                payerVA: "",
                TxnInitDate: "",
                TxnCompletionDate: ""
            };


            await Promise.all([
                qrGenDoc.save(),
                upiWalletModel.create(upiWalletDataObject),
                payInModel.create(payinDataStore),
                userDB.findByIdAndUpdate(userInfo._id, { upiWalletBalance: userInfo.upiWalletBalance + finalAmountAdd }),
                axios.post(userCallBackURL, userRespSendApi, {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json"
                    }
                })
            ]);
        } else {
            qrGenDoc.callBackStatus = "Failed";
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

    } catch (error) {
        // console.log("error in ismart pay callback", error.message);

        return res.status(400).json({ succes: "Failed", message: error.message || "Txn Id Not Avabile!" })
    } finally {
        release()
    }
})

export const callBackProconcept = asyncHandler(async (req, res) => {
    // const release = await transactionMutex.acquire();
    try {
        let callBackData = req.body;

        const data = {
            status: callBackData?.Status,
            payerAmount: callBackData?.Amount,
            payerName: callBackData?.Name,
            txnID: callBackData?.OrderId,
            BankRRN: callBackData?.BankRRN,
            payerVA: callBackData?.payerVA,
            TxnInitDate: callBackData?.TxnInitDate,
            TxnCompletionDate: callBackData?.TxnCompletionDate
        };

        if (data?.status != 200) {
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

        const pack = await qrGenerationModel.findOne({ trxId: data?.txnID });
        if (!pack || pack?.callBackStatus !== "Pending") {
            return res.status(400).json({ message: "Failed", data: `Transaction already processed or not created: ${pack?.callBackStatus}` });
        }

        pack.callBackStatus = "Success";
        await pack.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: pack?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: pack?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount);

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * data.payerAmount;
        const finalAmountAdd = data.payerAmount - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: pack.memberId,
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
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        // const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${data.txnID}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            // release()
        }
        // session locking end

        const userRespSendApi = {
            status: data.status,
            payerAmount: data.payerAmount,
            payerName: data.payerName,
            txnID: data.txnID,
            BankRRN: data.BankRRN,
            payerVA: data.payerVA,
            TxnInitDate: data.TxnInitDate,
            TxnCompletionDate: data.TxnCompletionDate
        };
        if (!callBackPayinUrl) {
            return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json(new ApiResponse(200, { pid: process.pid }, "Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }
    // finally {
    //     release();
    // }
});

export const callBackComprismo = asyncHandler(async (req, res) => {
    // const release = await transactionMutex.acquire();
    try {
        let callBackData = req.body;

        const data = {
            status: callBackData?.status,
            payerAmount: callBackData?.payerAmount,
            payerName: callBackData?.payerName,
            txnID: callBackData?.txnID,
            BankRRN: callBackData?.BankRRN,
            payerVA: callBackData?.payerVA || "abc@vpa",
            TxnInitDate: callBackData?.TxnInitDate,
            TxnCompletionDate: callBackData?.TxnCompletionDate
        };

        if (data?.status != 200) {
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

        const pack = await qrGenerationModel.findOne({ trxId: data?.txnID });
        if (!pack || pack?.callBackStatus !== "Pending") {
            return res.status(400).json({ message: "Failed", data: `Transaction already processed or not created: ${pack?.callBackStatus}` });
        }

        pack.callBackStatus = "Success";
        await pack.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: pack?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: pack?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount);

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * data.payerAmount;
        const finalAmountAdd = data.payerAmount - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: pack.memberId,
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
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        // const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${data.txnID}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            // release()
        }
        // session locking end

        const userRespSendApi = {
            status: data.status,
            payerAmount: data.payerAmount,
            payerName: data.payerName,
            txnID: data.txnID,
            BankRRN: data.BankRRN,
            payerVA: data.payerVA,
            TxnInitDate: data.TxnInitDate,
            TxnCompletionDate: data.TxnCompletionDate
        };
        if (!callBackPayinUrl) {
            return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json(new ApiResponse(200, { pid: process.pid }, "Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }
    // finally {
    //     release();
    // }
});

export const callBackVaultage = asyncHandler(async (req, res) => {
    try {
        const { event, Data } = req.body;
        const { TxnStatus, PayerAmount, PayerName, transactioninitdate, WalletTransactionId, PayerMobile, BankRRN, PayerVA, TxnCompletionDate, ApiUserReferenceId } = Data;

        if (TxnStatus !== "SUCCESS") {
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

        const trx = await qrGenerationModel.findOne({ trxId: ApiUserReferenceId });

        if (!trx || trx.callBackStatus !== "Pending") {
            return res.status(400).json({
                message: "Failed",
                data: `Transaction already processed or not created: ${trx?.callBackStatus}`
            });
        }
        trx.callBackStatus = "Success";
        await trx.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: trx?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: trx?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= PayerAmount && range.upperLimit > PayerAmount);

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * PayerAmount;
        const finalAmountAdd = PayerAmount - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: trx.memberId,
            payerName: PayerName,
            trxId: ApiUserReferenceId,
            amount: PayerAmount,
            chargeAmount: userChargeApply,
            finalAmount: finalAmountAdd,
            vpaId: PayerVA,
            bankRRN: BankRRN,
            description: `QR Generated Successfully Amount:${PayerAmount} PayerVa:${PayerVA} BankRRN:${BankRRN}`,
            trxCompletionDate: TxnCompletionDate,
            trxInItDate: transactioninitdate,
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        // const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${ApiUserReferenceId}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            // release()
        }

        const userRespSendApi = {
            status: TxnStatus === "SUCCESS" ? 200 : 400,
            payerAmount: PayerAmount,
            payerName: PayerName,
            txnID: ApiUserReferenceId,
            BankRRN: BankRRN,
            payerVA: PayerVA,
            TxnInitDate: transactioninitdate,
            TxnCompletionDate: TxnCompletionDate
        };
        if (!callBackPayinUrl) {
            return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json(new ApiResponse(200, { pid: process.pid }, "Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }
})
export const callBackJiffy = asyncHandler(async (req, res) => {
    try {
        // const { event, Data } = req.body;
        // const { TxnStatus, PayerAmount, PayerName, transactioninitdate, WalletTransactionId, PayerMobile, BankRRN, PayerVA, TxnCompletionDate, ApiUserReferenceId } = Data;

        const { meta, data } = req.body
        const { response_code, message } = meta
        const { apx_payment_id, client_ref_id, amount, currency, bank_reference, created_at, modified_at, service_charge, service, status } = data

        if (status !== "SUCCESS") {
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

        const trx = await qrGenerationModel.findOne({ trxId: client_ref_id });

        if (!trx || trx.callBackStatus !== "Pending") {
            return res.status(400).json({
                message: "Failed",
                data: `Transaction already processed or not created: ${trx?.callBackStatus}`
            });
        }
        trx.callBackStatus = "Success";
        await trx.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: trx?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: trx?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= amount && range.upperLimit > amount);

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * amount;
        const finalAmountAdd = amount - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: trx.memberId,
            payerName: trx?.name,
            trxId: client_ref_id,
            amount: amount,
            chargeAmount: userChargeApply,
            finalAmount: finalAmountAdd,
            vpaId: "abc@vpa",
            bankRRN: bank_reference,
            description: `QR Generated Successfully Amount:${amount} PayerVa:${"abc@vpa"} BankRRN:${bank_reference}`,
            trxCompletionDate: modified_at,
            trxInItDate: created_at,
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        // const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${client_ref_id}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            // release()
        }

        const userRespSendApi = {
            status: status === "SUCCESS" ? 200 : 400,
            payerAmount: amount,
            payerName: trx?.name,
            txnID: client_ref_id,
            BankRRN: bank_reference,
            payerVA: "abc@vpa",
            TxnInitDate: created_at,
            TxnCompletionDate: modified_at
        };
        if (!callBackPayinUrl) {
            return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json(new ApiResponse(200, { pid: process.pid }, "Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }
})

export const callBackSambhavPay = asyncHandler(async (req, res) => {
    const { orderId, amount, txnRespCode, txnResponseDate, transactionId, rrn } = req.body;

    try {
        if (txnRespCode != "00") {
            return res.status(200).json({ status: 200, message: "SUCCESS" });
        }

        const trx = await qrGenerationModel.findOne({ trxId: orderId });
        // trx ??= await oldQrGenerationModel.findOne({ trxId: orderId });

        if (!trx || trx.callBackStatus !== "Pending") {
            return res.status(200).json({
                message: "SUCCESS",
                status: "200"
            });
        }
        trx.callBackStatus = "Success";
        await trx.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: trx?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: trx?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= (+amount / 100) && range.upperLimit > (+amount / 100));

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * (+amount / 100);
        const finalAmountAdd = (+amount / 100) - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: trx.memberId,
            payerName: trx.name,
            trxId: orderId,
            amount: (+amount / 100),
            chargeAmount: userChargeApply,
            finalAmount: finalAmountAdd,
            vpaId: "abc@vpa",
            bankRRN: rrn,
            description: `QR Generated Successfully Amount:${(+amount / 100)} PayerVa:${"abc@vpa"} BankRRN:${rrn}`,
            trxCompletionDate: txnResponseDate,
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        // const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${orderId}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            // release()
        }

        const userRespSendApi = {
            status: txnRespCode == "00" ? 200 : 400,
            payerAmount: (+amount / 100),
            payerName: trx.name,
            txnID: orderId,
            BankRRN: rrn,
            TxnCompletionDate: txnResponseDate
        };
        if (!callBackPayinUrl) {
            return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json({ status: 200, message: "SUCCESS" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }

});

async function sambhavPayin({ orderNo, amount, currency = "INR", txnReqType = "S", emailId, mobileNo, transactionMethod = "UPI", customerName, optional1 = "intent", api_url, mid, secretKey, saltKey }) {
    const sp = new SambhavPay({ api_url });
    const response = await sp.initiatePayment({
        mid,
        secretKey,
        saltKey,
        orderNo,
        amount,
        currency,
        txnReqType,
        undefinedField1: "",
        undefinedField2: "",
        undefinedField3: "",
        undefinedField4: "",
        undefinedField5: "",
        undefinedField6: "",
        undefinedField7: "",
        undefinedField8: "",
        undefinedField9: "",
        undefinedField10: "",
        emailId,
        mobileNo,
        transactionMethod,
        bankCode: "",
        vpa: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        customerName,
        respUrl: "",
        optional1,
    });

    if (response?.error) {
        // console.log(" payIn.controller.js:1894 ~ response?.error:", response?.error);
        return {
            status: false,
            message: "Transaction Failed",
        }
    } else {
        return respHandler2(response, api_url);
    }
}

async function sambhavPayin2({ orderNo, amount, currency = "INR", txnReqType = "S", emailId, mobileNo, transactionMethod = "UPI", customerName, optional1 = "intent", api_url, mid, secretKey, saltKey }) {
    const result = await SambhavPayin.initiatePayment({
        mid: process.env.SAMBHAVPAY_ESRGMG_MID,
        secretKey: process.env.SAMBHAVPAY_ESRGMG_SECRET_KEY,
        saltKey: process.env.SAMBHAVPAY_ESRGMG_SALT_KEY,
        orderNo: orderNo,
        amount: amount,
        currency: currency,
        txnReqType: txnReqType,
        undefinedField1: "",
        undefinedField2: "",
        undefinedField3: "",
        undefinedField4: "",
        undefinedField5: "",
        undefinedField6: "",
        undefinedField7: "",
        undefinedField8: "",
        undefinedField9: "",
        undefinedField10: "",
        emailId: emailId,
        mobileNo: mobileNo,
        transactionMethod: transactionMethod,
        bankCode: "",
        vpa: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        customerName: customerName,
        respUrl: "",
        optional1: optional1,
    })
    // console.log(" payIn.controller.js:2536 ~ sambhavPayin2 ~ result:", result);

    if (result?.error) {
        throw new Error("Transaction Failed");
    } else {
        return respHandler(result, api_url);
    }
}

export async function callbackAirpay(req, res) {
    // const release = await transactionMutex.acquire();
    try {
        let callBackData = req.body;

        const data = {
            status: callBackData?.TRANSACTIONSTATUS,
            MERCID: callBackData?.MERCID,
            payerAmount: callBackData?.AMOUNT,
            payerName: callBackData?.CUSTOMER,
            txnID: callBackData?.TRANSACTIONID,
            BankRRN: callBackData?.RRN,
            payerVA: callBackData?.CUSTOMERVPA,
            TxnInitDate: callBackData?.TxnInitDate,
            TxnCompletionDate: callBackData?.TRANSACTIONTIME
        }

        if (callBackData?.MERCID != process?.env?.AIRPAY_MERCHANT_ID) {
            return res.status(400).json({ message: "Failed", data: "Invalid callback auth key !" });
        }

        if (data?.status != 200) {
            return res.status(400).json({ message: "Failed", data: "Transaction is pending or not successful" });
        }

        let pack = await qrGenerationModel.findOne({ trxId: data?.txnID });
        if (!pack) {
            pack = await oldQrGenerationModel.findOne({ trxId: data?.txnID });
        }
        if (!pack || pack?.callBackStatus !== "Pending") {
            return res.status(400).json({ message: "Failed", data: `Transaction already processed or not created: ${pack?.callBackStatus}` });
        }

        pack.callBackStatus = "Success";
        await pack.save();

        const [userInfo] = await userDB.aggregate([
            { $match: { _id: pack?.memberId } },
            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
            { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } }
        ]);

        const callBackPayinUrlResult = await callBackResponseModel.findOne({ memberId: pack?.memberId, isActive: true }).select("_id payInCallBackUrl isActive");

        const callBackPayinUrl = callBackPayinUrlResult?.payInCallBackUrl;

        if (!userInfo) {
            return res.status(400).json({ message: "Failed", data: "User info is missing" });
        }

        const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
        const charge = chargeRange.find(range => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount);

        const userChargeApply = charge.chargeType === "Flat" ? charge.charge : (charge.charge / 100) * data.payerAmount;
        const finalAmountAdd = data.payerAmount - userChargeApply;

        const payInCreateResult = await payInModel.create({
            memberId: pack?.memberId,
            payerName: data?.payerName,
            trxId: data?.txnID,
            amount: data?.payerAmount,
            chargeAmount: userChargeApply,
            finalAmount: finalAmountAdd,
            vpaId: data?.payerVA,
            bankRRN: data?.BankRRN,
            description: `QR Generated Successfully Amount:${data?.payerAmount} PayerVa:${data?.payerVA} BankRRN:${data?.BankRRN}`,
            trxCompletionDate: data?.TxnCompletionDate,
            trxInItDate: data?.TxnInitDate,
            isSuccess: "Success"
        })

        // session locking
        // db locking with deducted amount 
        const release = await transactionMutex.acquire();
        const upiWalletAdd = await userDB.startSession();
        const transactionOptions = {
            readConcern: { level: 'linearizable' },
            writeConcern: { w: 'majority' },
            readPreference: { mode: 'primary' },
            maxTimeMS: 1500
        };
        try {
            upiWalletAdd.startTransaction(transactionOptions);
            const opts = { upiWalletAdd };
            const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, { $inc: { upiWalletBalance: + finalAmountAdd } }, {
                returnDocument: 'after',
                upiWalletAdd
            })

            const upiWalletDataObject = {
                memberId: upiWalletUpdateResult?._id,
                transactionType: "Cr.",
                transactionAmount: finalAmountAdd,
                beforeAmount: Number(upiWalletUpdateResult?.upiWalletBalance) - Number(finalAmountAdd),
                afterAmount: upiWalletUpdateResult?.upiWalletBalance,
                description: `Successfully Cr. amount: ${finalAmountAdd} with trxId: ${data.txnID}`,
                transactionStatus: "Success"
            }

            await upiWalletModel.create([upiWalletDataObject], opts);
            // Commit the transaction
            await upiWalletAdd.commitTransaction();
        } catch (error) {
            await upiWalletAdd.abortTransaction();
        } finally {
            upiWalletAdd.endSession();
            release()
        }
        // session locking end

        const userRespSendApi = {
            status: data?.status,
            payerAmount: data?.payerAmount,
            payerName: data?.payerName,
            txnID: data?.txnID,
            BankRRN: data?.BankRRN,
            payerVA: data?.payerVA,
            TxnInitDate: data?.TxnInitDate,
            TxnCompletionDate: data?.TxnCompletionDate
        };
        // if (!callBackPayinUrl) {
        //     return res.status(400).json({ message: "Failed", data: "Callback URL is missing" });
        // }

        try {
            await axios.post(callBackPayinUrl, userRespSendApi, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            null
        }

        return res.status(200).json(new ApiResponse(200, { pid: process.pid }, "Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: "Failed", message: error.message || "Internal server error!" });
    }
    // finally {
    //     release();
    // }
}


async function respHandler(jsonData) {
    const responseData = jsonData;
    if (responseData?.respCode == 1) {
        // res.send(responseData?.data?.ResponseMsg);
    } else {
        const mid = process.env.SAMBHAVPAY_ESRGMG_MID;
        // const secretKey = process.env.SAMBHAVPAY_SECRET_KEY;
        // const saltKey = process.env.SAMBHAVPAY_SALT_KEY;

        // const sp = new SambhavPay();
        // sp._mid = mid;
        // sp._secretKey = secretKey;
        // sp._saltKey = saltKey;

        const data = JSON.parse(responseData?.data);
        const respData = data?.respData;
        const checkSum = data?.checkSum;

        const response = SambhavPayin.getResponse(respData, mid, checkSum);
        return JSON.parse(response)
        // res.render("response_data", { response: JSON.parse(response) });
    }
}

async function respHandler2(jsonData, api_url) {
    const responseData = jsonData;

    if (responseData?.respCode == 1) {
        return {
            status: false,
            message: responseData?.data || "Transaction Failed",
        }
    } else {
        const mid = process.env.SAMBHAVPAY_MID;
        const secretKey = process.env.SAMBHAVPAY_SECRET_KEY;
        const saltKey = process.env.SAMBHAVPAY_SALT_KEY;

        const sp = new SambhavPay({ api_url });
        sp._mid = mid;
        sp._secretKey = secretKey;
        sp._saltKey = saltKey;

        const data = JSON.parse(responseData?.data);
        const respData = data?.respData;
        const checkSum = data?.checkSum;

        const response = sp.getResponse(respData, mid, checkSum);
        return JSON.parse(response);
    }
}