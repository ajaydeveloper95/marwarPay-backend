import { ApiResponse } from "../../utils/ApiResponse.js"
import upiWalletModel from "../../models/upiWallet.model.js"
import userDB from "../../models/user.model.js"
import eWalletModel from "../../models/Ewallet.model.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import mongoose from "mongoose"
import { Parser } from "json2csv"
// import { ApiError } from "../../utils/ApiError.js"

export const upiWalletTrx = asyncHandler(async (req, res) => {
    let userId = req.user._id.toString();
    let { page = 1, limit = 25, keyword = "", startDate, endDate, export: exportToCSV } = req.query

    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;

    const trimmedMemberId = userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(String(userId.trim()))
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

    const matchFilters = {
        memberId: new mongoose.Types.ObjectId(userId),
        memberId: new mongoose.Types.ObjectId(userId),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { trxId: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(trimmedMemberId && { memberId: trimmedMemberId })
    };
    const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    const aggregationPipeline = [
        { $match: { ...matchFilters } },
        { $sort: { createdAt: sortDirection } },
        ...(exportToCSV != "true"
            ? [
                { $skip: skip },
                { $limit: limit }
            ]
            : []),
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
                "afterAmount": 1,
                "description": 1,
                "transactionStatus": 1,
                "createdAt": 1,
                "updatedAt": 1
            }
        },
        { $sort: { createdAt: -1 } }
    ]

    let userUpiTrx = await upiWalletModel.aggregate(aggregationPipeline, aggregationOptions);
    if (exportToCSV === "true") {
        const fields = [
            "_id",
            "memberId",
            "transactionType",
            "transactionAmount",
            "beforeAmount",
            "afterAmount",
            "description",
            "transactionStatus",
            "createdAt"
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(userUpiTrx);

        res.header('Content-Type', 'text/csv');
        res.attachment(`upiWalletTransactions-${startDate}-${endDate}.csv`);

        return res.status(200).send(csv);
    }

    const totalDocs = await upiWalletModel.countDocuments(matchFilters);

    if (userUpiTrx.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Trx Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, userUpiTrx, totalDocs));
});

export const eWalletTrx = asyncHandler(async (req, res) => {
    let userId = req.user?._id.toString();

    let { page = 1, limit = 25, keyword = "", startDate, endDate, export: exportToCSV } = req.query

    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;
    // console.log("eWalletTrx ~ userId:", userId);

    const trimmedMemberId = userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(String(userId.trim()))
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

    const matchFilters = {
        memberId: new mongoose.Types.ObjectId(userId),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { transactionType: { $regex: trimmedKeyword, $options: "i" } },
                { transactionAmount: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(trimmedMemberId && { memberId: trimmedMemberId })
    };
    const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

    const aggregationPipeline = [
        { $match: { ...matchFilters } },
        { $sort: { createdAt: sortDirection } },
        ...(exportToCSV != "true"
            ? [
                { $skip: skip },
                { $limit: limit }
            ]
            : []),
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
                "updatedAt": 1
            }
        },
        { $sort: { createdAt: -1 } }
    ]

    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    let userUpiTrx = await eWalletModel.aggregate(aggregationPipeline, aggregationOptions)

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
            "createdAt"
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(userUpiTrx);

        res.header('Content-Type', 'text/csv');
        res.attachment(`upiWalletTransactions-${startDate}-${endDate}.csv`);

        return res.status(200).send(csv);
    }

    const totalDocs = await eWalletModel.countDocuments(matchFilters);

    if (userUpiTrx.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Trx Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, userUpiTrx, totalDocs));
});

