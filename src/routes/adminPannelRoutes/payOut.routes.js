import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { userVerify, userAuthAdmin } from "../../middlewares/userAuth.js";
import { allPayOutPayment, allPayOutPaymentSuccess, generatePayOut, payoutCallBackFunction, payoutCallBackResponse, payoutStatusCheck, payoutStatusUpdate } from "../../controllers/adminPannelControllers/payOut.controller.js";
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
        trxId: Joi.string().min(10).max(25).required(),
        amount: Joi.number().required(),
    })
}), apiValidate, generatePayOut);

router.get("/payoutStatusCheck/:trxId", celebrate({
    params: Joi.object({
        trxId: Joi.string().trim().min(10).max(25).required(),
    })
}), payoutStatusCheck);

router.post("/payoutStatusUpdate/:trxId", celebrate({
    body: Joi.object({
        isSuccess: Joi.string().valid("Pending", "Failed", "Success").required(),
    }),
    params: Joi.object({
        trxId: Joi.string().trim().min(10).max(25).required(),
    })
}), userVerify, userAuthAdmin, payoutStatusUpdate);

router.post("/payoutCallBackResponse", upload.none(), payoutCallBackResponse);

router.post("/payoutCallBackFunc", payoutCallBackFunction);

export default router;