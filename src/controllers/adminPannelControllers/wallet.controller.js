import eWalletModel from "../../models/Ewallet.model.js";
import upiWalletModel from "../../models/upiWallet.model.js";
import payInModel from "../../models/payIn.model.js";
import userDB from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Parser } from 'json2csv';
import mongoose, { Mongoose } from "mongoose";
// import { getPaginationArray } from "../../utils/helpers.js";

export const getAllTransactionUpi = asyncHandler(async (req, res) => {
    let { keyword = "", startDate, endDate, page = 1, limit = 25, memberId, export: exportToCSV } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const user = await userDB.findOne({ memberId: memberId })
    const skip = (page - 1) * limit;

    let dateFilter = {};
    if (startDate) {
        dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lt = new Date(endDate); // Wrap in new Date() to maintain proper format
    }

    let matchFilters = {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { trxId: { $regex: trimmedKeyword, $options: "i" } },
                { payerName: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(user && { memberId: new mongoose.Types.ObjectId(String(user?._id)) })
    };
    const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

    const userQuery = [
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
                as: "userInfo",
                pipeline: [
                    { $project: { userName: 1, fullName: 1, memberId: 1 } },
                ],
            },
        },
        {
            $unwind: {
                path: "$userInfo",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $project: {
                _id: 1,
                memberId: 1,
                transactionType: 1,
                transactionAmount: 1,
                beforeAmount: 1,
                afterAmount: 1,
                description: 1,
                transactionStatus: 1,
                createdAt: 1,
                updatedAt: 1,
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
        let transactions = await upiWalletModel.aggregate(userQuery, aggregationOptions).allowDiskUse(true);

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({
                message: "Success",
                data: "No Transactions Available!",
            });
        }

        const totalDocs = await upiWalletModel.countDocuments(matchFilters);

        if (exportToCSV == "true") {
            console.log("Exporting to CSV");

            const fields = [
                "_id",
                "memberId",
                "transactionType",
                "transactionAmount",
                "beforeAmount",
                "afterAmount",
                "description",
                "transactionStatus",
                "createdAt",
                "updatedAt",
                "userInfo.userName",
                "userInfo.fullName",
                "userInfo.memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(transactions);

            res.header('Content-Type', 'text/csv');
            res.attachment(`transactions-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }

        const response = {
            data: transactions,
            totalDocs: totalDocs,
            totalPages: Math.ceil(totalDocs / limit),
            currentPage: page,
        };

        res.status(200).json(new ApiResponse(200, transactions, totalDocs));
    } catch (err) {
        res.status(500).json({
            message: "Failed",
            data: `Internal Server Error: ${err.message}`,
        });
    }
});

export const getAllTransactionEwallet = asyncHandler(async (req, res) => {
    let { keyword = "", startDate, endDate, page = 1, limit = 25, memberId, export: exportToCSV } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;
    const user = await userDB.findOne({ memberId: memberId })

    let dateFilter = {};
    if (startDate) {
        dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999);// Modify endDate in place
        dateFilter.$lt = new Date(endDate); // Wrap in new Date() to maintain proper format
    }

    const matchFilters = {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { transactionType: { $regex: trimmedKeyword, $options: "i" } },
                { description: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(user && { memberId: new mongoose.Types.ObjectId(user?._id) })
    };

    try {
        const totalDocs = await eWalletModel.countDocuments();
        const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

        const userQuery = [
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
                        { $project: { userName: 1, fullName: 1, memberId: 1 } },
                    ],
                    as: "userInfo",
                },
            },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
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
                    "memberId": 1,
                    "transactionType": 1,
                    "transactionAmount": 1,
                    "beforeAmount": 1,
                    "chargeAmount": 1,
                    "afterAmount": 1,
                    "description": 1,
                    "transactionStatus": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "userInfo.userName": 1,
                    "userInfo.fullName": 1,
                    "userInfo.memberId": 1,
                },
            },
        ];

        const aggregationOptions = {
            readPreference: 'secondaryPreferred'
        };

        let transactions = await eWalletModel.aggregate(userQuery, aggregationOptions).allowDiskUse(true);

        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "memberId",
                "transactionType",
                "transactionAmount",
                "beforeAmount",
                "chargeAmount",
                "afterAmount",
                "description",
                "transactionStatus",
                "createdAt",
                "updatedAt",
                "userInfo.userName",
                "userInfo.fullName",
                "userInfo.memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(transactions);

            res.header('Content-Type', 'text/csv');
            res.attachment(`transactions-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({
                message: "Success",
                data: "No Transactions Available!",
            });
        }
        const response = {
            data: transactions,
            totalDocs: totalDocs,
            totalPages: Math.ceil(totalDocs / limit),
            currentPage: page
        };

        res.status(200).json(new ApiResponse(200, transactions, totalDocs));
    } catch (err) {
        res.status(500).json({
            message: "Failed",
            data: `Internal Server Error: ${err.message}`,
        });
    }
});

export const getTransactionStatus = asyncHandler(async (req, res) => {
    let query = req.params.id;
    let pack = await eWalletModel.findById(query);
    if (!pack) {
        return res.status(400).json({ message: "Failed", data: "No Transaction Found!" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const upiToEwallet = asyncHandler(async (req, res) => {
    let query = req.params.id;
    const { transactionAmount } = req.body;
    let userData = await userDB.findById(query, "_id userName memberId upiWalletBalance EwalletBalance")
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }

    // Upi To Ewallet
    if (transactionAmount <= userData?.upiWalletBalance) {
        let beforeAmountEwallet = userData?.EwalletBalance;
        let beforeAmountUpiWallet = userData?.upiWalletBalance;
        userData.upiWalletBalance -= transactionAmount;
        userData.EwalletBalance += transactionAmount;
        await userData.save();
        let trxStoreEwallet = {
            memberId: userData._id,
            transactionType: "Cr.",
            transactionAmount: transactionAmount,
            beforeAmount: beforeAmountEwallet,
            afterAmount: userData.EwalletBalance,
            chargeAmount: 0,
            description: `#Settlement Amount Successfully Cr. amount: ${transactionAmount}`,
            transactionStatus: "Success",
        }
        let trxStoreUpiWallet = {
            memberId: userData._id,
            transactionType: "Dr.",
            transactionAmount: transactionAmount,
            beforeAmount: beforeAmountUpiWallet,
            afterAmount: userData.upiWalletBalance,
            description: `#Settlement Amount Successfully Dr. amount: ${transactionAmount}`,
            transactionStatus: "Success",
        }
        let eWalletStore = await eWalletModel.create(trxStoreEwallet);
        await upiWalletModel.create(trxStoreUpiWallet);
        res.status(200).json(new ApiResponse(200, eWalletStore))
    } else {
        res.status(400).json({ message: "Failed", data: `Transaction amount grather then upi Wallet Amount : ${userData.upiWalletBalance} !` })
    }
});

export const EwalletToHoldingFund = asyncHandler(async (req, res) => {
    let query = req?.params?.id;
    const { transactionAmount } = req.body;
    let userData = await userDB.findById(query, "_id userName memberId upiWalletBalance EwalletBalance HoldingAmount")
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }

    // Ewallet To holding
    if (transactionAmount <= userData?.EwalletBalance) {

        let beforeAmountEwallet = userData?.EwalletBalance;
        userData.HoldingAmount += transactionAmount;
        userData.EwalletBalance -= transactionAmount;
        await userData.save();

        let trxStoreEwallet = {
            memberId: userData?._id,
            transactionType: "Dr.",
            transactionAmount: transactionAmount,
            beforeAmount: beforeAmountEwallet,
            afterAmount: userData?.EwalletBalance,
            chargeAmount: 0,
            description: `#Hold Amount Successfully Dr. amount: ${transactionAmount}`,
            transactionStatus: "Success",
        }

        let eWalletStore = await eWalletModel.create(trxStoreEwallet);

        res.status(200).json(new ApiResponse(200, eWalletStore))
    } else {
        res.status(400).json({ message: "Failed", data: `Transaction amount grather then Ewallet Wallet Amount : ${userData?.EwalletBalance} !` })
    }
});

export const HoldingFundToEwallet = asyncHandler(async (req, res) => {
    let query = req?.params?.id;
    const { transactionAmount } = req.body;
    let userData = await userDB.findById(query, "_id userName memberId upiWalletBalance EwalletBalance HoldingAmount")
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }

    // Holding To Ewallet
    if (transactionAmount <= userData?.HoldingAmount) {

        let beforeAmountEwallet = userData?.EwalletBalance;
        userData.HoldingAmount -= transactionAmount;
        userData.EwalletBalance += transactionAmount;
        await userData.save();

        let trxStoreEwallet = {
            memberId: userData?._id,
            transactionType: "Cr.",
            transactionAmount: transactionAmount,
            beforeAmount: beforeAmountEwallet,
            afterAmount: userData.EwalletBalance,
            chargeAmount: 0,
            description: `#Hold Amount Successfully Cr. amount: ${transactionAmount}`,
            transactionStatus: "Success",
        }

        let eWalletStore = await eWalletModel.create(trxStoreEwallet);

        res.status(200).json(new ApiResponse(200, eWalletStore))
    } else {
        res.status(400).json({ message: "Failed", data: `Transaction amount grather then holding Amount : ${userData?.HoldingAmount} !` })
    }
});

export const eWalletFundCredit = asyncHandler(async (req, res) => {
    let query = req.params.id;
    const { transactionAmount, transactionType, description } = req.body;
    let userData = await userDB.findById(query, "_id userName memberId EwalletBalance");
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }
    // Ewallet fund credit
    let beforeAmount = userData?.EwalletBalance;
    let updateUserWallet = beforeAmount + transactionAmount;
    userData.EwalletBalance = updateUserWallet;
    await userData.save();

    let Ewallet = await eWalletModel.create({ memberId: userData?._id, transactionType: transactionType, transactionAmount: transactionAmount, beforeAmount: beforeAmount, chargeAmount: 0, afterAmount: updateUserWallet, description: `#By Admin Credit SuccessFully ${transactionType} Amount : ${transactionAmount}`, transactionStatus: "Success" })

    res.status(200).json(new ApiResponse(200, Ewallet))
});

export const eWalletFundDebit = asyncHandler(async (req, res) => {
    let query = req.params.id;
    const { transactionAmount, transactionType, description } = req.body;

    let userData = await userDB.findById(query, "_id userName memberId EwalletBalance")
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }

    // Ewallet fund credit
    let beforeAmount = userData?.EwalletBalance;
    let updateUserWallet = beforeAmount - transactionAmount;
    userData.EwalletBalance = updateUserWallet;
    await userData.save();

    let Ewallet = await eWalletModel.create({ memberId: userData?._id, transactionType: transactionType, transactionAmount: transactionAmount, beforeAmount: beforeAmount, chargeAmount: 0, afterAmount: updateUserWallet, description: `#By Admin Debit SuccessFully ${transactionType} Amount : ${transactionAmount}`, transactionStatus: "Success" })
    res.status(200).json(new ApiResponse(200, Ewallet))
});

export const getSettlementAmountAll = asyncHandler(async (req, res) => {
    const { startTimeAndDate, endTimeAndDate } = req.body;
    let dateStart = new Date(startTimeAndDate)
    let dateEnd = new Date(endTimeAndDate)
    let dataEwallet = await payInModel.aggregate([{ $match: { createdAt: { $gte: dateStart, $lt: dateEnd } } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } }, { $group: { _id: "$userInfo.fullName", amount: { $sum: "$finalAmount" } } }, { $sort: { amount: -1 } }]);


    if (dataEwallet.length === 0) {
        return res.status(404).json({ message: "Failed", data: "No Settlement Amount Avabile !" })
    }

    res.status(200).json(new ApiResponse(200, { dataEwallet }))
});

export const getSettlementAmountOne = asyncHandler(async (req, res) => {
    let query = req.params.id;
    const { startTimeAndDate, endTimeAndDate } = req.body;
    let dateStart = new Date(startTimeAndDate)
    let dateEnd = new Date(endTimeAndDate)
    let dataEwallet = await payInModel.aggregate([{
        $match: {
            $and: [{
                memberId: new mongoose.Types.ObjectId(query)
            }, { createdAt: { $gte: dateStart, $lt: dateEnd } }
            ]
        }
    }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } }, { $group: { _id: "$userInfo.fullName", amount: { $sum: "$finalAmount" } } }]);

    if (dataEwallet.length === 0) {
        return res.status(404).json({ message: "Failed", data: "No Settlement Amount Avaible !" })
    }

    res.status(200).json(new ApiResponse(200, dataEwallet))
});