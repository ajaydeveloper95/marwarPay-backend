import cron from "node-cron";
import axios from "axios";
import userDB from "../models/user.model.js";
import payOutModelGenerate from "../models/payOutGenerate.model.js";
import walletModel from "../models/Ewallet.model.js";
import payOutModel from "../models/payOutSuccess.model.js";
import LogModel from "../models/Logs.model.js";
import { Mutex } from "async-mutex";
import qrGenerationModel from "../models/qrGeneration.model.js";
import oldQrGenerationModel from "../models/oldQrGeneration.model.js";
import mongoose from "mongoose";
import Log from "../models/Logs.model.js";
import callBackResponseModel from "../models/callBackResponse.model.js";
import payInModel from "../models/payIn.model.js";
import moment from "moment";
import upiWalletModel from "../models/upiWallet.model.js";
import EwalletModel from "../models/Ewallet.model.js";
const matchingTrxIds = [
    "seabird6108787",
    "seabird6108775",
    "seabird6108773",
    "seabird6108744",
    "seabird6108719",
    "seabird6243907",
    "seabird6243899",
    "seabird6243829",
    "seabird6243874",
    "seabird6243817",
    "seabird6243810",
    "seabird6243851",
    "seabird6243864",
    "seabird6243828",
    "seabird6243811",
    "seabird6243802",
    "seabird6243774",
    "seabird6108685",
    "seabird6108668",
    "seabird6108653",
    "seabird6108352",
    "seabird6082910",
    "seabird6080469",
    "seabird6242193",
    "seabird6241982",
    "seabird6241965",
    "seabird6241943",
    "seabird6241933",
    "seabird6241830",
    "seabird6241752",
    "seabird6241443",
    "seabird6241325",
    "seabird6241306",
    "seabird6241340",
    "seabird6241285",
    "seabird6241190",
    "seabird6241172",
    "seabird6240848",
    "seabird6240873",
    "seabird6240850",
    "seabird6237676",
    "seabird6237420",
    "seabird6237026",
    "seabird6199809",
    "seabird6199808",
    "seabird6235439",
    "seabird6199735",
    "seabird6234367",
    "seabird6234364",
    "seabird6234297",
    "seabird6234264",
    "seabird6233396",
    "seabird6232702",
    "seabird6232635",
    "seabird6231688",
    "seabird6231676",
    "seabird6228151",
    "seabird6228158",
    "seabird6228102",
    "seabird6228100",
    "seabird6227998",
    "seabird6227707",
    "seabird6227395",
    "seabird6226873",
    "seabird6226469",
    "seabird6224746",
    "seabird6224739",
    "seabird6224721",
    "seabird6224731",
    "seabird6224660",
    "seabird6224666",
    "seabird6224601",
    "seabird6224634",
    "seabird6224611",
    "seabird6224655",
    "seabird6224612",
    "seabird6224559",
    "seabird6224547",
    "seabird6224511",
    "seabird6224481",
    "seabird6223487",
    "seabird6223482",
    "seabird6223461",
    "seabird6223445",
    "seabird6223492",
    "seabird6223357",
    "seabird6223363",
    "seabird6222387",
    "seabird6221244",
    "seabird6220169",
    "seabird6220133",
    "seabird6220128",
    "seabird6220115",
    "seabird6219921",
    "seabird6218391",
    "seabird6216540",
    "seabird6216160",
    "seabird6215603",
    "seabird6215583",
    "seabird6215209",
    "seabird6215192",
    "seabird6174357",
    "seabird6174356",
    "seabird6174351",
    "seabird6174395",
    "seabird6174393",
    "seabird6174385",
    "seabird6174381",
    "seabird6174369",
    "seabird6174368",
    "seabird6174366",
    "seabird6174364",
    "seabird6174363",
    "seabird6174362",
    "seabird6174457",
    "seabird6174424",
    "seabird6174429",
    "seabird6174431",
    "seabird6174463",
    "seabird6174430",
    "seabird6174412",
    "seabird6174417",
    "seabird6174294",
    "seabird6174432",
    "seabird6174455",
    "seabird6174438",
    "seabird6174298",
    "seabird6174422",
    "seabird6214467",
    "seabird6174413",
    "seabird6174299",
    "seabird6174458",
    "seabird6174453",
    "seabird6174421",
    "seabird6174451",
    "seabird6174425",
    "seabird6174414",
    "seabird6174416",
    "seabird6174287",
    "seabird6174288",
    "seabird6174265",
    "seabird6174286",
    "seabird6174273",
    "seabird6174269",
    "seabird6174284",
    "seabird6174279",
    "seabird6174267",
    "seabird6174268",
    "seabird6174260",
    "seabird6174281",
    "seabird6174263",
    "seabird6174276",
    "seabird6174246",
    "seabird6174220",
    "seabird6174213",
    "seabird6174211",
    "seabird6174209",
    "seabird6174208",
    "seabird6174207",
    "seabird6174203",
    "seabird6174202",
    "seabird6174200",
    "seabird6174085",
    "seabird6174092",
    "seabird6174093",
    "seabird6174082",
    "seabird6174077",
    "seabird6174201",
    "seabird6174086",
    "seabird6214340",
    "seabird6214338",
    "seabird6214328",
    "seabird6214322",
    "seabird6214334",
    "seabird6214323",
    "seabird6214332",
    "seabird6174130",
    "seabird6174196",
    "seabird6174194",
    "seabird6174199",
    "seabird6174198",
    "seabird6174133",
    "seabird6174116",
    "seabird6174099",
    "seabird6174097",
    "seabird6174101",
    "seabird6174137",
    "seabird6174105",
    "seabird6174173",
    "seabird6174144",
    "seabird6174145",
    "seabird6174146",
    "seabird6174189",
    "seabird6174139",
    "seabird6174148",
    "seabird6174142",
    "seabird6174143",
    "seabird6174153",
    "seabird6174151",
    "seabird6174056",
    "seabird6174053",
    "seabird6174071",
    "seabird6174047",
    "seabird6174041",
    "seabird6174015",
    "seabird6174019",
    "seabird6174023",
    "seabird6174026",
    "seabird6174021",
    "seabird6174016",
    "seabird6174025",
    "seabird6174024",
    "seabird6174022",
    "seabird6174018",
    "seabird6173990",
    "seabird6174011",
    "seabird6174005",
    "seabird6173987",
    "seabird6173992",
    "seabird6174007",
    "seabird6174006",
    "seabird6173991",
    "seabird6174009",
    "seabird6174012",
    "seabird6174010",
    "seabird6213921",
    "seabird6213876",
    "seabird6173976",
    "seabird6173873",
    "seabird6173978",
    "seabird6173871",
    "seabird6173977",
    "seabird6173874",
    "seabird6213862",
    "seabird6213861",
    "seabird6213864",
    "seabird6213863",
    "seabird6213850",
    "seabird6213860",
    "seabird6213865",
    "seabird6213773",
    "seabird6173975",
    "seabird6173973",
    "seabird6173972",
    "seabird6173969",
    "seabird6173967",
    "seabird6173966",
    "seabird6173965",
    "seabird6173964",
    "seabird6173963",
    "seabird6173962",
    "seabird6173960",
    "seabird6173959",
    "seabird6173958",
    "seabird6173957",
    "seabird6173956",
    "seabird6173955",
    "seabird6173954",
    "seabird6173953",
    "seabird6173952",
    "seabird6173951",
    "seabird6173950",
    "seabird6173949",
    "seabird6173947",
    "seabird6173927",
    "seabird6213700",
    "seabird6173845",
    "seabird6173841",
    "seabird6173839",
    "seabird6173840",
    "seabird6166563",
    "seabird6213173",
    "seabird6166520",
    "seabird6166447",
    "seabird6213022",
    "seabird6166405",
    "seabird6212938",
    "seabird6212783",
    "seabird6212795",
    "seabird6212780",
    "seabird6212766",
    "seabird6212764",
    "seabird6212762",
    "seabird6212759",
    "seabird6212758",
    "seabird6212757",
    "seabird6212751",
    "seabird6212745",
    "seabird6212753",
    "seabird6212756",
    "seabird6212549",
    "seabird6212545",
    "seabird6212524",
    "seabird6212521",
    "seabird6212518",
    "seabird6212517",
    "seabird6212516",
    "seabird6212514",
    "seabird6212512",
    "seabird6212507",
    "seabird6212506",
    "seabird6212505",
    "seabird6212503",
    "seabird6212479",
    "seabird6212474",
    "seabird6212495",
    "seabird6212489",
    "seabird6212492",
    "seabird6212498",
    "seabird6212481",
    "seabird6212472",
    "seabird6212464",
    "seabird6212478",
    "seabird6212462",
    "seabird6212459",
    "seabird6212448",
    "seabird6212449",
    "seabird6212439",
    "seabird6212447",
    "seabird6212435",
    "seabird6212433",
    "seabird6212436",
    "seabird6212446",
    "seabird6212430",
    "seabird6212426",
    "seabird6212414",
    "seabird6212412",
    "seabird6212410",
    "seabird6212408",
    "seabird6212404",
    "seabird6212384",
    "seabird6212381",
    "seabird6212379",
    "seabird6212375",
    "seabird6212364",
    "seabird6212363",
    "seabird6212366",
    "seabird6212369",
    "seabird6212355",
    "seabird6212342",
    "seabird6212337",
    "seabird6212352",
    "seabird6212341",
    "seabird6212357",
    "seabird6212353",
    "seabird6212360",
    "seabird6212361",
    "seabird6212333",
    "seabird6212330",
    "seabird6212328",
    "seabird6212326",
    "seabird6212325",
    "seabird6212323",
    "seabird6212305",
    "seabird6212304",
    "seabird6212299",
    "seabird6212295",
    "seabird6212293",
    "seabird6212290",
    "seabird6212282",
    "seabird6212283",
    "seabird6212286",
    "seabird6212276",
    "seabird6212277",
    "seabird6212270",
    "seabird6212268",
    "seabird6212265",
    "seabird6212260",
    "seabird6212259",
    "seabird6212250",
    "seabird6212249",
    "seabird6212248",
    "seabird6212226",
    "seabird6212240",
    "seabird6212242",
    "seabird6212228",
    "seabird6212232",
    "seabird6212222",
    "seabird6212220",
    "seabird6212196",
    "seabird6212197",
    "seabird6212198",
    "seabird6212166",
    "seabird6212162",
    "seabird6148847",
    "seabird6212111",
    "seabird6148844",
    "seabird6148846",
    "seabird6148824",
    "seabird6148823",
    "seabird6148838",
    "seabird6148836",
    "seabird6148828",
    "seabird6148837",
    "seabird6148826",
    "seabird6148821",
    "seabird6148832",
    "seabird6148833",
    "seabird6212069",
    "seabird6212056",
    "seabird6212055",
    "seabird6148765",
    "seabird6148769",
    "seabird6148772",
    "seabird6148768",
    "seabird6148783",
    "seabird6148790",
    "seabird6148787",
    "seabird6148782",
    "seabird6211996",
    "seabird6148861",
    "seabird6148859",
    "seabird6148866",
    "seabird6148865",
    "seabird6148856",
    "seabird6148862",
    "seabird6147365",
    "seabird6210471",
    "seabird6210469",
    "seabird6210473",
    "seabird6210470",
    "seabird6210474",
    "seabird6210472",
    "seabird6210475",
    "seabird6210467",
    "seabird6210466",
    "seabird6210439",
    "seabird6210458",
    "seabird6210459",
    "seabird6210457",
    "seabird6210460",
    "seabird6210461",
    "seabird6210456",
    "seabird6210435",
    "seabird6210434",
    "seabird6210433",
    "seabird6210432",
    "seabird6210431",
    "seabird6210430",
    "seabird6210428",
    "seabird6210427",
    "seabird6210426",
    "seabird6210425",
    "seabird6210423",
    "seabird6210420",
    "seabird6210419",
    "seabird6210418",
    "seabird6210408",
    "seabird6210407",
    "seabird6210404",
    "seabird6210403",
    "seabird6210402",
    "seabird6210401",
    "seabird6210400",
    "seabird6210399",
    "seabird6210397",
    "seabird6210396",
    "seabird6210392",
    "seabird6210391",
    "seabird6210390",
    "seabird6210389",
    "seabird6210388",
    "seabird6210385",
    "seabird6210384",
    "seabird6210370",
    "seabird6210368",
    "seabird6210367",
    "seabird6210366",
    "seabird6210364",
    "seabird6210363",
    "seabird6210361",
    "seabird6210360",
    "seabird6210354",
    "seabird6210353",
    "seabird6210352",
    "seabird6210351",
    "seabird6210350",
    "seabird6210349",
    "seabird6210343",
    "seabird6210341",
    "seabird6210340",
    "seabird6210339",
    "seabird6210338",
    "seabird6210337",
    "seabird6210332",
    "seabird6210331",
    "seabird6210330",
    "seabird6210329",
    "seabird6210326",
    "seabird6210325",
    "seabird6210324",
    "seabird6210322",
    "seabird6210321",
    "seabird6210320",
    "seabird6210319",
    "seabird6210318",
    "seabird6210313",
    "seabird6210312",
    "seabird6210309",
    "seabird6210298",
    "seabird6210297",
    "seabird6210296",
    "seabird6210295",
    "seabird6210292",
    "seabird6210285",
    "seabird6210283",
    "seabird6210282",
    "seabird6210281",
    "seabird6210280",
    "seabird6210279",
    "seabird6210278",
    "seabird6210277",
    "seabird6210254",
    "seabird6210253",
    "seabird6210252",
    "seabird6210249",
    "seabird6210248",
    "seabird6210247",
    "seabird6210246",
    "seabird6210244",
]
const transactionMutex = new Mutex();
const logsMutex = new Mutex();
const loopMutex = new Mutex();


