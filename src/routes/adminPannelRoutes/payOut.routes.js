import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { userVerify, userAuthAdmin } from "../../middlewares/userAuth.js";
import { allPayOutPayment, allPayOutPaymentSuccess, callBackCollectPay, callbackJiffyV2Mind, flipzikCallbackImpactPeek, flipzikpayCallback, frescopayCallback, generatePayOut, jiffyCallbackResponse, payoutCallBackImpactPeek, payoutCallBackResponse, payoutStatusCheck, proConceptCallback, updatePayoutStatus, webHookWaayupayImpactPeek } from "../../controllers/adminPannelControllers/payOut.controller.js";
import multer from "multer";
import { apiValidate } from "../../middlewares/apiValidate.js";
const upload = multer();

router.get("/allPayOutPayment", userVerify, allPayOutPayment);

router.get("/allPayOutOnSuccess", userVerify, allPayOutPaymentSuccess);

router.post("/generatePayOut", celebrate({
    body: Joi.object({
        userName: Joi.string().required(),
        authToken: Joi.string().required(),
        mobileNumber: Joi.number().required(),
        accountHolderName: Joi.string().required(),
        accountNumber: Joi.string().required(),
        ifscCode: Joi.string().required(),
        bankName: Joi.string().required(),
        trxId: Joi.string().min(12).max(22).required(),
        amount: Joi.number().required(),
    })
}), apiValidate, generatePayOut);

router.get("/payoutStatusCheck/:trxId", celebrate({
    params: Joi.object({
        trxId: Joi.string().trim().min(10).max(25).required(),
    })
}), payoutStatusCheck);

router.post("/payoutStatusUpdate", userVerify, userAuthAdmin, updatePayoutStatus);

router.post("/payoutCallBackResponse", upload.none(), payoutCallBackResponse);

router.post("/payoutCallBackImpactPeek", upload.none(), payoutCallBackImpactPeek);

router.post("/webhookwaayupayImpactPeek", webHookWaayupayImpactPeek);

router.post("/flipzikWebhook", flipzikpayCallback);

router.post("/flipzikWebhookImpactPeek", flipzikCallbackImpactPeek);

router.post("/procenceptWebhook", proConceptCallback);

router.post('/frescopayCallback', frescopayCallback)

router.post('/jiffyCallbackResponse', jiffyCallbackResponse)

router.get('/callBackCollectPay', callBackCollectPay)

router.post('/jiffyV2MindCallback', callbackJiffyV2Mind)


export default router;