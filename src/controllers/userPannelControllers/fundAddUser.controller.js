import { ApiResponse } from "../../utils/ApiResponse.js"
import fundAddModel from "../../models/fundAdd.model.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import { ApiError } from "../../utils/ApiError.js"

export const addFundRequest = asyncHandler(async (req, res) => {
    let userId = req?.user?._id
    const { transactionAmount, payeeName, payeeAccountNumber, payeeIFSC, payeeBankName, paymentMode, bankRRN, paymentDateTime } = req.body;
    let uniqueTrxId = `ADD${Date.now()}FU`

    let fundRaise = {
        memberId: userId,
        transactionType: "Cr.",
        transactionAmount: transactionAmount,
        payeeName: payeeName,
        payeeAccountNumber: payeeAccountNumber,
        payeeIFSC: payeeIFSC,
        payeeBankName: payeeBankName,
        paymentMode: paymentMode,
        bankRRN: bankRRN,
        trxId: uniqueTrxId,
        description: `Fund Request Amount: ${transactionAmount} BankRRN: ${bankRRN} trxId: ${uniqueTrxId}`,
        paymentDateTime: paymentDateTime,
    }
    let fundAddCreate = await fundAddModel.create(fundRaise);

    if (!fundAddCreate) {
        return res.status(400).json({ message: "Failed", data: "Not Created Fund Add Request !" })
    }
    res.status(200).json(new ApiResponse(201, fundAddCreate));
});

export const getFundRequest = asyncHandler(async (req, res) => {
    let userId = req?.user?._id
    let supportTicketCreate = await fundAddModel.find({ memberId: userId }).sort({ createdAt: -1 });;
    if (supportTicketCreate.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Fund Request Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, supportTicketCreate));
});

export const singleFundRequest = asyncHandler(async (req, res) => {
    let trxId = req?.params?.trxId;
    let userId = req?.user?._id
    let addFund = await fundAddModel.find({ trxId: trxId, memberId: userId });
    if (addFund.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Fund Request Found !" })
    }
    res.status(200).json(new ApiResponse(200, addFund));
});