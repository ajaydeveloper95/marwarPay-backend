import axios from "axios";
import qrGenerationModel from "../../models/qrGeneration.model.js";
import payInModel from "../../models/payIn.model.js";
import upiWalletModel from "../../models/upiWallet.model.js";
import userDB from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import callBackResponseModel from "../../models/callBackResponse.model.js";
import FormData from "form-data";
import { transactionQueue } from "../../utils/BullRedis.js";
import fs from 'fs';
import cron from "node-cron";

const jsonData = JSON.parse(fs.readFileSync('./public/matchZanithpayAndImpactSoftwarePayInAddedMb.json', 'utf-8'));

export const allGeneratedPayment = asyncHandler(async (req, res) => {
    // let queryObject = req.query;
    let date = new Date();
    let DateComp = `${date.getFullYear()}-${(date.getMonth()) + 1}-${date.getDate()}`
    let payment = await qrGenerationModel.aggregate([{ $match: { createdAt: { $gte: new Date(DateComp) } } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } },
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
        case "impactpeaksoftwareApi":
            // store database
            await qrGenerationModel.create({ memberId: user[0]?._id, name, amount, trxId }).then(async (data) => {
                // Banking Api
                let API_URL = `https://impactpeaksoftware.in/portal/api/generateQrAuth?memberid=IMPSAPI837165&txnpwd=8156&name=${name}&amount=${amount}&txnid=${trxId}`
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
        case "razorpayPayIn":
            try {
                const paymentData = await qrGenerationModel.create({
                    memberId: user[0]?._id,
                    name,
                    amount,
                    trxId,
                });

                const options = {
                    amount: amount * 100,
                    currency: "INR",
                    receipt: trxId,
                    notes: {
                        name,
                        mobileNumber,
                    },
                    description: `Payment for transaction ${trxId}`,
                    callback_url: "https://your-backend-domain.com/api/razorpay/verify-payment",
                };

                const paymentLink = await razorpay.paymentLink.create(options);

                paymentData.qrData = paymentLink.short_url;
                paymentData.refId = paymentLink.id;
                await paymentData.save();

                return res.status(200).json(new ApiResponse(200, {
                    status_msg: "Payment link generated successfully",
                    status: 200,
                    qrImage: paymentLink.short_url,
                    trxID: trxId,
                }));
            } catch (error) {
                console.error("Error creating Razorpay payment link:", error);

                if (error.code === 11000) {
                    return res.status(500).json({ message: "Failed", data: "trx Id duplicate found!" });
                } else {
                    return res.status(500).json({ message: "Failed", data: "Internal Server Error!" });
                }
            }
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
        }, { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } }, {
            $unwind: {
                path: "$packageCharge",
                preserveNullAndEmptyArrays: true,
            }
        }, {
            $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "upiWalletBalance": 1, "createdAt": 1, "packageCharge._id": 1, "packageCharge.payInPackageName": 1, "packageCharge.payInChargeRange": 1, "packageCharge.isActive": 1 }
        }])

        let chargeRange = userInfo[0]?.packageCharge?.payInChargeRange;
        var chargeTypePayIn;
        var chargeAmoutPayIn;

        chargeRange.forEach((value) => {
            if (value.lowerLimit <= data?.payerAmount && value.upperLimit > data?.payerAmount) {
                chargeTypePayIn = value.chargeType
                chargeAmoutPayIn = value.charge
                return 0;
            }
        })

        var userChargeApply;
        var finalAmountAdd;

        if (chargeTypePayIn === "Flat") {
            userChargeApply = chargeAmoutPayIn;
            finalAmountAdd = data?.payerAmount - userChargeApply;
        } else {
            userChargeApply = (chargeAmoutPayIn / 100) * data?.payerAmount;
            finalAmountAdd = data?.payerAmount - userChargeApply;
        }

        let gatwarCharge = userChargeApply;
        let finalCredit = finalAmountAdd;

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

        let userRespSendApi = {
            status: data?.status,
            payerAmount: data?.payerAmount,
            payerName: data?.payerName,
            txnID: data?.txnID,
            BankRRN: data?.BankRRN,
            payerVA: data?.payerVA,
            TxnInitDate: data?.TxnInitDate,
            TxnCompletionDate: data?.TxnCompletionDate
        }

        await axios.post(userCallBackURL, userRespSendApi, config)
        res.status(200).json(new ApiResponse(200, null, "Successfully"))
        // callback end to the user url
    } else {
        return res.status(400).json({ succes: "Failed", message: "Txn Id Not Avabile!" })
    }

});

