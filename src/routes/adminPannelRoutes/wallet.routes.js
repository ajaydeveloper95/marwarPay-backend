import express from "express";
import { userVerify } from "../../middlewares/userAuth.js";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { eWalletFundCredit, eWalletFundDebit, getAllTransactionEwallet, getAllTransactionUpi, getSettlementAmountAll, getSettlementAmountOne, getTransactionStatus, upiToEwallet } from "../../controllers/adminPannelControllers/wallet.controller.js";

router.get("/getAllTransactionUpi",  getAllTransactionUpi);

router.get("/getAllTransactionEwallet", userVerify, getAllTransactionEwallet);

router.get("/getTransactionStatus/:id", celebrate({
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, getTransactionStatus);

router.post("/upiToEwallet/:id", celebrate({
    body: Joi.object({
        transactionAmount: Joi.number().required(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, upiToEwallet);

router.post("/eWalletFundCredit/:id", celebrate({
    body: Joi.object({
        transactionType: Joi.string().valid("Cr.").required(),
        transactionAmount: Joi.number().required(),
        description: Joi.string().optional(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, eWalletFundCredit);

router.post("/eWalletFundDebit/:id", celebrate({
    body: Joi.object({
        transactionType: Joi.string().valid("Dr.").required(),
        transactionAmount: Joi.number().required(),
        description: Joi.string().optional(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, eWalletFundDebit);

router.post("/getSettlementAmountAll", celebrate({
    body: Joi.object({
        startTimeAndDate: Joi.date().iso().required(),
        endTimeAndDate: Joi.date().iso().required(),
    })
}), userVerify, getSettlementAmountAll);

router.post("/getSettlementAmountOne/:id", celebrate({
    body: Joi.object({
        startTimeAndDate: Joi.date().iso().required(),
        endTimeAndDate: Joi.date().iso().required(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, getSettlementAmountOne);

export default router;