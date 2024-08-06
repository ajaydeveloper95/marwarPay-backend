import axios from "axios";
import qrGenerationModel from "../models/qrGeneration.model.js";
import payInModel from "../models/payIn.model.js";

export const allGeneratedPayment = async (req, res) => {
    try {
        let payment = await qrGenerationModel.find().then((result) => {
            res.status(200).json({ message: "Success", result })
        })
    } catch (error) {
        res.status(400).json({ success: false, message: "some issue", error: error.message })
    }
}

export const generatePayment = async (req, res) => {
    try {
        let payment = await qrGenerationModel.create(req.body).then(async (data) => {
            // calling banking API SuccessFully Generated Data QR

            let memberId = "MPAPI836702"
            let txnpwd = "000000"
            let name = "Test Api Other"
            let amount = 50
            let trxId = "958782902443"
            let API_URL = `https://www.marwarpay.in/portal/api/generateQrAuth?memberid=${memberId}&txnpwd=${txnpwd}&name=${name}&amount=${amount}&txnid=${trxId}`

            let bank = await axios.get("https://jsonplaceholder.typicode.com/todos/1");
            // let bank = await axios.get(API_URL);

            data.qrData = bank.data.title
            await data.save();

            // Send response
            res.status(200).json({
                message: "Sucess",
                data: {
                    status_msg: "QR Generated Successfully",
                    status: "Success",
                    qr: data.qrData,
                    trxID: data.trxId
                },
            })

        })
    } catch (error) {
        res.status(400).json({ success: false, message: "some issue", error: error.message })
    }
}

export const paymentStatusCheck = async (req, res) => {
    let trxIdGet = req.params.trxId;
    console.log(trxIdGet)
    try {
        let pack = await qrGenerationModel.find({ trxId: trxIdGet });
        if (!pack.length) {
            res.status(200).json({ message: "Faild", data: "No Transaction !" })
        }
        res.status(200).json({
            message: "Sucess",
            data: pack
        })
    } catch (error) {
        res.status(400).json({ success: false, message: "some issue", error: error.message })
    }

}

export const paymentStatusUpdate = async (req, res) => {
    let pack = await qrGenerationModel.find();
    res.status(200).json({
        message: "Sucess",
        pack
    })
}

export const callBackResponse = async (req, res) => {
    // let data = req.body.data;
    let data = { status: "200", payerAmount: "200", payerName: "Test", txnID: "12345667875799", BankRRN: "123564654564", payerVA: "0000000000@ybl", TxnInitDate: "20220608131419", TxnCompletionDate: "20220608131422" }
    try {
        let pack = await qrGenerationModel.findOne({ trxId: data.txnID });
        if (pack) {
            pack.callBackStatus = true
            pack.save();

            let gatwarCharge = (1.5 / 100) * data.payerAmount
            let finalCredit = data.payerAmount - gatwarCharge

            let payinDataStore = { memberId: pack.memberId, payerName: data.payerName, trxId: data.txnID, amount: data.payerAmount, chargeAmount: gatwarCharge, finalAmount: finalCredit, vpaId: data.payerVA, bankRRN: data.BankRRN, description: `Qr Generated Successfully Amount:${data.payerAmount} PayerVa:${data.payerVA} BankRRN:${data.BankRRN}`, isSuccess: (200) ? true : false }

            let payInSuccessStore = await payInModel.create(payinDataStore);
            // callback send to the user url

            // callback end to the user url

            res.status(200).json({
                message: "Success",
                data: data
            })
        }
        res.status(400).json({ succes: "Faild", message: "Txn Id Not Avabile !" })
    } catch (error) {
        res.status(400).json({ succes: false, message: "some issue", error: error.message })
    }
}