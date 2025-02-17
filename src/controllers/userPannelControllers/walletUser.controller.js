import { ApiResponse } from "../../utils/ApiResponse.js"
import upiWalletModel from "../../models/upiWallet.model.js"
import userDB from "../../models/user.model.js"
import eWalletModel from "../../models/Ewallet.model.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
// import { ApiError } from "../../utils/ApiError.js"

export const upiWalletTrx = asyncHandler(async (req, res) => {
    try {
        let userId = req.user._id;

        // Using correct read preference method
        let userUpiTrx = await upiWalletModel
            .find({ memberId: userId })
            .read('secondaryPreferred')
            .lean(); // Optimize performance

        if (!userUpiTrx.length) {
            return res.status(400).json({ message: "Failed", data: "No Trx Available!" });
        }

        res.status(200).json(new ApiResponse(200, userUpiTrx));
    } catch (error) {
        console.error("Error fetching UPI transactions:", error);
        res.status(500).json({ message: "Error", error: error.message });
    }
});

export const eWalletTrx = asyncHandler(async (req, res) => {
    try {
        let userId = req.user._id;

        let userEwalletTrx = await eWalletModel
            .find({ memberId: userId })
            .read('secondaryPreferred')
            .lean();

        if (!userEwalletTrx.length) {
            return res.status(400).json({ message: "Failed", data: "No Trx Available!" });
        }

        res.status(200).json(new ApiResponse(200, userEwalletTrx));
    } catch (error) {
        console.error("Error fetching eWallet transactions:", error);
        res.status(500).json({ message: "Error", error: error.message });
    }
});

export const upiToEwalletTrx = asyncHandler(async (req, res) => {
    try {
        let userId = req.user._id;

        // Fetch transactions with correct read preference
        let userUpiTrx = await upiWalletModel
            .find({ memberId: userId, transactionType: "Dr." })
            .read('secondaryPreferred')
            .lean(); // Optimize performance

        if (!userUpiTrx.length) {
            return res.status(400).json({ message: "Failed", data: "No Transactions Available!" });
        }

        res.status(200).json(new ApiResponse(200, userUpiTrx));
    } catch (error) {
        console.error("Error fetching UPI to E-Wallet transactions:", error);
        res.status(500).json({ message: "Error", error: error.message });
    }
});

export const eWalletToPayOutTrx = asyncHandler(async (req, res) => {
    let userId = req.user._id;

    const aggregationOptions = {
        readPreference: 'secondaryPreferred'
    };

    let userUpiTrx = await eWalletModel.find({ memberId: userId, transactionType: "Dr." }, aggregationOptions);
    if (userUpiTrx.length === 0) {
        return res.status(400).json({ message: "Failed", data: "No Trx Avabile !" })
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