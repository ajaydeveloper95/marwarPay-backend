import express from "express";
import { userVerify } from "../../middlewares/userAuth.js";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { allGenFundRequest, getSingleFundRequest, updateFundRequestStatus, allPendingFundRequest } from "../../controllers/adminPannelControllers/fundAdd.controller.js";

router.get("/allGenFundRequest", userVerify, allGenFundRequest);

router.get("/getSingleFundRequest/:trxId", celebrate({
    params: Joi.object({
        trxId: Joi.string().trim().required(),
    })
}), userVerify, getSingleFundRequest);

router.post("/updateFundRequestStatus/:id", celebrate({
    body: Joi.object({
        isSuccess: Joi.string().valid("Success", "Failed").required(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, updateFundRequestStatus);

router.get("/allPendingFundRequest", userVerify, allPendingFundRequest);

export default router;