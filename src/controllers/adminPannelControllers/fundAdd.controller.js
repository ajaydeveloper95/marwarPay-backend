import fundAddModel from "../../models/fundAdd.model.js";
import userDB from "../../models/user.model.js";
import walletModel from "../../models/Ewallet.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const allGenFundRequest = asyncHandler(async (req, res) => {
    let pack = await fundAddModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "payeeName": 1, "payeeAccountNumber": 1, "payeeBankName": 1, "paymentMode": 1, "bankRRN": 1, "trxId": 1, "paymentDateTime": 1, "description": 1, "transactionStatus": 1, "payeeIFSC": 1, "isSuccess": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }])
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
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "payeeName": 1, "payeeAccountNumber": 1, "payeeBankName": 1, "paymentMode": 1, "bankRRN": 1, "trxId": 1, "paymentDateTime": 1, "description": 1, "transactionStatus": 1, "payeeIFSC": 1, "isSuccess": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }])
    if (pack.length === 0) {
        return res.status(400).json({ message: "Failed", data: "Not Fund Request Found !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const updateFundRequestStatus = asyncHandler(async (req, res) => {
    let fundId = req?.params?.id;
    const { isSuccess } = req.body;

    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    try {
        session.startTransaction();
        const opts = { session };

        if (isSuccess === "Success") {
            let pack = await fundAddModel.findOneAndUpdate({ _id: fundId, isSuccess: "Pending" }, { isSuccess: isSuccess }, { new: true, session });

            if (pack?.length === 0 || pack == null) {
                await session.abortTransaction();
                return res.status(400).json({ message: "Failed", data: "Already Success Or Failed && Not Found !" })
            }

            let finalEwalletAdded = pack?.transactionAmount

            // update ewallets
            let userWallet = await userDB.findByIdAndUpdate(pack?.memberId, { $inc: { EwalletBalance: + finalEwalletAdded } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - finalEwalletAdded;

            // ewallet store 
            let walletModelDataStore = {
                memberId: pack?.memberId,
                transactionType: "Cr.",
                transactionAmount: finalEwalletAdded,
                beforeAmount: beforeAmount,
                chargeAmount: 0,
                afterAmount: afterAmount,
                description: `#FundRequest Successfully Cr. amount: ${finalEwalletAdded} with uniqueId: ${pack?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await session.commitTransaction();
            return res.status(200).json(new ApiResponse(200, pack))
        } else {
            let pack = await fundAddModel.findOneAndUpdate({ _id: fundId, isSuccess: "Pending" }, { isSuccess: isSuccess }, { new: true, session });

            if (pack?.length === 0 || pack == null) {
                await session.abortTransaction();
                return res.status(400).json({ message: "Failed", data: "Already Success Or Failed && Not Found !" })
            }
            // Commit the transaction
            await session.commitTransaction();
            return res.status(200).json(new ApiResponse(200, pack))
        }
    } catch (error) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Failed", data: "Not Update Fund Request !" })
    } finally {
        session.endSession();
    }
});

export const allPendingFundRequest = asyncHandler(async (req, res) => {
    let pack = await fundAddModel.aggregate([{ $match: { isSuccess: "Pending" } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "payeeName": 1, "payeeAccountNumber": 1, "payeeBankName": 1, "paymentMode": 1, "bankRRN": 1, "trxId": 1, "paymentDateTime": 1, "description": 1, "transactionStatus": 1, "payeeIFSC": 1, "isSuccess": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }]);
    if (pack.length === 0) {
        return res.status(400).json({ message: "Failed", data: "Not Fund Request Found !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});