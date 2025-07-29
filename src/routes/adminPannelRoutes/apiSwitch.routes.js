import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { userVerify } from "../../middlewares/userAuth.js";
import { addApiPayIn, addApiPayOut, AllUserSwitchPayIn, AllUserSwitchPayOut, deleteApiPayIn, deleteApiPayOut, getAllApiPayIn, getAllApiPayOut, OneUserSwitchPayIn, OneUserSwitchPayOut, updateApiPayIn, updateApiPayOut } from "../../controllers/adminPannelControllers/apiSwitch.controller.js";

router.get("/allPayInSwitch", userVerify, getAllApiPayIn);

router.post("/addPayInSwitch", celebrate({
    body: Joi.object({
        apiName: Joi.string().required(),
        apiURL: Joi.string().required(),
        apiInfo: Joi.string().optional(),
        trxIdType: Joi.string().valid("Num", "AlphaNum").optional(),
        isActive: Joi.boolean().optional(),
    })
}), userVerify, addApiPayIn);

router.post("/updatePayInSwitch/:id", celebrate({
    body: Joi.object({
        apiName: Joi.string().optional(),
        apiURL: Joi.string().optional(),
        apiInfo: Joi.string().optional(),
        trxIdType: Joi.string().valid("Num", "AlphaNum").optional(),
        isActive: Joi.boolean().optional(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, updateApiPayIn);

router.delete("/deletePayInSwitch/:id", celebrate({
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, deleteApiPayIn);

router.get("/allPayOutSwitch", userVerify, getAllApiPayOut);

router.post("/addPayOutSwitch", celebrate({
    body: Joi.object({
        apiName: Joi.string().required(),
        apiURL: Joi.string().required(),
        apiInfo: Joi.string().optional(),
        trxIdType: Joi.string().valid("Num", "AlphaNum").optional(),
        isActive: Joi.boolean().optional(),
    })
}), userVerify, addApiPayOut);

router.post("/updatePayOutSwitch/:id", celebrate({
    body: Joi.object({
        apiName: Joi.string().optional(),
        apiURL: Joi.string().optional(),
        apiInfo: Joi.string().optional(),
        trxIdType: Joi.string().valid("Num", "AlphaNum").optional(),
        isActive: Joi.boolean().optional(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, updateApiPayOut);

router.delete("/deletePayOutSwitch/:id", celebrate({
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, deleteApiPayOut);

router.post("/AllUserSwitchPayIn", celebrate({
    body: Joi.object({
        apiId: Joi.string().trim().length(24).required(),
    })
}), userVerify, AllUserSwitchPayIn);

router.post("/AllUserSwitchPayOut", celebrate({
    body: Joi.object({
        apiId: Joi.string().trim().length(24).required(),
    })
}), userVerify, AllUserSwitchPayOut);

router.post("/OneUserSwitchPayIn", celebrate({
    body: Joi.object({
        userId: Joi.string().trim().length(24).required(),
        apiId: Joi.string().trim().length(24).required(),
    })
}), userVerify, OneUserSwitchPayIn);

router.post("/OneUserSwitchPayOut", celebrate({
    body: Joi.object({
        userId: Joi.string().trim().length(24).required(),
        apiId: Joi.string().trim().length(24).required(),
    })
}), userVerify, OneUserSwitchPayOut);

export default router;