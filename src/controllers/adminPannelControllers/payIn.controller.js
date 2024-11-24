import axios from "axios";
import qrGenerationModel from "../../models/qrGeneration.model.js";
import payInModel from "../../models/payIn.model.js";
import upiWalletModel from "../../models/upiWallet.model.js";
import userDB from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import callBackResponseModel from "../../models/callBackResponse.model.js";
import FormData from "form-data";

export const allGeneratedPayment = asyncHandler(async (req, res) => {
    let queryObject = req.query;
    let payment = await qrGenerationModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } },
    {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, {
        $project: { "_id": 1, "trxId": 1, "amount": 1, "name": 1, "callBackStatus": 1, "qrData": 1, "createdAt": 1, "userInfo.userName": 1, "userInfo.fullName": 1, "userInfo.memberId": 1 }
    }, { $sort: { createdAt: -1 } }
    ]).then((result) => {
        if (result.length === 0) {
            return res.status(400).json({ message: "Failed", data: "No Transaction Avabile !" })
        }
        res.status(200).json(new ApiResponse(200, result))
    }).catch((err) => {
        res.status(400).json({ message: "Failed", data: `Internal Server Error ${err}` })
    })
});

export const allSuccessPayment = asyncHandler(async (req, res) => {
    let payment = await payInModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } },
    {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, {
        $project: { "_id": 1, "trxId": 1, "amount": 1, "chargeAmount": 1, "finalAmount": 1, "payerName": 1, "isSuccess": 1, "vpaId": 1, "bankRRN": 1, "createdAt": 1, "userInfo.userName": 1, "userInfo.fullName": 1, "userInfo.memberId": 1 }
    }, { $sort: { createdAt: -1 } }
    ]).then((result) => {
        if (result.length === 0) {
            res.status(400).json({ message: "Failed", data: "No Transaction Avabile !" })
        }
        res.status(200).json(new ApiResponse(200, result))
    }).catch((err) => {
        res.status(400).json({ message: "Failed", data: `Internal Server Error ${err}` })
    })
});

export const generatePayment = asyncHandler(async (req, res) => {
    const { userName, authToken, name, amount, trxId, mobileNumber } = req.body

    let user = await userDB.aggregate([{ $match: { $and: [{ userName: userName }, { trxAuthToken: authToken }, { isActive: true }] } }, { $lookup: { from: "payinswitches", localField: "payInApi", foreignField: "_id", as: "payInApi" } }, {
        $unwind: {
            path: "$payInApi",
            preserveNullAndEmptyArrays: true,
        }
    },])

    if (user.length === 0) {
        return res.status(400).json({ message: "Failed", data: "Invalid User or InActive user Please Try again !" })
    }

    // Banking api Switch for 
    let apiSwitchApiOption = user[0]?.payInApi?.apiName;
    switch (apiSwitchApiOption) {
        case "neyopayPayIn":
            let url = user[0].payInApi.apiURL
            let formData = new FormData()
            formData.append("amount", amount)
            formData.append("Apikey", "14205")
            formData.append("url", "https://zanithpay.com")
            formData.append("transactionId", trxId)
            formData.append("mobile", mobileNumber)

            // store database
            await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId }).then(async (data) => {
                // Bankking api calling !
                let resp = await axios.post(url, formData)

                let dataApiResponse = {
                    status_msg: resp?.data?.message,
                    status: resp?.data?.status == true ? 200 : 400,
                    qrImage: resp?.data?.Payment_link,
                    trxID: trxId,
                }

                if (resp?.data?.status !== true) {
                    data.callBackStatus = "Failed";
                    await data.save();
                    return res.status(400).json({ message: "Failed", data: dataApiResponse })
                } else {
                    data.qrData = resp?.data?.Payment_link;
                    data.refId = resp?.data?.refId;
                    await data.save();
                }

                // Send response
                return res.status(200).json(new ApiResponse(200, dataApiResponse))
            }).catch((error) => {
                if (error.code == 11000) {
                    return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                } else {
                    return res.status(500).json({ message: "Failed", data: "Internel Server Error !" })
                }
            })
            break;
        case "marwarpayInSwitch":
            // store database
            await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId }).then(async (data) => {
                // Banking Api
                let API_URL = `https://www.marwarpay.in/portal/api/generateQrAuth?memberid=MPAPI903851&txnpwd=AB23&name=${name}&amount=${amount}&txnid=${trxId}`
                let bank = await axios.get(API_URL);

                let dataApiResponse = {
                    status_msg: bank?.data?.status_msg,
                    status: bank?.data?.status_code,
                    qrImage: bank?.data?.qr_image,
                    qr: bank?.data?.intent,
                    trxID: data?.trxId,
                }

                if (bank?.data?.status_code !== 200) {
                    data.callBackStatus = "Failed";
                    await data.save();
                    return res.status(400).json({ message: "Failed", data: dataApiResponse })
                } else {
                    data.qrData = bank?.data?.qr_image;
                    data.qrIntent = bank?.data?.intent;
                    data.refId = bank?.data?.refId;
                    await data.save();
                }

                // Send response
                return res.status(200).json(new ApiResponse(200, dataApiResponse))
            }).catch((error) => {
                if (error.code == 11000) {
                    return res.status(500).json({ message: "Failed", data: "trx Id duplicate Find !" })
                } else {
                    return res.status(500).json({ message: "Failed", data: "Internel Server Error !" })
                }
            })
            break;
        default:
            let dataApiResponse = {
                status_msg: "failed",
                status: 400,
                trxID: trxId,
            }
            return res.status(400).json({ message: "Failed", data: dataApiResponse })
    }
});