// function scheduleWayuPayOutCheck() {
//     cron.schedule('*/30 * * * *', async () => {
//         const release = await transactionMutex.acquire();
//         try {
//             let GetData = await payOutModelGenerate.find({ isSuccess: "Pending" }).limit(500);
//             if (GetData.length !== 0) {
//                 GetData.forEach(async (item) => {
//                     let uatUrl = "https://api.waayupay.com/api/api/api-module/payout/status-check"
//                     let postAdd = {
//                         clientId: "adb25735-69c7-4411-a120-5f2e818bdae5",
//                         secretKey: "6af59e5a-7f28-4670-99ae-826232b467be",
//                         clientOrderId: item.trxId
//                     }
//                     let header = {
//                         header: {
//                             "Accept": "application/json",
//                             "Content-Type": "application/json"
//                         }
//                     }

//                     await axios.post(uatUrl, postAdd, header).then(async (data) => {
//                         if (data?.data?.status !== 1) {
//                             await payOutModelGenerate.findByIdAndUpdate(item._id, { isSuccess: "Failed" })
//                         }

//                         else if (data?.data?.status === 1) {
//                             let userWalletInfo = await userDB.findById(item?.memberId, "_id EwalletBalance");
//                             let beforeAmountUser = userWalletInfo.EwalletBalance;
//                             let finalEwalletDeducted = item?.afterChargeAmount;
//                             await payOutModelGenerate.findByIdAndUpdate(item._id, { isSuccess: "Success" })

