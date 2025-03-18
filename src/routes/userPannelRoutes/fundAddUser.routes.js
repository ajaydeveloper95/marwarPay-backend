import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { userPannelAuth } from "../../middlewares/userPannelAuth.js";
import { addFundRequest, getFundRequest, singleFundRequest } from "../../controllers/userPannelControllers/fundAddUser.controller.js";

router.post("/addFundRequest", celebrate({
    body: Joi.object({
        transactionAmount: Joi.number().required(),
        payeeName: Joi.string().required(),
        payeeAccountNumber: Joi.string().required(),
        payeeIFSC: Joi.string().required(),
        payeeBankName: Joi.string().required(),
        paymentMode: Joi.string().valid("IMPS", "RTGS", "NEFT").required(),
        bankRRN: Joi.string().required(),
        paymentDateTime: Joi.date().required(),
    })
}), userPannelAuth, addFundRequest);

router.get("/getFundRequest", userPannelAuth, getFundRequest);

router.get("/singleFundRequest/:trxId", userPannelAuth, singleFundRequest);

export default router;