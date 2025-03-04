import express from "express";
import { userVerify } from "../../middlewares/userAuth.js";
import { getAllGenTicketList, getAllMemberList, getBalanceFetch, getBalanceFetchImpactPeek, getBalanceImpactPeekFlipzik, getPackageList, getPayInApiList, getPayInPackageList, getPayOutApiList, getPayOutPackageList, getPendingTicketList, getUserList, getUserListWithWallet, getUserWithSwitchApi } from "../../controllers/adminPannelControllers/utility.controller.js";
const router = express.Router();

router.get("/getBalanceFetch", userVerify, getBalanceFetch);

router.get("/getBalanceFetchImpactPeek", userVerify, getBalanceFetchImpactPeek);

router.get("/getBalanceImpactPeekFlipzik", userVerify, getBalanceImpactPeekFlipzik);

router.get("/getUserList", userVerify, getUserList);

router.get("/getAllMemberList", userVerify, getAllMemberList);

router.get("/getUserWithWallet", userVerify, getUserListWithWallet);

router.get("/getUserListSwitchApi", userVerify, getUserWithSwitchApi);

router.get("/getPackageList", userVerify, getPackageList);

router.get("/getPayInApiList", userVerify, getPayInApiList);

router.get("/getPayOutApiList", userVerify, getPayOutApiList);

router.get("/getAllGenTicketList", userVerify, getAllGenTicketList);

router.get("/getPendingTicketList", userVerify, getPendingTicketList);

router.get("/getPayOutPackageList", userVerify, getPayOutPackageList);

router.get("/getPayInPackageList", userVerify, getPayInPackageList);

export default router;