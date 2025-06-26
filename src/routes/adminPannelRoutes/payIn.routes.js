import express from "express";
import { allGeneratedPayment, generatePayment, paymentStatusCheck, paymentStatusUpdate, callBackResponse, allSuccessPayment, rezorPayCallback, iSmartPayCallback, callBackProconcept, callBackComprismo, callBackVaultage, callBackSambhavPay, callBackJiffy, callbackAirpay } from "../../controllers/adminPannelControllers/payIn.controller.js";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { userVerify, userAuthAdmin } from "../../middlewares/userAuth.js";
import { apiValidate } from "../../middlewares/apiValidate.js";
import { vaultagePayoutCallback } from "../../controllers/adminPannelControllers/payOut.controller.js";

router.get("/allPaymentGenerated", userVerify, allGeneratedPayment);

router.get("/allSuccessPayIn", userVerify, allSuccessPayment);

router.post("/generatePayment", celebrate({
    body: Joi.object({
        userName: Joi.string().required(),
        authToken: Joi.string().required(),
        trxId: Joi.string().min(10).max(25).required(),
        refId: Joi.string().optional(),
        amount: Joi.number().required(),
        name: Joi.string().required(),
        email: Joi.string().required(),
        mobileNumber: Joi.string().required(),
    })
}), apiValidate, generatePayment);

router.get("/paymentStatusCheck/:trxId", celebrate({
    params: Joi.object({
        trxId: Joi.string().trim().min(10).max(25).required(),
    })
}), paymentStatusCheck);

router.post("/paymentStatusUpdate/:trxId", celebrate({
    body: Joi.object({
        callBackStatus: Joi.string().valid("Pending", "Failed", "Success").required(),
    }),
    params: Joi.object({
        trxId: Joi.string().trim().min(10).max(25).required(),
    })
}), userVerify, userAuthAdmin, paymentStatusUpdate);

router.post("/callBackResponse", callBackResponse);
router.post("/callBack", rezorPayCallback);
router.post("/iSmartPayWebhook", iSmartPayCallback);
router.post("/callBackProconcept", callBackProconcept);
router.post("/callBackJiffy", callBackJiffy);
router.post("/callBackComprismo", callBackComprismo);
router.post("/vaultageCallBack", (req, res, next) => {
    const { event } = req.body;
    if (event === "DynamicUPIQR") {
        callBackVaultage(req, res, next);
    } else if (event === "Payout") {
        vaultagePayoutCallback(req, res, next);
    }
});
router.post("/sambhavpayCallback", callBackSambhavPay);

router.post("/sambhavpayCallbackESRGMG", callBackSambhavPay);

router.post("/ipnwebhook", callbackAirpay)

export default router;