//                             let walletModelDataStore = {
//                                 memberId: userWalletInfo._id,
//                                 transactionType: "Dr.",
//                                 transactionAmount: item?.amount,
//                                 beforeAmount: beforeAmountUser,
//                                 chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
//                                 afterAmount: beforeAmountUser - finalEwalletDeducted,
//                                 description: `Successfully Dr. amount: ${finalEwalletDeducted}`,
//                                 transactionStatus: "Success",
//                             }

//                             // update the user wallet balance 
//                             userWalletInfo.EwalletBalance -= finalEwalletDeducted
//                             await userWalletInfo.save();

//                             let storeTrx = await walletModel.create(walletModelDataStore)

//                             let payoutDataStore = {
//                                 memberId: item?.memberId,
//                                 amount: item?.amount,
//                                 chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
//                                 finalAmount: finalEwalletDeducted,
//                                 bankRRN: data?.data?.utr,
//                                 trxId: data?.data?.clientOrderId,
//                                 optxId: data?.data?.orderId,
//                                 isSuccess: "Success"
//                             }

//                             await payOutModel.create(payoutDataStore)
//                         }

//                     }).catch((err) => {
//                         console.log(err.message)
//                     })
//                 })
//             }
//         } catch (error) {
//             console.log(error)
//         } finally {
//             release()
//         }
//     });
// }

function scheduleWayuPayOutCheck() {
    cron.schedule('*/2 * * * * *', async () => {
        const release = await transactionMutex.acquire();
        let GetData = await payOutModelGenerate.find({
            isSuccess: "Pending",
        })
            .sort({ createdAt: -1 }).limit(10)
        try {
            GetData.forEach(async (item) => {
                await processWaayuPayOutFn(item)
                // console.log(item)
            });
        } catch (error) {
            console.error('Error during payout check:', error.message);
        } finally {
            release()
        }
    });
}

