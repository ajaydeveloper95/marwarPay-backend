import { ApiResponse } from "../../utils/ApiResponse.js"
import payOutModelGen from "../../models/payOutGenerate.model.js"
import payOutModelSuccess from "../../models/payOutSuccess.model.js"
import userDB from "../../models/user.model.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
// import { ApiError } from "../../utils/ApiError.js"
import mongoose from "mongoose";

const mongoDBObJ = mongoose.Types.ObjectId;

export const allPayOutTransactionGeneration = asyncHandler(async (req, res) => {
    let userId = req.user._id

    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    let user = await payOutModelGen.aggregate([{ $match: { memberId: new mongoose.Types.ObjectId(String(userId)) } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        },
    }, { $project: { "_id": 1, "memberId": 1, "trxId": 1, "amount": 1, "mobileNumber": 1, "accountHolderName": 1, "accountNumber": 1, "ifscCode": 1, "isSuccess": 1, "createdAt": 1, "updatedAt": 1, "userInfo._id": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }], aggregationOptions).then((data) => {
        if (data.length === 0) {
            return res.status(200).json({ message: "Failed", data: "No Trx Avabile !" })
        }
        res.status(200).json(new ApiResponse(200, data))
    }).catch((error) => {
        res.status(500).json({ message: "Failed", data: "Some Inter Server Error!" })
    })
})

export const allPayOutTransactionSuccess = asyncHandler(async (req, res) => {
    let userId = req.user._id;

    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    let user = await payOutModelSuccess.aggregate([{ $match: { memberId: new mongoose.Types.ObjectId(String(userId)) } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        },
    }, { $project: { "_id": 1, "memberId": 1, "bankRRN": 1, "trxId": 1, "amount": 1, "chargeAmount": 1, "finalAmount": 1, "isSuccess": 1, "createdAt": 1, "updatedAt": 1, "userInfo._id": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }], aggregationOptions).then((data) => {
        if (data.length === 0) {
            return res.status(200).json({ message: "Failed", data: "No Trx Avabile !" })
        }
        res.status(200).json(new ApiResponse(200, data,))
    }).catch((error) => {
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