export const upiToEwalletTrx = asyncHandler(async (req, res) => {
    let userId = req.user._id.toString();

    let { page = 1, limit = 25, keyword = "", startDate, endDate, export: exportToCSV } = req.query

    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;

    const trimmedMemberId = userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(String(userId.trim()))
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

    const matchFilters = {
        memberId: new mongoose.Types.ObjectId(userId),
        transactionType: "Dr.",
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { beforeAmount: { $regex: trimmedKeyword, $options: "i" } },
                { afterAmount: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(trimmedMemberId && { memberId: trimmedMemberId })
    };
    const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

    const aggregationPipeline = [
        { $match: { ...matchFilters } },
        { $sort: { createdAt: sortDirection } },
        ...(exportToCSV != "true"
            ? [
                { $skip: skip },
                { $limit: limit }
            ]
            : []),
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
                "afterAmount": 1,
                "description": 1,
                "transactionStatus": 1,
                "createdAt": 1,
                "updatedAt": 1
            }
        },
        { $sort: { createdAt: -1 } }
    ]
    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    let userUpiTrx = await upiWalletModel.aggregate(aggregationPipeline, aggregationOptions);
    if (userUpiTrx.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Trx Avabile !" })
    }
    if (exportToCSV === "true") {
        const fields = [
            "_id",
            "memberId",
            "transactionType",
            "transactionAmount",
            "beforeAmount",
            "afterAmount",
            "description",
            "transactionStatus",
            "createdAt"
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(userUpiTrx);

        res.header('Content-Type', 'text/csv');
        res.attachment(`upiToEWalletWalletTransactions-${startDate}-${endDate}.csv`);

        return res.status(200).send(csv);
    }
    const totalDocs = await upiWalletModel.countDocuments(matchFilters);

    res.status(200).json(new ApiResponse(200, userUpiTrx, totalDocs));
});

export const eWalletToPayOutTrx = asyncHandler(async (req, res) => {
    let userId = req.user._id;
    let { page = 1, limit = 25, keyword = "", startDate, endDate, export: exportToCSV } = req.query

    page = Number(page) || 1;
    limit = Number(limit) || 25;
    const trimmedKeyword = keyword.trim();
    const skip = (page - 1) * limit;

    const trimmedMemberId = userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(String(userId.trim()))
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

    const matchFilters = {
        memberId: new mongoose.Types.ObjectId(userId),
        transactionType: "Dr.",
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { beforeAmount: { $regex: trimmedKeyword, $options: "i" } },
                { afterAmount: { $regex: trimmedKeyword, $options: "i" } },
                { transactionAmount: { $regex: trimmedKeyword, $options: "i" } },
            ]
        }),
        ...(trimmedMemberId && { memberId: trimmedMemberId })
    };
    const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

    const aggregationPipeline = [
        { $match: { ...matchFilters } },
        { $sort: { createdAt: sortDirection } },
        ...(exportToCSV != "true"
            ? [
                { $skip: skip },
                { $limit: limit }
            ]
            : []),
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
                "afterAmount": 1,
                "description": 1,
                "transactionStatus": 1,
                "createdAt": 1,
                "updatedAt": 1
            }
        },
        { $sort: { createdAt: -1 } }
    ]
    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    let userUpiTrx = await eWalletModel.aggregate(aggregationPipeline, aggregationOptions);
    if (userUpiTrx.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Trx Avabile !" })
    }
    if (exportToCSV === "true") {
        const fields = [
            "_id",
            "memberId",
            "transactionType",
            "transactionAmount",
            "beforeAmount",
            "afterAmount",
            "description",
            "transactionStatus",
            "createdAt"
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(userUpiTrx);

        res.header('Content-Type', 'text/csv');
        res.attachment(`eWalletToPayOutTransactions-${startDate}-${endDate}.csv`);

        return res.status(200).send(csv);
    }
    res.status(200).json(new ApiResponse(200, userUpiTrx));
});

export const walletBalanceAuth = asyncHandler(async (req, res) => {
    const { userName, authToken } = req.body;
    let user = await userDB.findOne({ userName: userName, trxAuthToken: authToken, isActive: true });
    if (!user) {
        return res.status(401).json({ message: "Failed", data: "Invalid Credential !" })
    }

    let userResp = {
        status_code: 200,
        status_msg: "OK",
        e_wallet_balance: user?.EwalletBalance,
        upi_wallet_balance: user?.upiWalletBalance
    }
    res.status(200).json(new ApiResponse(200, userResp));
});