async function processWaayuPayOutFn(item) {
    const uatUrl = "https://api.waayupay.com/api/api/api-module/payout/status-check";
    const postAdd = {
        clientId: process.env.WAAYU_CLIENT_ID_TWO,
        secretKey: process.env.WAAYU_SECRET_KEY_TWO,
        clientOrderId: item?.trxId,
    };
    const header = {
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    };

    const { data } = await axios.post(uatUrl, postAdd, header);
    console.log("!!!!!!!!!!!!!!!!!!!!", data, "!!!!!!!!!!!!!!!!!!!!!")
    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    // const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };

        console.log(data)

        // if (data?.status === null) {
        //     await session.abortTransaction();
        //     return false
        // }
        if (data?.status === 1) {
            // Final update and commit in transaction
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Success" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with success")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            let PayoutStoreData = {
                memberId: item?.memberId,
                amount: item?.amount,
                chargeAmount: item?.gatwayCharge || item?.afterChargeAmount - item?.amount,
                finalAmount: finalEwalletDeducted,
                bankRRN: data?.utr,
                trxId: data?.clientOrderId,
                optxId: data?.orderId,
                isSuccess: "Success",
            }

            let v = await payOutModel.create([PayoutStoreData], opts)
            console.log(v?.trxId)
            await session.commitTransaction();
            console.log("trxId updated==>", item?.trxId);

            return true;
        }
        else if (data?.status === 4 || data?.status === 0 || data?.status === 2 || data?.status === null) {
            // trx is falied and update the status
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Failed" }, { session, new: true });
            console.log(payoutModelData?.trxId, "with falied")
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: + finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance - finalEwalletDeducted;


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Cr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Cr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)
            // Commit the transaction
            await session.commitTransaction();
            // console.log('Transaction committed successfully');

            console.log(item?.trxId)
            await session.commitTransaction();
            console.log("trxId updated==>", item?.trxId);

            return true;
        }
        else {
            console.log("Failed and Success Not Both !");
            await session.abortTransaction();
            return true;
        }

    } catch (error) {
        console.log("inside the error", error)
        await session.abortTransaction();
        return false
    } finally {
        session.endSession();
        // release()
    }
}

function migrateData() {
    cron.schedule('0,10 * * * *', async () => {
        const release = await transactionMutex.acquire();
        try {
            console.log("Running cron job to migrate old data...");

            const threeHoursAgo = new Date();
            threeHoursAgo.setHours(threeHoursAgo.getHours() - 3)

            const oldData = await qrGenerationModel.find({ createdAt: { $lt: threeHoursAgo } }).sort({ createdAt: 1 }).limit(5000);

            if (oldData.length > 0) {
                const newData = oldData.map(item => ({
                    ...item,
                    memberId: new mongoose.Types.ObjectId((String(item?.memberId))),
                    name: String(item?.name),
                    amount: Number(item?.amount),
                    trxId: String(item?.trxId),
                    migratedAt: new Date(),
                }));

                await oldQrGenerationModel.insertMany(newData);

                const oldDataIds = oldData.map(item => item._id);
                await qrGenerationModel.deleteMany({ _id: { $in: oldDataIds } });

                console.log(`Successfully migrated ${oldData.length} records.`);
            } else {
                console.log("No data older than 1 day to migrate.");
            }
        } catch (error) {
            console.log("error=>", error.message);
        } finally {
            release()
        }
    }
    )
}

function logsClearFunc() {
    cron.schedule('* * */7 * *', async () => {
        let date = new Date();
        let DateComp = `${date.getFullYear()}-${(date.getMonth()) + 1}-${date.getDate() - 2}`
        await LogModel.deleteMany({ createdAt: { $lt: new Date(DateComp) } });
    });
}

// function payinScheduleTask() {
//     cron.schedule('*/10 * * * * *', async () => {
//         const release = await logsMutex.acquire()
//         try {
//             const logsToUpdate = await Log.aggregate([
//                 {
//                     $match: {
//                         "requestBody.status": 200,
//                         "responseBody": { $regex: "\"message\":\"Failed\"", $options: "i" }
//                     }
//                 },
//                 { $limit: 100 }
//             ]);

//             for (const log of logsToUpdate) {
//                 const trxId = log.requestBody.trxId;
//                 if (!trxId) continue;

//                 // Find QR Generation documents and update their callback status
//                 const qrDoc = await qrGenerationModel.findOneAndUpdate(
//                     { trxId, callBackStatus: "Pending" },
//                     { callBackStatus: "Success" }
//                 );

//                 if (!qrDoc) continue;

//                 // Prepare callback data from Log's requestBody
//                 let callBackData = log.requestBody;

//                 if (Object.keys(callBackData).length === 1) {
//                     const key = Object.keys(callBackData)[0];
//                     callBackData = JSON.parse(key);
//                 }

//                 const switchApi = callBackData.partnerTxnId
//                     ? "neyopayPayIn"
//                     : callBackData.txnID
//                         ? "marwarpayInSwitch"
//                         : null;

//                 if (!switchApi) continue;

//                 const data =
//                     switchApi === "neyopayPayIn"
//                         ? {
//                             status: callBackData?.txnstatus === "Success" ? 200 : 400,
//                             payerAmount: callBackData?.amount,
//                             payerName: callBackData?.payerName,
//                             txnID: callBackData?.partnerTxnId,
//                             BankRRN: callBackData?.rrn,
//                             payerVA: callBackData?.payerVA,
//                             TxnInitDate: callBackData?.TxnInitDate,
//                             TxnCompletionDate: callBackData?.TxnCompletionDate,
//                         }
//                         : {
//                             status: callBackData?.status,
//                             payerAmount: callBackData?.payerAmount,
//                             payerName: callBackData?.payerName,
//                             txnID: callBackData?.txnID,
//                             BankRRN: callBackData?.BankRRN,
//                             payerVA: callBackData?.payerVA,
//                             TxnInitDate: callBackData?.TxnInitDate,
//                             TxnCompletionDate: callBackData?.TxnCompletionDate,
//                         };

//                 if (data.status !== 200) continue;

//                 const userInfoPromise = userDB.aggregate([
//                     { $match: { _id: qrDoc.memberId } },
//                     { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
//                     { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
//                     { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
//                     { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
//                     { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } },
//                 ]);

//                 const callBackPayinUrlPromise = callBackResponseModel
//                     .find({ memberId: qrDoc.memberId, isActive: true })
//                     .select("_id payInCallBackUrl isActive");

