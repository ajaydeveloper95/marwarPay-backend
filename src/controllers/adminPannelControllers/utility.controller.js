import userDB from "../../models/user.model.js";
import packageModel from "../../models/package.model.js";
import payOutChargeModel from "../../models/payOutCharge.model.js";
import payInChargeModel from "../../models/payInCharge.model.js";
import apiPayInModel from "../../models/apiPayInSwitch.model.js";
import ticketInModel from "../../models/supportTicket.model.js";
import apiPayOutModel from "../../models/apiPayOutSwitch.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import axios from "axios";
import crypto from "crypto";

function generateSignatureImpactPeekFlipzik(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', process.env.IMPACTPEEK_FLIPZIK_SECRET_KEY);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

export const getBalanceFetch = asyncHandler(async (req, res) => {
    let bankingApiURL = "https://api.waayupay.com/api/api/api-module/payout/balance";
    let bankingSec = {
        clientId: process.env.WAAYU_CLIENT_ID || "adb25735-69c7-4411-a120-5f2e818bdae5",
        secretKey: process.env.WAAYU_SECRET_KEY || "6af59e5a-7f28-4670-99ae-826232b467be"
    }
    let optionsHead = {
        Headers: {
            "Content-Type": "application/json"
        }
    }
    axios.post(bankingApiURL, bankingSec, optionsHead).then((result) => {
        let balance = result?.data?.balance
        return res.status(200).json(new ApiResponse(200, balance))
    }).catch((err) => {
        return res.status(400).json({ message: "Failed", data: "Balance Not Fetch Successfully !" })
    })
})

export const getBalanceFetchImpactPeek = asyncHandler(async (req, res) => {
    let bankingApiURL = "https://api.waayupay.com/api/api/api-module/payout/balance";
    let bankingSec = {
        clientId: process.env.WAAYU_CLIENT_ID_TWO || "bb31477b-f71e-4d4c-9dfb-30adb2d20ef3",
        secretKey: process.env.WAAYU_SECRET_KEY_TWO || "6f58e8db-747a-4431-b28a-d9bcad57aa31"
    }
    let optionsHead = {
        Headers: {
            "Content-Type": "application/json"
        }
    }
    axios.post(bankingApiURL, bankingSec, optionsHead).then((result) => {
        let balance = result?.data?.balance
        return res.status(200).json(new ApiResponse(200, balance))
    }).catch((err) => {
        return res.status(400).json({ message: "Failed", data: "Balance Not Fetch Successfully !" })
    })
})

export const getBalanceImpactPeekFlipzik = asyncHandler(async (req, res) => {
    const timestamp = Date.now().toString();
    const signature = generateSignatureImpactPeekFlipzik(timestamp, "", `/api/v1/payout/balance/1`, '', 'GET');
    console.log(signature, "sign")
    console.log(timestamp, "timestamp")

    let bankingApiURL = "https://api.flipzik.com/api/v1/payout/balance/1";

    const headers = {
        "X-Timestamp": timestamp,
        "access_key": process.env.FLIPZIK_ACCESS_KEY,
        "signature": signature
    };

    try {
        const response = await axios.get(bankingApiURL, { headers });

        // axios.get(bankingApiURL, optionsHead).then((result) => {
        //     console.log(result?.data, "result")
        //     let balance = result?.data?.balance
        //     console.log(balance, "balalcne")
        //     return res.status(200).json(new ApiResponse(200, balance))
        // }).
        console.log(response, "data")
        let balance = result?.data?.balance
        console.log(balance, "balalcne")
        return res.status(200).json(new ApiResponse(200, balance))
    } catch (err) {
        console.log(err, "error")
        return res.status(400).json({ message: "Failed", data: "Balance Not Fetch Successfully !" })
    }
})

export const getUserList = asyncHandler(async (req, res) => {
    let userInfo = await userDB.aggregate([{ $match: { memberType: { $in: ["Users", "Retailer"] } } }, {
        $project: { "_id": 1, "memberId": 1, "fullName": 1 }
    }, { $sort: { createdAt: -1 } }])
    if (!userInfo.length) {
        return res.status(400).json({ message: "Failed", data: "Not Active User Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, userInfo))
})

export const getUserListWithWallet = asyncHandler(async (req, res) => {
    let userInfo = await userDB.aggregate([{ $match: { memberType: { $in: ["Users", "Retailer"] } } }, {
        $project: { "_id": 1, "memberId": 1, "fullName": 1, "upiWalletBalance": 1, "EwalletBalance": 1 }
    }, { $sort: { createdAt: -1 } }])
    if (!userInfo.length) {
        return res.status(400).json({ message: "Failed", data: "Not Active User Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, userInfo))
})

export const getUserWithSwitchApi = asyncHandler(async (req, res) => {
    let userInfo = await userDB.aggregate([{ $match: { memberType: { $in: ["Users", "Retailer"] } } }, {
        $lookup: {
            from: "payinswitches",
            localField: "payInApi",
            foreignField: "_id",
            as: "payInApi"
        }
    }, { $unwind: { path: "$payInApi", preserveNullAndEmptyArrays: true } }, {
        $lookup: {
            from: "payoutswitches",
            localField: "payOutApi",
            foreignField: "_id",
            as: "payOutApi"
        }
    }, { $unwind: { path: "$payOutApi", preserveNullAndEmptyArrays: true } }, {
        $project: { "_id": 1, "memberId": 1, "fullName": 1, "payInApi._id": 1, "payInApi.apiName": 1, "payInApi.isActive": 1, "payOutApi._id": 1, "payOutApi.apiName": 1, "payOutApi.isActive": 1 }
    }, { $sort: { createdAt: -1 } }])
    if (!userInfo.length) {
        return res.status(400).json({ message: "Failed", data: "Not Active User Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, userInfo))
})

export const getAllMemberList = asyncHandler(async (req, res) => {
    let userInfo = await userDB.aggregate([{
        $project: { "_id": 1, "memberId": 1, "fullName": 1 }
    }, { $sort: { createdAt: -1 } }])
    if (!userInfo.length) {
        return res.status(400).json({ message: "Failed", data: "Not Active User Avabile !" })
    }
    res.status(200).json(new ApiResponse(200, userInfo))
})

export const getPackageList = asyncHandler(async (req, res) => {
    let packageData = await packageModel.aggregate([{ $match: { isActive: true } }, {
        $project: { "_id": 1, "packageName": 1 }
    }, { $sort: { createdAt: -1 } }])
    res.status(200).json(new ApiResponse(200, packageData))
})

export const getPayOutApiList = asyncHandler(async (req, res) => {
    let apiPayOut = await apiPayOutModel.aggregate([{ $match: { isActive: true } }, {
        $project: { "_id": 1, "apiName": 1, "isActive": 1 }
    }, { $sort: { createdAt: -1 } }])

    if (!apiPayOut.length) {
        return res.status(400).json({ message: "Failed", data: "Not Payout Api Found !" })
    }
    res.status(200).json(new ApiResponse(200, apiPayOut))
})

export const getPayInApiList = asyncHandler(async (req, res) => {
    let apiPayIn = await apiPayInModel.aggregate([{ $match: { isActive: true } }, {
        $project: { "_id": 1, "apiName": 1, "isActive": 1 }
    }, { $sort: { createdAt: -1 } }])

    if (!apiPayIn.length) {
        return res.status(400).json({ message: "Failed", data: "Not Payin Api Found !" })
    }
    res.status(200).json(new ApiResponse(200, apiPayIn))
})

export const getAllGenTicketList = asyncHandler(async (req, res) => {
    let apiPayIn = await ticketInModel.aggregate([{
        $project: { "_id": 1, "TicketID": 1, "relatedTo": 1 }
    }, { $sort: { createdAt: -1 } }])

    if (!apiPayIn.length) {
        return res.status(400).json({ message: "Failed", data: "Not Ticket Found !" })
    }
    res.status(200).json(new ApiResponse(200, apiPayIn))
})

export const getPendingTicketList = asyncHandler(async (req, res) => {
    let apiPayIn = await ticketInModel.aggregate([{ $match: { $expr: { isStatus: "Pending" } } }, {
        $project: { "_id": 1, "TicketID": 1, "relatedTo": 1 }
    }, { $sort: { createdAt: -1 } }])

    if (!apiPayIn.length) {
        return res.status(400).json({ message: "Failed", data: "Not Pending Ticket Found !" })
    }
    res.status(200).json(new ApiResponse(200, apiPayIn))
})

export const getPayOutPackageList = asyncHandler(async (req, res) => {
    let payoutPackage = await payOutChargeModel.aggregate([{ $match: { isActive: true } }, {
        $project: { "_id": 1, "payOutPackageName": 1, }
    }, { $sort: { createdAt: -1 } }])

    if (!payoutPackage.length) {
        return res.status(400).json({ message: "Failed", data: "No Payout package Found !" })
    }
    res.status(200).json(new ApiResponse(200, payoutPackage))
})

export const getPayInPackageList = asyncHandler(async (req, res) => {
    let payInPackage = await payInChargeModel.aggregate([{ $match: { isActive: true } }, {
        $project: { "_id": 1, "payInPackageName": 1, }
    }, { $sort: { createdAt: -1 } }])

    if (!payInPackage.length) {
        return res.status(400).json({ message: "Failed", data: "No Payin package Found !" })
    }
    res.status(200).json(new ApiResponse(200, payInPackage))
})