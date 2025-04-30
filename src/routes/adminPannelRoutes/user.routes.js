import express from "express";
import { getUser, addUser, registerUser, loginUser, logOut, getSingleUser, updateUser, authTokenReVerify } from "../../controllers/adminPannelControllers/user.controller.js";
import { celebrate, Joi } from "celebrate";
import { userVerify, userAuthAdmin } from "../../middlewares/userAuth.js";
const router = express.Router();

router.get("/getUsers", userVerify, getUser);

router.get("/userProfile/:id", celebrate({
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, getSingleUser);

router.post("/addUser", celebrate({
    body: Joi.object({
        memberType: Joi.string().valid("Admin", "Manager", "Users", "Retailer", "TeamMember").required(),
        fullName: Joi.string().required(),
        email: Joi.string().required(),
        mobileNumber: Joi.string().required(),
        payInApi: Joi.string().optional(),
        payOutApi: Joi.string().optional(),
        package: Joi.string().optional(),
        addresh: Joi.object({
            country: Joi.string().required(),
            state: Joi.string().required(),
            city: Joi.string().required(),
            addresh: Joi.string().required(),
            pincode: Joi.number().required()
        }),
        minWalletBalance: Joi.number().required(),
        EwalletFundLock: Joi.number().required(),
        isActive: Joi.boolean().required(),
    })
}), userVerify, addUser)

router.post("/updateUser/:id", [celebrate({
    body: Joi.object({
        memberType: Joi.string().valid("Admin", "Manager", "Users").optional(),
        fullName: Joi.string().optional(),
        email: Joi.string().optional(),
        mobileNumber: Joi.string().optional(),
        payInApi: Joi.string().optional(),
        payOutApi: Joi.string().optional(),
        package: Joi.string().optional(),
        addresh: Joi.object({
            country: Joi.string().optional(),
            state: Joi.string().optional(),
            city: Joi.string().optional(),
            addresh: Joi.string().optional()
        }),
        minWalletBalance: Joi.number().optional(),
        upiWalletBalance: Joi.number().optional(),
        EwalletBalance: Joi.number().optional(),
        HoldingAmount: Joi.number().optional(),
        EwalletFundLock: Joi.number().optional(),
        isActive: Joi.boolean().optional(),
    }),
    params: Joi.object({
        id: Joi.string().trim().length(24).required(),
    })
}), userVerify, userAuthAdmin], updateUser)

router.post("/login", celebrate({
    body: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
    })
}), loginUser)

router.get("/authTokenReVerify", authTokenReVerify)

router.post("/register", celebrate({
    body: Joi.object({
        userName: Joi.string().required(),
        memberId: Joi.string().required(),
        memberType: Joi.string().required(),
        fullName: Joi.string().required(),
        email: Joi.string().required(),
        mobileNumber: Joi.string().required(),
        password: Joi.string().required(),
        trxPassword: Joi.string().required(),
        addresh: Joi.string().required(),
        package: Joi.object({
            country: Joi.string().required(),
            state: Joi.string().required(),
            city: Joi.string().required(),
            addresh: Joi.string().required()
        }),
        minWalletBalance: Joi.number().required(),
        upiWalletBalance: Joi.number().required(),
        EwalletBalance: Joi.number().required(),
        isActive: Joi.boolean().required(),
    })
}), registerUser)

router.get("/logout", userVerify, logOut)

export default router;