//                 const [userInfoResult, callBackPayinUrlResult] = await Promise.allSettled([
//                     userInfoPromise,
//                     callBackPayinUrlPromise,
//                 ]);

//                 const userInfo = userInfoResult.value?.[0];
//                 const callBackPayinUrl = callBackPayinUrlResult.value?.[0]?.payInCallBackUrl;

//                 if (!userInfo || !callBackPayinUrl) continue;

//                 const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
//                 const charge = chargeRange.find(
//                     (range) => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount
//                 );

//                 const userChargeApply =
//                     charge.chargeType === "Flat"
//                         ? charge.charge
//                         : (charge.charge / 100) * data.payerAmount;
//                 const finalAmountAdd = data.payerAmount - userChargeApply;

//                 const [upiWalletUpdateResult, payInCreateResult] = await Promise.allSettled([
//                     userDB.findByIdAndUpdate(userInfo._id, {
//                         upiWalletBalance: userInfo.upiWalletBalance + finalAmountAdd,
//                     }),
//                     payInModel.create({
//                         memberId: qrDoc.memberId,
//                         payerName: data.payerName,
//                         trxId: data.txnID,
//                         amount: data.payerAmount,
//                         chargeAmount: userChargeApply,
//                         finalAmount: finalAmountAdd,
//                         vpaId: data.payerVA,
//                         bankRRN: data.BankRRN,
//                         description: `QR Generated Successfully Amount:${data.payerAmount} PayerVa:${data.payerVA} BankRRN:${data.BankRRN}`,
//                         trxCompletionDate: data.TxnCompletionDate,
//                         trxInItDate: data.TxnInitDate,
//                         isSuccess: data.status === 200 ? "Success" : "Failed",
//                     }),
//                 ]);

//                 if (
//                     upiWalletUpdateResult.status === "rejected" ||
//                     payInCreateResult.status === "rejected"
//                 ) {
//                     console.error("Error updating wallet or creating pay-in record");
//                     continue;
//                 }

//                 const userRespSendApi = {
//                     status: data.status,
//                     payerAmount: data.payerAmount,
//                     payerName: data.payerName,
//                     txnID: data.txnID,
//                     BankRRN: data.BankRRN,
//                     payerVA: data.payerVA,
//                     TxnInitDate: data.TxnInitDate,
//                     TxnCompletionDate: data.TxnCompletionDate,
//                 };

//                 await axios.post(callBackPayinUrl, userRespSendApi, {
//                     headers: {
//                         Accept: "application/json",
//                         "Content-Type": "application/json",
//                     },
//                 });
//             }
//         } catch (error) {

//         } finally {
//             release()
//         }
//     });
// }