export const testCallBackResponse = asyncHandler(async (req, res) => {
    let callBackData = req.body;
    
    console.log("in bankRRN if");

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
        
        transactionQueue.process(async (job) => {
            const callBackData = job.data;
            pack.callBackStatus = "Success"
            pack.save();

            let userInfo = await userDB.aggregate([{ $match: { _id: pack?.memberId } }, { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } }, {
                $unwind: {
                    path: "$package",
                    preserveNullAndEmptyArrays: true,
                }
            }, { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } }, {
                $unwind: {
                    path: "$packageCharge",
                    preserveNullAndEmptyArrays: true,
                }
            }, {
                $project: { "_id": 1, "userName": 1, "memberId": 1, "fullName": 1, "trxPassword": 1, "upiWalletBalance": 1, "createdAt": 1, "packageCharge._id": 1, "packageCharge.payInPackageName": 1, "packageCharge.payInChargeRange": 1, "packageCharge.isActive": 1 }
            }])

            let chargeRange = userInfo[0]?.packageCharge?.payInChargeRange;
            var chargeTypePayIn;
            var chargeAmoutPayIn;

            chargeRange.forEach((value) => {
                if (value.lowerLimit <= data?.payerAmount && value.upperLimit > data?.payerAmount) {
                    chargeTypePayIn = value.chargeType
                    chargeAmoutPayIn = value.charge
                    return 0;
                }
            })

            var userChargeApply;
            var finalAmountAdd;

            if (chargeTypePayIn === "Flat") {
                userChargeApply = chargeAmoutPayIn;
                finalAmountAdd = data?.payerAmount - userChargeApply;
            } else {
                userChargeApply = (chargeAmoutPayIn / 100) * data?.payerAmount;
                finalAmountAdd = data?.payerAmount - userChargeApply;
            }

            let gatwarCharge = userChargeApply;
            let finalCredit = finalAmountAdd;

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

            let userRespSendApi = {
                status: data?.status,
                payerAmount: data?.payerAmount,
                payerName: data?.payerName,
                txnID: data?.txnID,
                BankRRN: data?.BankRRN,
                payerVA: data?.payerVA,
                TxnInitDate: data?.TxnInitDate,
                TxnCompletionDate: data?.TxnCompletionDate
            }

            await axios.post(userCallBackURL, userRespSendApi, config)
        })
        await transactionQueue.add({
            data: req.body,
        });
        return res.status(200).json(new ApiResponse(200, null, "Successfully"))
    } else {
        return res.status(400).json({ succes: "Failed", message: "Txn Id Not Avabile!" })
    }

});

export const testDeleteRoute = asyncHandler(async (req, res) => {
    let item = jsonData;
    let date = new Date("2024-12-09T07:31:23.163Z")
    console.log(date)
    // arr.forEach(async(item)=>{
    // let dd = await upiWalletModel.find({"createdAt" : { $gte : date }})

    // let dd = await upiWalletModel.deleteMany({
    //     "createdAt": { $gte: date }
    // })
    // console.log(dd)

    // arr.forEach(async (item, index) => {
    //     let pedning = await qrGenerationModel.findByIdAndUpdate(item._id, { callBackStatus: "Pending" }, { new: true })
    //     console.log(pedning)
    // })

    // let GrGeneratePending = await payInModel.find({"createdAt" : { $gte : date }})
    // let GrGeneratePending = await payInModel.deleteMany({ "createdAt": { $gte: date } })
    // console.log(GrGeneratePending)

    // let url = "http://localhost:5000/apiAdmin/v1/payin/testCallBackResponse"
    // let options = {
    //     Headers: {
    //         "Content-Type": "application/json"
    //     }
    // }

    // let bodyResp = {
    //     status: "200",
    //     payerAmount: parseInt(item.amount),
    //     payerName: item.vpa,
    //     txnID: item.trxId,
    //     BankRRN: item.bankRRn,
    //     payerVA: item.vpa,
    //     TxnInitDate: "20220608131419",
    //     TxnCompletionDate: "20220608131422"
    // }

    // cron.schedule('*/2 * * * * *', async () => {
    //     console.log(bodyResp?.txnID)
    // });
    // await axios.post(url, bodyResp, options).then((data) => {
    //     console.log(data, index)
    // }).catch((err) => {
    //     console.log(err.message)
    // })
    let val = 0;
    setInterval(() => {
        let bodyResp = {
            status: "200",
            payerAmount: parseInt(item[val].amount),
            payerName: item[val].vpa,
            txnID: item[val].trxId,
            BankRRN: item[val].bankRRn,
            payerVA: item[val].vpa,
            TxnInitDate: "20220608131419",
            TxnCompletionDate: "20220608131422"
        }
        console.log(bodyResp,val)
        val+=1;
    }, [100])

    // })
    // let data = await qrGenerationModel.find({})
    res.status(200).json({ message: "success" })
});