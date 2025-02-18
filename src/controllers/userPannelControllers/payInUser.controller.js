import { ApiResponse } from "../../utils/ApiResponse.js"
import QrGenerationModel from "../../models/qrGeneration.model.js"
import userDB from "../../models/user.model.js"
import payInModelSuccess from "../../models/payIn.model.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import { ApiError } from "../../utils/ApiError.js"
import mongoose from "mongoose";
import { Parser } from "json2csv"

const mongoDBObJ = mongoose.Types.ObjectId;

export const allPayInTransactionGeneration = asyncHandler(async (req, res) => {
    let userId = req.user._id.toString()
    let { page = 1, limit = 25, keyword = "", startDate, endDate, export: exportToCSV } = req.query
    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

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

    let matchFilters = {
        memberId: new mongoDBObJ(userId),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { trxId: { $regex: trimmedKeyword, $options: "i" } },
                { name: { $regex: trimmedKeyword, $options: "i" } },
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
        {
            $lookup: {
                from: "users",
                localField: "memberId",
                foreignField: "_id",
                as: "userInfo"
            }
        }, {
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
                "memberId": 1,
                "trxId": 1,
                "amount": 1,
                "name": 1,
                "callBackStatus": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "userInfo._id": 1,
                "userInfo.memberId": 1
            }
        },
        // { $sort: { createdAt: -1 } }
    ]

    QrGenerationModel.aggregate(aggregationPipeline, aggregationOptions).then(async (data) => {
        if (data.length === 0) {
            return res.status(200).json({ message: "Failed", data: "No Trx Avabile !" })
        }

        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "memberId",
                "trxId",
                "amount",
                "name",
                "callBackStatus",
                "createdAt",
                "updatedAt",
                "_id",
                "memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(data);

            res.header('Content-Type', 'text/csv');
            res.attachment(`allPayInTransactions-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }

        const totalDocs = await QrGenerationModel.countDocuments(matchFilters);

        res.status(200).json(new ApiResponse(200, data, totalDocs));
    }).catch((error) => {
        res.status(500).json({ message: "Failed", data: "Some Inter Server Error!" })
    })
})

export const allPayInTransactionSuccess = asyncHandler(async (req, res) => {
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

    let matchFilters = {
        memberId: new mongoDBObJ(userId),
        memberId: new mongoDBObJ(userId),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(trimmedKeyword && {
            $or: [
                { trxId: { $regex: trimmedKeyword, $options: "i" } },
                { name: { $regex: trimmedKeyword, $options: "i" } },
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
        {
            $lookup:
                { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" }
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
            $project:
            {
                "_id": 1,
                "memberId": 1,
                "payerName": 1,
                "trxId": 1,
                "amount": 1,
                "chargeAmount": 1,
                "finalAmount": 1,
                "vpaId": 1,
                "bankRRN": 1,
                "isSuccess": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "userInfo._id": 1,
                "userInfo.memberId": 1
            }
        },
        // { $sort: { createdAt: -1 } }
    ]

    payInModelSuccess.aggregate(aggregationPipeline, aggregationOptions).then(async (data) => {
        if (data.length === 0) {
            return res.status(200).json({ message: "Failed", data: "No Trx Avabile !" })
        }
        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "memberId",
                "payerName",
                "trxId",
                "amount",
                "chargeAmount",
                "finalAmount",
                "vpaId",
                "bankRRN",
                "isSuccess",
                "createdAt",
                "updatedAt",
                "_id",
                "memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(data);

            res.header('Content-Type', 'text/csv');
            res.attachment(`AllPayIn-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }

        const totalDocs = await payInModelSuccess.countDocuments(matchFilters)

        res.status(200).json(new ApiResponse(200, data, totalDocs))
    }).catch((error) => {
        res.status(500).json({ message: "Failed", data: "Some Inter Server Error!" })
    })
})

export const userPaymentStatusCheckPayIn = asyncHandler(async (req, res) => {
    let { userName, authToken, trxId } = req.body;

    let user = await userDB.aggregate([{ $match: { $and: [{ userName: userName }, { trxAuthToken: authToken }, { isActive: true }] } }]);

    if (user.length === 0) {
        return res.status(400).json({ message: "Failed", data: "User not valid or Inactive !" })
    }

    let pack = await QrGenerationModel.aggregate([{ $match: { $and: [{ trxId: trxId }, { memberId: new mongoDBObJ(user[0]._id) }] } }, { $lookup: { from: "payinrecodes", localField: "trxId", foreignField: "trxId", as: "trxInfo" } }, {
        $unwind: {
            path: "$trxInfo",
            preserveNullAndEmptyArrays: true,
        },
    }, { $addFields: { rrn: "$trxInfo.bankRRN", chargeAmount: "$trxInfo.chargeAmount" } }, {
        $project: { "trxId": 1, "amount": 1, "chargeAmount": 1, "name": 1, "callBackStatus": 1, "createdAt": 1, "_id": 0, "rrn": 1 }
    }]);

    if (!pack.length) {
        return res.status(400).json({ message: "Failed", data: "No Transaction !" })
    }

    if (pack.length)
        res.status(200).json(new ApiResponse(200, pack[0]))
});