function payinScheduleTask() {
    cron.schedule('0,30 * * * *', async () => {
        const release = await logsMutex.acquire()
        try {
            const startOfYesterday = moment().startOf('day').subtract(1, 'day').toDate();
            const endOfYesterday = moment().startOf('day').subtract(1, 'milliseconds').toDate();
            const endOfLastHalfHour = moment().toDate(); // Current time
            const startOfLastHalfHour = moment().subtract(30, 'minutes').toDate();
            const logs = await Log.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfYesterday,
                            $lte: endOfYesterday,
                            // $gte: startOfLastHalfHour,
                            // $lte: endOfLastHalfHour,
                        },

                        "requestBody.status": 200,
                        // "requestBody.txnID": { $regex: "seabird74280342", $options: "i" },
                        // "requestBody.txnID": {
                        //     $in: [
                        //         "seabird74592153", "seabird74592045", "seabird74592191",
                        //         "seabird74592244"
                        //     ],
                        // },
                        "responseBody": { $regex: "\"message\":\"Failed\"", $options: "i" },
                        url: { $regex: "/apiAdmin/v1/payin/callBackResponse", $options: "i" },
                        description: { $nin: ["Log processed for payin and marked success"] }
                    },
                },
                { $sort: { createdAt: -1 } },
                { $limit: 10 }
            ]);



            if (!logs.length) return;

            for (const log of logs) {
                const loopRelease = await loopMutex.acquire()
                try {
                    const trxId = log.requestBody.txnID;
                    if (!trxId) throw new Error("Missing trxId in log");
                    let qrDoc
                    qrDoc = await qrGenerationModel.findOneAndUpdate(
                        { trxId },
                        // { trxId, callBackStatus: "Pending" },
                        { callBackStatus: "Success" }
                    )

                    if (!qrDoc) {
                        qrDoc = await oldQrGenerationModel.findOneAndUpdate(
                            { trxId },
                            // { trxId, callBackStatus: "Pending" },
                            { callBackStatus: "Success" }
                        );
                    }
                    console.log("qrDoc>>", qrDoc);

                    if (!qrDoc) throw new Error("QR Generation document not found or already processed");

                    let callBackData = log.requestBody;
                    if (Object.keys(callBackData).length === 1) {
                        const key = Object.keys(callBackData)[0];
                        callBackData = JSON.parse(key);
                    }

                    const switchApi = callBackData.partnerTxnId
                        ? "neyopayPayIn"
                        : callBackData.txnID
                            ? "marwarpayInSwitch"
                            : null;

                    if (!switchApi) throw new Error("Invalid transaction data in log");

                    const data = switchApi === "neyopayPayIn"
                        ? {
                            status: callBackData?.txnstatus === "Success" ? 200 : 400,
                            payerAmount: callBackData?.amount,
                            payerName: callBackData?.payerName,
                            txnID: callBackData?.partnerTxnId,
                            BankRRN: callBackData?.rrn,
                            payerVA: callBackData?.payerVA,
                            TxnInitDate: callBackData?.TxnInitDate,
                            TxnCompletionDate: callBackData?.TxnCompletionDate,
                        }
                        : {
                            status: callBackData?.status,
                            payerAmount: callBackData?.payerAmount,
                            payerName: callBackData?.payerName,
                            txnID: callBackData?.txnID,
                            BankRRN: callBackData?.BankRRN,
                            payerVA: callBackData?.payerVA,
                            TxnInitDate: callBackData?.TxnInitDate,
                            TxnCompletionDate: callBackData?.TxnCompletionDate,
                        };

                    if (data.status !== 200) throw new Error("Transaction is pending or not successful");

                    const [userInfo] = await userDB.aggregate([
                        { $match: { _id: qrDoc.memberId } },
                        { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                        { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
                        { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } },
                    ])
                    const callBackPayinUrl = await callBackResponseModel.findOne({ memberId: qrDoc.memberId, isActive: true }).select("payInCallBackUrl")


                    if (!callBackPayinUrl) throw new Error("Callback URL is missing");


                    if (!userInfo) throw new Error("User info missing");

                    const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
                    const charge = chargeRange.find(
                        (range) => range.lowerLimit <= data.payerAmount && range.upperLimit > data.payerAmount
                    );

                    if (!charge) return;

                    const userChargeApply =
                        charge.chargeType === "Flat"
                            ? charge.charge
                            : (charge.charge / 100) * data.payerAmount;
                    const finalAmountAdd = data.payerAmount - userChargeApply;

                    const tempPayin = await payInModel.findOne({ trxId: qrDoc?.trxId })

                    if (tempPayin) {
                        await Log.findByIdAndUpdate(log._id, {
                            $push: { description: "Log processed for payin and marked success" },
                        });
                        throw new Error("Trasaction already created");
                    }
                    const upiWalletDataObject = {
                        memberId: userInfo?._id,
                        transactionType: "Cr.",
                        transactionAmount: finalAmountAdd,
                        beforeAmount: userInfo?.upiWalletBalance,
                        afterAmount: Number(userInfo?.upiWalletBalance) + Number(finalAmountAdd),
                        description: `Successfully Cr. amount: ${finalAmountAdd}  trxId: ${data.txnID}`,
                        transactionStatus: "Success"
                    }

                    await upiWalletModel.create(upiWalletDataObject);
                    const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, {
                        $inc: { upiWalletBalance: finalAmountAdd },
                    })

                    const payInCreateResult = await payInModel.create({
                        memberId: qrDoc.memberId,
                        payerName: data.payerName,
                        trxId: data.txnID,
                        amount: data.payerAmount,
                        chargeAmount: userChargeApply,
                        finalAmount: finalAmountAdd,
                        vpaId: data.payerVA,
                        bankRRN: data.BankRRN,
                        description: `QR Generated Successfully Amount:${data.payerAmount} PayerVa:${data.payerVA} BankRRN:${data.BankRRN}`,
                        trxCompletionDate: data.TxnCompletionDate,
                        trxInItDate: data.TxnInitDate,
                        isSuccess: "Success",
                    })

                    if (!upiWalletUpdateResult || !payInCreateResult) {
                        throw new Error("Error updating wallet or creating pay-in record");
                    }

                    const userRespSendApi = {
                        status: data.status,
                        payerAmount: data.payerAmount,
                        payerName: data.payerName,
                        txnID: data.txnID,
                        BankRRN: data.BankRRN,
                        payerVA: data.payerVA,
                        TxnInitDate: data.TxnInitDate,
                        TxnCompletionDate: data.TxnCompletionDate,
                    };
                    console.log("callBackPayinUrl.payInCallBackUrl>>>", callBackPayinUrl.payInCallBackUrl, userRespSendApi);



                    await axios.post(callBackPayinUrl.payInCallBackUrl, userRespSendApi, {
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                    });

                    await Log.findByIdAndUpdate(log._id, {
                        $push: { description: "Log processed for payin and marked success" },
                    });

                } catch (error) {
                    console.error(`Error processing log with trxId ${log.requestBody.txnID}:`, error.message);
                } finally {
                    loopRelease()
                }
            }

        } catch (error) {
            console.log("Error in payin schedule task:", error.message);
        } finally {
            release()
        }
    });
}

