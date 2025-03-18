import fundAddModel from "../../models/fundAdd.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const allGenFundRequest = asyncHandler(async (req, res) => {
    let pack = await fundAddModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "payeeName": 1, "payeeAccountNumber": 1, "payeeBankName": 1, "paymentMode": 1, "bankRRN": 1, "trxId": 1, "paymentDateTime": 1, "description": 1, "transactionStatus": 1, "payeeIFSC": 1, "isStatus": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }])
    if (pack.length === 0) {
        return new ApiError(400, "No Fund Request Found !")
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const getSingleFundRequest = asyncHandler(async (req, res) => {
    let fundTrxId = req.params.trxId;
    // let pack = await supportModel.find({ TicketID: ticketId })
    let pack = await fundAddModel.aggregate([{ $match: { trxId: fundTrxId } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "payeeName": 1, "payeeAccountNumber": 1, "payeeBankName": 1, "paymentMode": 1, "bankRRN": 1, "trxId": 1, "paymentDateTime": 1, "description": 1, "transactionStatus": 1, "payeeIFSC": 1, "isStatus": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }])
    if (pack.length === 0) {
        return res.status(400).json({ message: "Failed", data: "Not Fund Request Found !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const updateFundRequestStatus = asyncHandler(async (req, res) => {
    let ticketId = req.params.id;
    const { isStatus } = req.body;
    let pack = await fundAddModel.findByIdAndUpdate(ticketId, { isStatus: isStatus }, { new: true });
    if (pack.length === 0) {
        return res.status(400).json({ message: "Failed", data: "Not Fund Request Found !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const allPendingFundRequest = asyncHandler(async (req, res) => {
    let pack = await fundAddModel.aggregate([{ $match: { isStatus: "Pending" } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "payeeName": 1, "payeeAccountNumber": 1, "payeeBankName": 1, "paymentMode": 1, "bankRRN": 1, "trxId": 1, "paymentDateTime": 1, "description": 1, "transactionStatus": 1, "payeeIFSC": 1, "isStatus": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }]);
    if (pack.length === 0) {
        return res.status(400).json({ message: "Failed", data: "Not Fund Request Found !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});