export const paymentStatusCheck = asyncHandler(async (req, res) => {
    let trxIdGet = req.params.trxId;
    let pack = await qrGenerationModel.aggregate([{ $match: { trxId: trxIdGet } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } },
    {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, {
        $project: { "_id": 1, "trxId": 1, "amount": 1, "name": 1, "callBackStatus": 1, "qrData": 1, "createdAt": 1, "userInfo.userName": 1, "userInfo.fullName": 1, "userInfo.memberId": 1 }
    }]);
    if (!pack.length) {
        return res.status(400).json({ message: "Faild", data: "No Transaction !" })
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const paymentStatusUpdate = asyncHandler(async (req, res) => {
    let trxIdGet = req.params.trxId;
    let pack = await qrGenerationModel.findOne({ trxId: trxIdGet }).then(async (data) => {
        if (!data) {
            return res.status(400).json({ message: "Failed", data: "No Transaction !" })
        }
        if (data.callBackStatus === "Success" || data.callBackStatus === "Failed") {
            return res.status(400).json({ message: "Failed", data: `Transaction Status Can't Update Already : ${data.callBackStatus}` })
        }
        data.callBackStatus = req.body.callBackStatus;
        await data.save()
        res.status(200).json(new ApiResponse(200, data))
    })
});

export const callBackResponse = asyncHandler(async (req, res) => {
    let callBackData = req.body;
    if (Object.keys(req.body).length === 1) {
        let key = Object.keys(req.body)
        let stringfi = JSON.parse(key)
        req.body = stringfi;
        callBackData = stringfi;
    }

    var data;
    let switchApi;
    if (req.body.partnerTxnId) {
        switchApi = "neyopayPayIn"
    }
    if (req.body.txnID) {
        switchApi = "marwarpayInSwitch"
    }
    switch (switchApi) {
        case "neyopayPayIn":
            data = { status: callBackData?.txnstatus == "Success" || "success" ? "200" : "400", payerAmount: callBackData?.amount, payerName: callBackData?.payerName, txnID: callBackData?.partnerTxnId, BankRRN: callBackData?.rrn, payerVA: callBackData?.payerVA, TxnInitDate: callBackData?.TxnInitDate, TxnCompletionDate: callBackData?.TxnCompletionDate }
            break;
        case "marwarpayInSwitch":
            data = { status: callBackData?.status, payerAmount: callBackData?.payerAmount, payerName: callBackData?.payerName, txnID: callBackData?.txnID, BankRRN: callBackData?.BankRRN, payerVA: callBackData?.payerVA, TxnInitDate: callBackData?.TxnInitDate, TxnCompletionDate: callBackData?.TxnCompletionDate }
            break;
        default:
            console.log("its default")
            break;
    }

    if (data?.status != "200") {
        return res.status(400).json({ message: "Failed", data: "trx is pending or not success" })
    }

    let pack = await qrGenerationModel.findOne({ trxId: data?.txnID });

    if (pack?.callBackStatus !== "Pending") {
        return res.status(400).json({ message: "Failed", data: `Trx already done status or not created : ${pack?.callBackStatus}` })
    }

    if (pack && data?.BankRRN) {
        pack.callBackStatus = "Success"
        pack.save();

        let userInfo = await userDB.aggregate([{ $match: { _id: pack?.memberId } }, { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } }, {
            $unwind: {
                path: "$package",
                preserveNullAndEmptyArrays: true,
            }
        }, {
            $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "upiWalletBalance": 1, "createdAt": 1, "package._id": 1, "package.packageName": 1, "package.packagePayInCharge": 1, "package.isActive": 1 }
        }])

        let gatwarCharge = (userInfo[0]?.package?.packagePayInCharge / 100) * data.payerAmount;
        let finalCredit = data.payerAmount - gatwarCharge

        let payinDataStore = { memberId: pack?.memberId, payerName: data?.payerName, trxId: data?.txnID, amount: data?.payerAmount, chargeAmount: gatwarCharge, finalAmount: finalCredit, vpaId: data?.payerVA, bankRRN: data?.BankRRN, description: `Qr Generated Successfully Amount:${data?.payerAmount} PayerVa:${data?.payerVA} BankRRN:${data?.BankRRN}`, trxCompletionDate: data?.TxnCompletionDate, trxInItDate: data?.TxnInitDate, isSuccess: data?.status == 200 || "200" || "Success" || "success" ? "Success" : "Failed" }

        let upiWalletDataObject = { memberId: userInfo[0]?._id, transactionType: "Cr.", transactionAmount: finalCredit, beforeAmount: userInfo[0]?.upiWalletBalance, afterAmount: userInfo[0]?.upiWalletBalance + finalCredit, description: `Successfully Cr. amount: ${finalCredit}`, transactionStatus: "Success" }

        await upiWalletModel.create(upiWalletDataObject);

        await payInModel.create(payinDataStore);
        await userDB.findByIdAndUpdate(userInfo[0]?._id, { upiWalletBalance: userInfo[0]?.upiWalletBalance + finalCredit })

        // callback send to the user url
        let callBackPayinUrl = await callBackResponseModel.find({ memberId: userInfo[0]?._id, isActive: true }).select("_id payInCallBackUrl isActive");
        const userCallBackURL = callBackPayinUrl[0]?.payInCallBackUrl;
        const config = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        axios.post(userCallBackURL, req.body, config).then((a) => {
            return res.status(200).json(new ApiResponse(200, null, "Successfully"))
        }).catch((err) => {
            return res.status(500).json({ success: "Failed", message: "Error User Api calling !" })
        })
        // callback end to the user url
    } else {
        return res.status(400).json({ succes: "Failed", message: "Txn Id Not Avabile!" })
    }

});