function payinScheduleTask2() {
    cron.schedule('*/10 * * * * *', async () => {
        const release = await logsMutex.acquire()
        try {
            const startOfYesterday = moment().startOf('day').subtract(1, 'day').toDate();
            const endOfYesterday = moment().startOf('day').subtract(1, 'milliseconds').toDate();
            const endOfLastHalfHour = moment().toDate(); // Current time
            const startOfLastHalfHour = moment().subtract(30, 'minutes').toDate();
            // const logs = await oldQrGenerationModel.aggregate([
            //     {
            //         $match: {
            //             trxId:{$in: matchingPayinTrxIds}
            //         },
            //     },
            //     { $limit: 1 }
            // ]);

            // if (!logs.length) return;

            for (const log of matchingPayinTrx) {
                const loopRelease = await loopMutex.acquire()
                try {
                    const trxId = log.trxId;
                    if (!trxId) throw new Error("Missing trxId in log");
                    let qrDoc
                    qrDoc = await qrGenerationModel.findOneAndUpdate(
                        { trxId, callBackStatus: { $ne: "Success" } },
                        // { trxId, callBackStatus: "Pending" },
                        { callBackStatus: "Success" },
                        { returnDocument: "after" }
                    )

                    if (!qrDoc) {
                        qrDoc = await oldQrGenerationModel.findOneAndUpdate(
                            { trxId, callBackStatus: { $ne: "Success" } },
                            // { trxId, callBackStatus: "Pending" },
                            { callBackStatus: "Success" },
                            { returnDocument: "after" }
                        );
                    }
                    console.log("qrDoc>>", qrDoc);

                    if (!qrDoc) throw new Error("QR Generation document not found or already processed");

                    // let callBackData = log.requestBody;
                    // if (Object.keys(callBackData).length === 1) {
                    //     const key = Object.keys(callBackData)[0];
                    //     callBackData = JSON.parse(key);
                    // }

                    // const switchApi = callBackData.partnerTxnId
                    //     ? "neyopayPayIn"
                    //     : callBackData.txnID
                    //         ? "marwarpayInSwitch"
                    //         : null;

                    // if (!switchApi) throw new Error("Invalid transaction data in log");

                    // const data = switchApi === "neyopayPayIn"
                    //     ? {
                    //         status: callBackData?.txnstatus === "Success" ? 200 : 400,
                    //         payerAmount: callBackData?.amount,
                    //         payerName: callBackData?.payerName,
                    //         txnID: callBackData?.partnerTxnId,
                    //         BankRRN: callBackData?.rrn,
                    //         payerVA: callBackData?.payerVA,
                    //         TxnInitDate: callBackData?.TxnInitDate,
                    //         TxnCompletionDate: callBackData?.TxnCompletionDate,
                    //     }
                    //     : {
                    //         status: callBackData?.status,
                    //         payerAmount: callBackData?.payerAmount,
                    //         payerName: callBackData?.payerName,
                    //         txnID: callBackData?.txnID,
                    //         BankRRN: callBackData?.BankRRN,
                    //         payerVA: callBackData?.payerVA,
                    //         TxnInitDate: callBackData?.TxnInitDate,
                    //         TxnCompletionDate: callBackData?.TxnCompletionDate,
                    //     };

                    // if (data.status !== 200) throw new Error("Transaction is pending or not successful");

                    const [userInfo] = await userDB.aggregate([
                        { $match: { _id: qrDoc.memberId } },
                        { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                        { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "payinpackages", localField: "package.packagePayInCharge", foreignField: "_id", as: "packageCharge" } },
                        { $unwind: { path: "$packageCharge", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, userName: 1, upiWalletBalance: 1, packageCharge: 1 } },
                    ])
                    const callBackPayinUrl = await callBackResponseModel.findOne({ memberId: qrDoc.memberId, isActive: true }).select("payInCallBackUrl")


                    if (!callBackPayinUrl) throw new Error("Callback URL is missing");


                    if (!userInfo) throw new Error("User info missing");
                    const payerAmount = qrDoc?.amount
                    const payerName = qrDoc?.name

                    const chargeRange = userInfo.packageCharge?.payInChargeRange || [];
                    const charge = chargeRange.find(
                        (range) => range.lowerLimit <= payerAmount && range.upperLimit > payerAmount
                    );

                    if (!charge) throw new Error("Package details are invalid.");;

                    const userChargeApply =
                        charge.chargeType === "Flat"
                            ? charge.charge
                            : (charge.charge / 100) * payerAmount;
                    const finalAmountAdd = payerAmount - userChargeApply;

                    const tempPayin = await payInModel.findOne({ trxId: qrDoc?.trxId })
                    const [tempUpiDoc] = await upiWalletModel.find({ description: { $regex: trxId, $options: 'i' } })

                    if (tempPayin || tempUpiDoc) {
                        // await Log.findByIdAndUpdate(log._id, {
                        //     $push: { description: "Log processed for payin and marked success" },
                        // });
                        throw new Error(`Trasaction already created: ${tempPayin ? tempPayin : tempUpiDoc}`);
                    }
                    const upiWalletDataObject = {
                        memberId: userInfo?._id,
                        transactionType: "Cr.",
                        transactionAmount: finalAmountAdd,
                        beforeAmount: userInfo?.upiWalletBalance,
                        afterAmount: Number(userInfo?.upiWalletBalance) + Number(finalAmountAdd),
                        description: `Successfully Cr. amount: ${finalAmountAdd}  trxId: ${trxId}`,
                        transactionStatus: "Success"
                    }

                    await upiWalletModel.create(upiWalletDataObject);
                    const upiWalletUpdateResult = await userDB.findByIdAndUpdate(userInfo._id, {
                        $inc: { upiWalletBalance: finalAmountAdd },
                    })

                    const payInCreateResult = await payInModel.create({
                        memberId: qrDoc.memberId,
                        payerName: payerName,
                        trxId: trxId,
                        amount: payerAmount,
                        chargeAmount: userChargeApply,
                        finalAmount: finalAmountAdd,
                        vpaId: log.VPA,
                        bankRRN: log.RRN,
                        description: `QR Generated Successfully Amount:${payerAmount} PayerVa:${log.VPA} BankRRN:${log.RRN}`,
                        trxCompletionDate: new Date(log.trxDate),
                        trxInItDate: qrDoc?.createdAt,
                        isSuccess: "Success",
                    })

                    if (!upiWalletUpdateResult || !payInCreateResult) {
                        throw new Error("Error updating wallet or creating pay-in record");
                    }

                    const userRespSendApi = {
                        status: 200,
                        payerAmount: payerAmount,
                        payerName: payerName,
                        txnID: trxId,
                        BankRRN: log.BankRRN,
                        payerVA: log.VPA,
                        TxnInitDate: new Date(qrDoc.createdAt),
                        TxnCompletionDate: log.trxDate,
                    };
                    console.log("callBackPayinUrl.payInCallBackUrl>>>", callBackPayinUrl.payInCallBackUrl, userRespSendApi);



                    await axios.post(callBackPayinUrl.payInCallBackUrl, userRespSendApi, {
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                    });
                    break
                    // await Log.findByIdAndUpdate(log._id, {
                    //     $push: { description: "Log processed for payin and marked success" },
                    // });

                } catch (error) {
                    console.error(`Error processing log with trxId ${log.trxId}:`, error.message);
                    break
                } finally {
                    loopRelease()
                }
            }

        } catch (error) {
            console.log("Error in payin schedule task:", error.message);
        } finally {
            release()
        }
    });
}

