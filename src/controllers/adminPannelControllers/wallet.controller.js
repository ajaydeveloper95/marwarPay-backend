import eWalletModel from "../../models/Ewallet.model.js";
import upiWalletModel from "../../models/upiWallet.model.js";
import payInModel from "../../models/payIn.model.js";
import userDB from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import mongoose from "mongoose";

export const getAllTransactionUpi = asyncHandler(async (req, res) => {
    let pack = await upiWalletModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "beforeAmount": 1, "afterAmount": 1, "description": 1, "transactionStatus": 1, "createdAt": 1, "updatedAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }]);
    if (!pack) {
        return res.status(200).json({ message: "Success", data: "No Transaction Avabile!" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const getAllTransactionEwallet = asyncHandler(async (req, res) => {
    let pack = await eWalletModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "transactionType": 1, "transactionAmount": 1, "beforeAmount": 1, "chargeAmount": 1, "afterAmount": 1, "description": 1, "transactionStatus": 1, "createdAt": 1, "updatedAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }]);
    if (!pack) {
        return res.status(200).json({ message: "Success", data: "No Transaction Avabile!" })
    }
    res.status(200).json(new ApiResponse(200, pack))
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
            description: `Successfully Cr. amount: ${transactionAmount}`,
            transactionStatus: "Success",
        }
        let trxStoreUpiWallet = {
            memberId: userData._id,
            transactionType: "Dr.",
            transactionAmount: transactionAmount,
            beforeAmount: beforeAmountUpiWallet,
            afterAmount: userData.upiWalletBalance,
            description: `Successfully Dr. amount: ${transactionAmount}`,
            transactionStatus: "Success",
        }
        let eWalletStore = await eWalletModel.create(trxStoreEwallet);
        await upiWalletModel.create(trxStoreUpiWallet);
        res.status(200).json(new ApiResponse(200, eWalletStore))
    } else {
        res.status(400).json({ message: "Failed", data: `Transaction amount grather then upi Wallet Amount : ${userData.upiWalletBalance} !` })
    }
});

export const eWalletFundCredit = asyncHandler(async (req, res) => {
    let query = req.params.id;
    const { transactionAmount, transactionType } = req.body;
    let userData = await userDB.findById(query, "_id userName memberId EwalletBalance");
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }
    // Ewallet fund credit
    let beforeAmount = userData?.EwalletBalance;
    let updateUserWallet = beforeAmount + transactionAmount;
    userData.EwalletBalance = updateUserWallet;
    await userData.save();

    let Ewallet = await eWalletModel.create({ memberId: userData?._id, transactionType: transactionType, transactionAmount: transactionAmount, beforeAmount: beforeAmount, afterAmount: updateUserWallet, description: `SuccessFully ${transactionType} Amount : ${transactionAmount}`, transactionStatus: "Success" })

    res.status(200).json(new ApiResponse(200, Ewallet))
});

export const eWalletFundDebit = asyncHandler(async (req, res) => {
    let query = req.params.id;
    const { transactionAmount, transactionType } = req.body;
    let userData = await userDB.findById(query, "_id userName memberId EwalletBalance")
    if (!userData) {
        return res.status(404).json({ message: "Failed", data: "User not Found !" })
    }

    // Ewallet fund credit
    let beforeAmount = userData?.EwalletBalance;
    let updateUserWallet = beforeAmount - transactionAmount;
    userData.EwalletBalance = updateUserWallet;
    await userData.save();

    let Ewallet = await eWalletModel.create({ memberId: userData?._id, transactionType: transactionType, transactionAmount: transactionAmount, beforeAmount: beforeAmount, afterAmount: updateUserWallet, description: `SuccessFully ${transactionType} Amount : ${transactionAmount}`, transactionStatus: "Success" })
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