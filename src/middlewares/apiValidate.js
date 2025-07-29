import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import userDB from "../models/user.model.js";
import ipWhiteListDB from "../models/ipWhiteList.model.js"

export const apiValidate = asyncHandler(async (req, res, next) => {
    try {
        const userName = req?.body?.userName ? req?.body?.userName.trim() : null
        const authToken = req?.body?.authToken ? req?.body?.authToken.trim() : null
        const clientIp = req?.ip;
        let user = await userDB.findOne({ userName: userName , trxAuthToken: authToken, isActive: true }) 
        
        if (!user) {
            return res.status(400).json({ message: "Failed", data: "Invalid User or InActive user Please Try again !" })
        }
        req.user = user
        let getUserIpList = await ipWhiteListDB.findOne({ memberId: user._id });

        if (!getUserIpList) {
            return res.status(400).json({ message: "Failed", data: `Please required IP Whitelist Your Current IP : ${clientIp}` })
        }
        if (getUserIpList?.ipUserDev == "*") {
            next()
        }
        else if (getUserIpList?.ipUser == clientIp || getUserIpList?.ipUserDev == clientIp) {
            next()
        } else {
            return res.status(400).json({ message: "Failed", data: `Please required IP Whitelist Your Current IP : ${clientIp}` })
        }

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Request !");
    }
});