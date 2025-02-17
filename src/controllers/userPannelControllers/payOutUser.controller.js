import { ApiResponse } from "../../utils/ApiResponse.js"
import payOutModelGen from "../../models/payOutGenerate.model.js"
import payOutModelSuccess from "../../models/payOutSuccess.model.js"
import userDB from "../../models/user.model.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
// import { ApiError } from "../../utils/ApiError.js"
import mongoose from "mongoose";

const mongoDBObJ = mongoose.Types.ObjectId;

export const allPayOutTransactionGeneration = asyncHandler(async (req, res) => {
    try {
        let userId = req.user._id.toString()
        let { page = 1, limit = 25, keyword = "", startDate, endDate, memberId, status, export: exportToCSV } = req.query;
        page = Number(page) || 1;
        limit = Number(limit) || 25;
        const skip = (page - 1) * limit;
        const trimmedKeyword = keyword.trim();
        const trimmedMemberId = memberId && mongoDBObJ.isValid(String(memberId))
            ? new mongoDBObJ(String(memberId.trim()))
            : null;
        const trimmedStatus = status
            ? status.trim()
            : "";


        let dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }
        const sortDirection = Object.keys(dateFilter).length > 0 ? 1 : -1;

        const matchFilters = {
            memberId: new mongoDBObJ(userId),
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(trimmedKeyword && {
                $or: [
                    { trxId: { $regex: trimmedKeyword, $options: "i" } },
                    // { accountHolderName: { $regex: trimmedKeyword, $options: "i" } }
                ]
            }),
            ...(trimmedStatus && { isSuccess: { $regex: trimmedStatus, $options: "i" } }),
            ...(trimmedMemberId && { memberId: trimmedMemberId })
        };

        const aggregationOptions = {
            readPreference: 'secondaryPreferred'
        };

        const aggregationPipeline = [
            { $match: { ...matchFilters } },
            { $sort: { createdAt: sortDirection } },
            {
                $lookup: {
                    from: "users",
                    localField: "memberId",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            {
                $unwind: {
                    path: "$userInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    "_id": 1,
                    "memberId": 1,
                    "trxId": 1,
                    "amount": 1,
                    "mobileNumber": 1,
                    "accountHolderName": 1,
                    "accountNumber": 1,
                    "ifscCode": 1,
                    "isSuccess": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "userInfo._id": 1,
                    "userInfo.memberId": 1
                }
            },

            ...(exportToCSV !== "true"
                ? [{ $skip: skip }, { $limit: limit }]
                : []
            ),

            { $sort: { createdAt: -1 } }
        ];

        const payoutDocs = await payOutModelGen.aggregate(aggregationPipeline, aggregationOptions);

        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "trxId",
                "accountHolderName",
                "optxId",
                "accountNumber",
                "ifscCode",
                "amount",
                "isSuccess",
                { value: "payoutSuccessData.chargeAmount", label: "Charge Amount" },
                { value: "payoutSuccessData.finalAmount", label: "Final Amount" },
                "createdAt",
                "status",
                { value: "userInfo.userName", label: "User Name" },
                { value: "userInfo.fullName", label: "Full Name" },
                { value: "userInfo.memberId", label: "Member ID" }
            ];

            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(payoutDocs);

            res.header('Content-Type', 'text/csv');
            res.attachment(`payoutPayments-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }
        const totalDocs = await payOutModelGen.countDocuments(matchFilters);

        if (!payoutDocs || payoutDocs.length === 0) {
            return res.status(400).json({ message: "Failed", data: "No Transaction Available!" });
        }
        res.status(200).json(new ApiResponse(200, payoutDocs, totalDocs))
    } catch (error) {
        console.log("🚀 ~ allPayOutTransactionGeneration ~ error:", error)
        res.status(500).json({ message: "Failed", data: `Internal Server Error: ${err.message}` });
    }

    // let user = await payOutModelGen.aggregate([{ $match: { memberId: new mongoDBObJ(userId) } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
    //     $unwind: {
    //         path: "$userInfo",
    //         preserveNullAndEmptyArrays: true,
    //     },
    // }, { $project: { "_id": 1, "memberId": 1, "trxId": 1, "amount": 1, "mobileNumber": 1, "accountHolderName": 1, "accountNumber": 1, "ifscCode": 1, "isSuccess": 1, "createdAt": 1, "updatedAt": 1, "userInfo._id": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }], aggregationOptions).then((data) => {
    //     if (data.length === 0) {
    //         return res.status(200).json({ message: "Failed", data: "No Trx Avabile !" })
    //     }
    //     res.status(200).json(new ApiResponse(200, data))
    // }).catch((error) => {
    //     res.status(500).json({ message: "Failed", data: "Some Inter Server Error!" })
    // })
})

export const allPayOutTransactionSuccess = asyncHandler(async (req, res) => {
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
            $lookup: {
                from: "users", localField: "memberId", foreignField: "_id", as: "userInfo"
            }
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
                "memberId": 1,
                "bankRRN": 1,
                "trxId": 1,
                "amount": 1,
                "chargeAmount": 1,
                "finalAmount": 1,
                "isSuccess": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "_id": 1,
                "memberId": 1
            }
        },
        { $sort: { createdAt: -1 } }
    ]

    payOutModelSuccess.aggregate(aggregationPipeline, aggregationOptions).then(async (data) => {
        if (data.length === 0) {
            return res.status(200).json({ message: "Failed", data: "No Trx Avabile !" })
        }
        if (exportToCSV === "true") {
            const fields = [
                "_id",
                "memberId",
                "bankRRN",
                "trxId",
                "amount",
                "chargeAmount",
                "finalAmount",
                "isSuccess",
                "createdAt",
                "updatedAt",
                "userInfo._id",
                "userInfo.memberId"
            ];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(data);

            res.header('Content-Type', 'text/csv');
            res.attachment(`AllPayOutTransactionsSuccess-${startDate}-${endDate}.csv`);

            return res.status(200).send(csv);
        }
        const totalDocs = await payOutModelSuccess.countDocuments(matchFilters);
        res.status(200).json(new ApiResponse(200, data, totalDocs));
    }).catch((error) => {
        console.log("payOutModelSuccess.aggregate ~ error:", error);
        res.status(500).json({ message: "Failed", data: "Some Inter Server Error!" })
    })
})

export const userPaymentStatusCheckPayOUt = asyncHandler(async (req, res) => {
    let { userName, authToken, trxId } = req.body;

    let user = await userDB.aggregate([{ $match: { $and: [{ userName: userName }, { trxAuthToken: authToken }, { isActive: true }] } }]);

    if (user.length === 0) {
        return res.status(400).json({ message: "Failed", data: "User not valid or Inactive !" })
    }

    let pack = await payOutModelGen.aggregate([{ $match: { $and: [{ trxId: trxId }, { memberId: new mongoose.Types.ObjectId(String(user[0]._id)) }] } }, { $lookup: { from: "payoutrecodes", localField: "trxId", foreignField: "trxId", as: "trxInfo" } }, {
        $unwind: {
            path: "$trxInfo",
            preserveNullAndEmptyArrays: true,
        },
    }, { $addFields: { rrn: "$trxInfo.bankRRN", chargeAmount: "$trxInfo.chargeAmount" } }, {
        $project: { "trxId": 1, "amount": 1, chargeAmount: 1, "accountHolderName": 1, "accountNumber": 1, "ifscCode": 1, "createdAt": 1, "_id": 0, "isSuccess": 1, rrn: 1 }
    }]);

    if (!pack.length) {
        return res.status(400).json({ message: "Failed", data: "No Transaction !" })
    }

    if (pack.length)
        res.status(200).json(new ApiResponse(200, pack[0]))
});