function payoutDeductDoubleTaskScript() {
    cron.schedule('*/10 * * * * *', async () => {
        console.log('Cron job started:', new Date(),);

        try {
            const startOfLastDay = moment().subtract(1, 'day').startOf('day').toDate();
            const endOfLastDay = moment().subtract(1, 'day').endOf('day').toDate();

            const logs = await Log.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfLastDay,
                            $lte: new Date()
                        },
                        responseBody: { $regex: '"status":1', $options: 'i' }
                    }
                },
                {
                    $project: {
                        trxId: '$requestBody.trxId'
                    }
                }
            ]);

            if (!logs.length) {
                console.log('No matching logs found for the last day.');
                return;
            }

            const trxIds = logs.map(log => log.trxId);

            const regexPatterns = trxIds.map(trxId => new RegExp(trxId, 'i'));

            let updatedArrayOfEwallet = [];

            for (const txnId of trxIds) {
                const [updateResult] = await EwalletModel.find(
                    {
                        description: { $regex: txnId, $options: "i" },
                        transactionType: { $regex: 'Cr.', $options: "i" },
                    }
                );

                if (updateResult) {
                    try {
                        updatedArrayOfEwallet.push(updateResult)
                        const { transactionAmount, chargeAmount, memberId } = updateResult
                        const user = await userDB.findById(memberId)
                        const finalAmountDeduct = 2 * (Number(transactionAmount) + Number(chargeAmount))
                        user.EwalletBalance -= finalAmountDeduct;
                        await user.save()
                        const ewalletDoc = await EwalletModel.create({
                            memberId,
                            transactionType: "Dr.",
                            transactionAmount: transactionAmount,
                            beforeAmount: user.EwalletBalance,
                            chargeAmount: chargeAmount,
                            afterAmount: Number(user.EwalletBalance) - Number(finalAmountDeduct),
                            description: `Successfully Dr. amount: ${finalAmountDeduct} with transaction Id: ${txnId}`,
                            transactionStatus: "Success",
                        })

                        if (ewalletDoc) await updateResult.deleteOne({ _id: updateResult?._id })
                    } catch (error) {
                        console.log("error.message>>>", error.message);
                        break
                    }

                }
            }


            console.log(`Total modified documents in eWallets: ${updatedArrayOfEwallet.length}`);
        } catch (error) {
            console.error('Error in cron job:', error.message);
        } finally {
            console.log('Cron job completed:', new Date());
        }
    });
}
var scriptRan = false
function payoutDeductPackageTaskScript() {
    cron.schedule('*/10 * * * * *', async () => {
        console.log('Cron job started:', new Date());
        if (scriptRan) return
        scriptRan = true

        try {

            for (const txnId of matchedTrxIds) {
                const [updateResult] = await EwalletModel.find(
                    {
                        description: { $regex: txnId, $options: "i" },
                    }
                );

                const payoutRecord = await payOutModel.findOne({ trxId: txnId })
                if (updateResult && payoutRecord) {
                    try {
                        const [user] = await userDB.aggregate([
                            {
                                $match: {
                                    // $and: [{ userName }, { trxAuthToken: authToken }, { isActive: true }]
                                    _id: payoutRecord.memberId
                                }
                            },
                            { $lookup: { from: "payoutswitches", localField: "payOutApi", foreignField: "_id", as: "payOutApi" } },
                            { $unwind: "$payOutApi" },
                            { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "package" } },
                            { $unwind: "$package" },
                            { $lookup: { from: "payoutpackages", localField: "package.packagePayOutCharge", foreignField: "_id", as: "packageCharge" } },
                            { $unwind: "$packageCharge" },
                            { $project: { "userName": 1, "memberId": 1, "EwalletBalance": 1, "minWalletBalance": 1, "payOutApi": 1, "packageCharge": 1 } }
                        ]);
                        if (updateResult.transactionType != "Dr.") return
                        //Addition before deduction the real charge + amount
                        let finalAmountAdd = payoutRecord.chargeAmount + payoutRecord.amount
                        user.EwalletBalance += finalAmountAdd;
                        console.log("finalamountAdd>>>>", finalAmountAdd);

                        await userDB.updateOne({ _id: user._id }, { $set: { EwalletBalance: user.EwalletBalance } });

                        if (!user) {
                            return console.log({ message: "Failed", data: "Invalid Credentials or User Inactive!" });
                        }

                        const { payOutApi, packageCharge, EwalletBalance, minWalletBalance } = user;
                        const amount = payoutRecord.amount

                        if (payOutApi.apiName === "ServerMaintenance") {
                            return console.log({ message: "Failed", data: { status_msg: "Server Under Maintenance!", status: 400, trxID: txnId } });
                        }

                        const chargeDetails = packageCharge.payOutChargeRange.find(value => value.lowerLimit <= amount && value.upperLimit > amount);
                        if (!chargeDetails) {
                            return console.log({ message: "Failed", data: "Invalid package!" });
                        }

                        const chargeAmount = chargeDetails.chargeType === "Flat" ? chargeDetails.charge : (chargeDetails.charge / 100) * amount;
                        const finalAmountDeduct = amount + chargeAmount;
                        const usableBalance = EwalletBalance - minWalletBalance;

                        const payoutGen = await payOutModelGenerate.findOneAndUpdate(
                            { trxId: txnId },
                            { afterChargeAmount: finalAmountDeduct, gatwayCharge: chargeAmount },
                            { new: true, strict: true }
                        )

                        user.EwalletBalance -= finalAmountDeduct;
                        await userDB.updateOne({ _id: user._id }, { $set: { EwalletBalance: user.EwalletBalance } });

                        payoutRecord.chargeAmount = chargeAmount
                        payoutRecord.finalAmount = finalAmountDeduct
                        await payoutRecord.save()

                        updateResult.chargeAmount = chargeAmount
                        updateResult.afterAmount = Number(user.EwalletBalance) - Number(finalAmountDeduct)

                        await updateResult.save()
                        console.log("script ran for trxId:", txnId);
                    } catch (error) {
                        console.log("error.message>>>", error.message);
                        break
                    }

                }
            }
        } catch (error) {
            console.error('Error in cron job:', error.message);
        } finally {
            console.log('Cron job completed:', new Date());
        }
    });
}

export default function scheduleTask() {
    scheduleWayuPayOutCheck()
    // logsClearFunc()
    migrateData()
    // payinScheduleTask()
    // payoutTaskScript()
    // payoutDeductPackageTaskScript()
    // payinScheduleTask2()
}