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
import { customCallBackPayoutUser } from "../controllers/adminPannelControllers/payOut.controller.js";
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

const trxIdList = [
    "seabird6673091",
    "seabird6673034",
    "seabird6671421",
    "seabird6670865",
    "seabird6669924",
    "seabird6669932",
    "seabird6669915",
    "seabird6669939",
    "seabird6638378",
    "seabird6638102",
    "seabird6637274",
    "seabird6637229",
    "seabird6637227",
    "seabird6637178",
    "seabird6637119",
    "seabird6637084",
    "seabird6634416",
    "seabird6634272",
    "seabird6620237",
    "seabird6615858",
    "seabird6615693",
    "seabird6615425",
    "seabird6615428",
    "seabird6615419",
    "seabird6615414",
    "seabird6615412",
    "seabird6615410",
    "seabird6615405",
    "seabird6615395",
    "seabird6615378",
    "seabird6615393",
    "seabird6615384",
    "seabird6615370",
    "seabird6615367",
    "seabird6615355",
    "seabird6615350",
    "seabird6615351",
    "seabird6615349",
    "seabird6612543",
    "seabird6607869",
    "seabird6606860",
    "seabird6542980",
    "seabird6542964",
    "seabird6542731",
    "seabird6542504",
    "seabird6542469",
    "seabird6542409",
    "seabird6542354",
    "seabird6541936",
    "seabird6541894",
    "seabird6541688",
    "seabird6540515",
    "seabird6539605",
    "seabird6539119",
    "seabird6537961",
    "seabird6537342",
    "seabird6536636",
    "seabird6529878",
    "seabird6529871",
    "seabird6529869",
    "seabird6529862",
    "seabird6529811",
    "seabird6529777",
    "seabird6529138",
    "seabird6528864",
    "seabird6528756",
    "seabird6528764",
    "seabird6527851",
    "seabird6527854",
    "seabird6527870",
    "seabird6527754",
    "seabird6527586",
    "seabird6527202",
    "seabird6527154",
    "seabird6526873",
    "seabird6526876",
    "seabird6526709",
    "seabird6525832",
    "seabird6525756",
    "seabird6525761",
    "seabird6525757",
    "seabird6525748",
    "seabird6525743",
    "seabird6525655",
    "seabird6525242",
    "seabird6524690",
    "seabird6508016",
    "seabird6516010",
    "seabird6516064",
    "seabird6524315",
    "seabird6524317",
    "seabird6524262",
    "seabird6524275",
    "seabird6524281",
    "seabird6524288",
    "seabird6524246",
    "seabird6524247",
    "seabird6524238",
    "seabird6524233",
    "seabird6524237",
    "seabird6524231",
    "seabird6524218",
    "seabird6524081",
    "seabird6523647",
    "seabird6523648",
    "seabird6523653",
    "seabird6523619",
    "seabird6523624",
    "seabird6523605",
    "seabird6523617",
    "seabird6523607",
    "seabird6523604",
    "seabird6523564",
    "seabird6523590",
    "seabird6523581",
    "seabird6523579",
    "seabird6523591",
    "seabird6523558",
    "seabird6523516",
    "seabird6523527",
    "seabird6523596",
    "seabird6523474",
    "seabird6523562",
    "seabird6523551",
    "seabird6523549",
    "seabird6523509",
    "seabird6523482",
    "seabird6523488",
    "seabird6523486",
    "seabird6523498",
    "seabird6523497",
    "seabird6523460",
    "seabird6523457",
    "seabird6523440",
    "seabird6523444",
    "seabird6523436",
    "seabird6523423",
    "seabird6523421",
    "seabird6523417",
    "seabird6523224",
    "seabird6522677",
    "seabird6521015",
    "seabird6521009",
    "seabird6520995",
    "seabird6520951",
    "seabird6520955",
    "seabird6520338",
    "seabird6520344",
    "seabird6520319",
    "seabird6520347",
    "seabird6520329",
    "seabird6520327",
    "seabird6520315",
    "seabird6520312",
    "seabird6520317",
    "seabird6520316",
    "seabird6520314",
    "seabird6520310",
    "seabird6520303",
    "seabird6520311",
    "seabird6520308",
    "seabird6520305",
    "seabird6520313",
    "seabird6520301",
    "seabird6520307",
    "seabird6520302",
    "seabird6520300",
    "seabird6520002",
    "seabird6519983",
    "seabird6519919",
    "seabird6519904",
    "seabird6519872",
    "seabird6519873",
    "seabird6519036",
    "seabird6519026",
    "seabird6519015",
    "seabird6518821",
    "seabird6518783",
    "seabird6518472",
    "seabird6518392",
    "seabird6517441",
    "seabird6517178",
    "seabird6516595",
    "seabird6516543",
    "seabird6516362",
    "seabird6516292",
    "seabird6516276",
    "seabird6516275",
    "seabird6516253",
    "seabird6516251",
    "seabird6516243",
    "seabird6516242",
    "seabird6516186",
    "seabird6516183",
    "seabird6516181",
    "seabird6516073",
    "seabird6516061",
    "seabird6516016",
    "seabird6516004",
    "seabird6515390",
    "seabird6515304",
    "seabird6514510",
    "seabird6514280",
    "seabird6513822",
    "seabird6513092",
    "seabird6512588",
    "seabird6511312",
    "seabird6511311",
    "seabird6511308",
    "seabird6511323",
    "seabird6511305",
    "seabird6511320",
    "seabird6511333",
    "seabird6511281",
    "seabird6511271",
    "seabird6511282",
    "seabird6511270",
    "seabird6511272",
    "seabird6511256",
    "seabird6510354",
    "seabird6510117",
    "seabird6509758",
    "seabird6509751",
    "seabird6509472",
    "seabird6509398",
    "seabird6509247",
    "seabird6509162",
    "seabird6509163",
    "seabird6509044",
    "seabird6509045",
    "seabird6508748",
    "seabird6508714",
    "seabird6508126",
    "seabird6507298",
    "seabird6506984",
    "seabird6506065",
    "seabird6506069",
    "seabird6506073",
    "seabird6506059",
    "seabird6506055",
    "seabird6506040",
    "seabird6506012",
    "seabird6506029",
    "seabird6505918",
    "seabird6505372",
    "seabird6505369",
    "seabird6505228",
    "seabird6505081",
    "seabird6505001",
    "seabird6504713",
    "seabird6504476",
    "seabird6504271",
    "seabird6504198",
    "seabird6503599",
    "seabird6503539",
    "seabird6503531",
    "seabird6503527",
    "seabird6503508",
    "seabird6503435",
    "seabird6503425",
    "seabird6503428",
    "seabird6503397",
    "seabird6502926",
    "seabird6502929",
    "seabird6502922",
    "seabird6502918",
    "seabird6502906",
    "seabird6502619",
    "seabird6502508",
    "seabird6502395",
    "seabird6502148",
    "seabird6501296",
    "seabird6501125",
    "seabird6501120",
    "seabird6500966",
    "seabird6500962",
    "seabird6500932",
    "seabird6500934",
    "seabird6500931",
    "seabird6500933",
    "seabird6457949",
    "seabird6500823",
    "seabird6500775",
    "seabird6500726",
    "seabird6500676",
    "seabird6500449",
    "seabird6500453",
    "seabird6500434",
    "seabird6500426",
    "seabird6500048",
    "seabird6500003",
    "seabird6499980",
    "seabird6499963",
    "seabird6498586",
    "seabird6498592",
    "seabird6498371",
    "seabird6498568",
    "seabird6498561",
    "seabird6498545",
    "seabird6498532",
    "seabird6498535",
    "seabird6498481",
    "seabird6498455",
    "seabird6498498",
    "seabird6498505",
    "seabird6498499",
    "seabird6498453",
    "seabird6498440",
    "seabird6498421",
    "seabird6498420",
    "seabird6498361",
    "seabird6497432",
    "seabird6497331",
    "seabird6497306",
    "seabird6496341",
    "seabird6494940",
    "seabird6494932",
    "seabird6494474",
    "seabird6494493",
    "seabird6493846",
    "seabird6493592",
    "seabird6493583",
    "seabird6493497",
    "seabird6493481",
    "seabird6493462",
    "seabird6493404",
    "seabird6492943",
    "seabird6492817",
    "seabird6492720",
    "seabird6492503",
    "seabird6492476",
    "seabird6492482",
    "seabird6492465",
    "seabird6492378",
    "seabird6492388",
    "seabird6492381",
    "seabird6492374",
    "seabird6492365",
    "seabird6492347",
    "seabird6492331",
    "seabird6492299",
    "seabird6492267",
    "seabird6492269",
    "seabird6492119",
    "seabird6492074",
    "seabird6492095",
    "seabird6492103",
    "seabird6492084",
    "seabird6492106",
    "seabird6492080",
    "seabird6491560",
    "seabird6477728",
    "seabird6477726",
    "seabird6477736",
    "seabird6477750",
    "seabird6477727",
    "seabird6477732",
    "seabird6477725",
    "seabird6477746",
    "seabird6477723",
    "seabird6477751",
    "seabird6477734",
    "seabird6477729",
    "seabird6477749",
    "seabird6477743",
    "seabird6477722",
    "seabird6477731",
    "seabird6477740",
    "seabird6477739",
    "seabird6477735",
    "seabird6477747",
    "seabird6477696",
    "seabird6477694",
    "seabird6477705",
    "seabird6477708",
    "seabird6477703",
    "seabird6477713",
    "seabird6477706",
    "seabird6477701",
    "seabird6477712",
    "seabird6477707",
    "seabird6477702",
    "seabird6477700",
    "seabird6477714",
    "seabird6477691",
    "seabird6477698",
    "seabird6477704",
    "seabird6477690",
    "seabird6477699",
    "seabird6477709",
    "seabird6477666",
    "seabird6477664",
    "seabird6477656",
    "seabird6477651",
    "seabird6477637",
    "seabird6477652",
    "seabird6477650",
    "seabird6477646",
    "seabird6477648",
    "seabird6477643",
    "seabird6477653",
    "seabird6477645",
    "seabird6477642",
    "seabird6477647",
    "seabird6477641",
    "seabird6477640",
    "seabird6477633",
    "seabird6477636",
    "seabird6477635",
    "seabird6477630",
    "seabird6477634",
    "seabird6477654",
    "seabird6477627",
    "seabird6477631",
    "seabird6477638",
    "seabird6477644",
    "seabird6477632",
    "seabird6477629",
    "seabird6477639",
    "seabird6477612",
    "seabird6477620",
    "seabird6477616",
    "seabird6477621",
    "seabird6477615",
    "seabird6477619",
    "seabird6477622",
    "seabird6477611",
    "seabird6477607",
    "seabird6477613",
    "seabird6477618",
    "seabird6477606",
    "seabird6477603",
    "seabird6477610",
    "seabird6477586",
    "seabird6477582",
    "seabird6477571",
    "seabird6477572",
    "seabird6477570",
    "seabird6477592",
    "seabird6477576",
    "seabird6477569",
    "seabird6477544",
    "seabird6477561",
    "seabird6477587",
    "seabird6477563",
    "seabird6477558",
    "seabird6477550",
    "seabird6477541",
    "seabird6477584",
    "seabird6477540",
    "seabird6477546",
    "seabird6477568",
    "seabird6477545",
    "seabird6477535",
    "seabird6477534",
    "seabird6477521",
    "seabird6477526",
    "seabird6477514",
    "seabird6477522",
    "seabird6477525",
    "seabird6477531",
    "seabird6477557",
    "seabird6477533",
    "seabird6477528",
    "seabird6477537",
    "seabird6477510",
    "seabird6477517",
    "seabird6477505",
    "seabird6477496",
    "seabird6477504",
    "seabird6477491",
    "seabird6477490",
    "seabird6477484",
    "seabird6477492",
    "seabird6477482",
    "seabird6477495",
    "seabird6477481",
    "seabird6477433",
    "seabird6477440",
    "seabird6477435",
    "seabird6477420",
    "seabird6477427",
    "seabird6477403",
    "seabird6477425",
    "seabird6477401",
    "seabird6477426",
    "seabird6477408",
    "seabird6477414",
    "seabird6477413",
    "seabird6477418",
    "seabird6477424",
    "seabird6477402",
    "seabird6477407",
    "seabird6477400",
    "seabird6477411",
    "seabird6477399",
    "seabird6477388",
    "seabird6477397",
    "seabird6477389",
    "seabird6477391",
    "seabird6477392",
    "seabird6477387",
    "seabird6477395",
    "seabird6477375",
    "seabird6477371",
    "seabird6477360",
    "seabird6477366",
    "seabird6477358",
    "seabird6477367",
    "seabird6477383",
    "seabird6477356",
    "seabird6477377",
    "seabird6477384",
    "seabird6477364",
    "seabird6477370",
    "seabird6477379",
    "seabird6477378",
    "seabird6477385",
    "seabird6477380",
    "seabird6477368",
    "seabird6477373",
    "seabird6477361",
    "seabird6477374",
    "seabird6477382",
    "seabird6477362",
    "seabird6477381",
    "seabird6477363",
    "seabird6477349",
    "seabird6477341",
    "seabird6477339",
    "seabird6477340",
    "seabird6477346",
    "seabird6477354",
    "seabird6477355",
    "seabird6477347",
    "seabird6477348",
    "seabird6477337",
    "seabird6477353",
    "seabird6477328",
    "seabird6477336",
    "seabird6477329",
    "seabird6477326",
    "seabird6477334",
    "seabird6477330",
    "seabird6477345",
    "seabird6477322",
    "seabird6477323",
    "seabird6477324",
    "seabird6477325",
    "seabird6477298",
    "seabird6477297",
    "seabird6477306",
    "seabird6477317",
    "seabird6477307",
    "seabird6477303",
    "seabird6477301",
    "seabird6477292",
    "seabird6477308",
    "seabird6477314",
    "seabird6477313",
    "seabird6477296",
    "seabird6477300",
    "seabird6477320",
    "seabird6477299",
    "seabird6477305",
    "seabird6477294",
    "seabird6477312",
    "seabird6477304",
    "seabird6477318",
    "seabird6477316",
    "seabird6477293",
    "seabird6477291",
    "seabird6477258",
    "seabird6477122",
    "seabird6477120",
    "seabird6472378",
    "seabird6472364",
    "seabird6472330",
    "seabird6472348",
    "seabird6472319",
    "seabird6472345",
    "seabird6472324",
    "seabird6472320",
    "seabird6472300",
    "seabird6472298",
    "seabird6472274",
    "seabird6472263",
    "seabird6472268",
    "seabird6471997",
    "seabird6471367",
    "seabird6470894",
    "seabird6470230",
    "seabird6469940",
    "seabird6469799",
    "seabird6469705",
    "seabird6469617",
    "seabird6469174",
    "seabird6469102",
    "seabird6468571",
    "seabird6468572",
    "seabird6468565",
    "seabird6468569",
    "seabird6468570",
    "seabird6468409",
    "seabird6468107",
    "seabird6467948",
    "seabird6467789",
    "seabird6467791",
    "seabird6467667",
    "seabird6467662",
    "seabird6467650",
    "seabird6467656",
    "seabird6467659",
    "seabird6467529",
    "seabird6467495",
    "seabird6466291",
    "seabird6466288",
    "seabird6466067",
    "seabird6466068",
    "seabird6466056",
    "seabird6466038",
    "seabird6466019",
    "seabird6466024",
    "seabird6466014",
    "seabird6465845",
    "seabird6465617",
    "seabird6465135",
    "seabird6464830",
    "seabird6464030",
    "seabird6462971",
    "seabird6462546",
    "seabird6462526",
    "seabird6462537",
    "seabird6462539",
    "seabird6462488",
    "seabird6462553",
    "seabird6462585",
    "seabird6462502",
    "seabird6462607",
    "seabird6462568",
    "seabird6462471",
    "seabird6462451",
    "seabird6462470",
    "seabird6462468",
    "seabird6462579",
    "seabird6462533",
    "seabird6462480",
    "seabird6462458",
    "seabird6462465",
    "seabird6462423",
    "seabird6462494",
    "seabird6462425",
    "seabird6462426",
    "seabird6462424",
    "seabird6461908",
    "seabird6455475",
    "seabird6455460",
    "seabird6455147",
    "seabird6455086",
    "seabird6455075",
    "seabird6455022",
    "seabird6455031",
    "seabird6455049",
    "seabird6455063",
    "seabird6455045",
    "seabird6455037",
    "seabird6455042",
    "seabird6455030",
    "seabird6455038",
    "seabird6455027",
    "seabird6455050",
    "seabird6455001",
    "seabird6454998",
    "seabird6455011",
    "seabird6454992",
    "seabird6454999",
    "seabird6454993",
    "seabird6454986",
    "seabird6454981",
    "seabird6454967",
    "seabird6454959",
    "seabird6454976",
    "seabird6454978",
    "seabird6454971",
    "seabird6454983",
    "seabird6454960",
    "seabird6454972",
    "seabird6454950",
    "seabird6454943",
    "seabird6454966",
    "seabird6454979",
    "seabird6454927",
    "seabird6454940",
    "seabird6454974",
    "seabird6454941",
    "seabird6454953",
    "seabird6454962",
    "seabird6454965",
    "seabird6454934",
    "seabird6454938",
    "seabird6454909",
    "seabird6454891",
    "seabird6454913",
    "seabird6454903",
    "seabird6454907",
    "seabird6454895",
    "seabird6454899",
    "seabird6454885",
    "seabird6454843",
    "seabird6454860",
    "seabird6454842",
    "seabird6454823",
    "seabird6454868",
    "seabird6454876",
    "seabird6454830",
    "seabird6454822",
    "seabird6454832",
    "seabird6454811",
    "seabird6454869",
    "seabird6454837",
    "seabird6454812",
    "seabird6454795",
    "seabird6454803",
    "seabird6454793",
    "seabird6454799",
    "seabird6454804",
    "seabird6454789",
    "seabird6454783",
    "seabird6454775",
    "seabird6454780",
    "seabird6454767",
    "seabird6454774",
    "seabird6454753",
    "seabird6454779",
    "seabird6454745",
    "seabird6454721",
    "seabird6454764",
    "seabird6454746",
    "seabird6454737",
    "seabird6454714",
    "seabird6454722",
    "seabird6454720",
    "seabird6454766",
    "seabird6454719",
    "seabird6454708",
    "seabird6454703",
    "seabird6454691",
    "seabird6454693",
    "seabird6454658",
    "seabird6454676",
    "seabird6454649",
    "seabird6454647",
    "seabird6454666",
    "seabird6454648",
    "seabird6454621",
    "seabird6454628",
    "seabird6454657",
    "seabird6454671",
    "seabird6454646",
    "seabird6454632",
    "seabird6454620",
    "seabird6454664",
    "seabird6454665",
    "seabird6454642",
    "seabird6454659",
    "seabird6454667",
    "seabird6454625",
    "seabird6454633",
    "seabird6454640",
    "seabird6454601",
    "seabird6454593",
    "seabird6454591",
    "seabird6454585",
    "seabird6454583",
    "seabird6454600",
    "seabird6454567",
    "seabird6454578",
    "seabird6454557",
    "seabird6454558",
    "seabird6454556",
    "seabird6454579",
    "seabird6454563",
    "seabird6454576",
    "seabird6454529",
    "seabird6454530",
    "seabird6454547",
    "seabird6454527",
    "seabird6454546",
    "seabird6454498",
    "seabird6454508",
    "seabird6454499",
    "seabird6454517",
    "seabird6454518",
    "seabird6454500",
    "seabird6454501",
    "seabird6454512",
    "seabird6454503",
    "seabird6454479",
    "seabird6454526",
    "seabird6454486",
    "seabird6454475",
    "seabird6454478",
    "seabird6454459",
    "seabird6454469",
    "seabird6454485",
    "seabird6454467",
    "seabird6454448",
    "seabird6454445",
    "seabird6454441",
    "seabird6454440",
    "seabird6454433",
    "seabird6454431",
    "seabird6454450",
    "seabird6454425",
    "seabird6454422",
    "seabird6454418",
    "seabird6454412",
    "seabird6454417",
    "seabird6454419",
    "seabird6454408",
    "seabird6454406",
    "seabird6454403",
    "seabird6454400",
    "seabird6454397",
    "seabird6454398",
    "seabird6454393",
    "seabird6454394",
    "seabird6454391",
    "seabird6454395",
    "seabird6454392",
    "seabird6454388",
    "seabird6454387",
    "seabird6454383",
    "seabird6454389",
    "seabird6454384",
    "seabird6454390",
    "seabird6454385",
    "seabird6454380",
    "seabird6454381",
    "seabird6454382",
    "seabird6454379",
    "seabird6454375",
    "seabird6454361",
    "seabird6454368",
    "seabird6454364",
    "seabird6454366",
    "seabird6454374",
    "seabird6454367",
    "seabird6454370",
    "seabird6454353",
    "seabird6454377",
    "seabird6454362",
    "seabird6454363",
    "seabird6454376",
    "seabird6454373",
    "seabird6454356",
    "seabird6454371",
    "seabird6454359",
    "seabird6454378",
    "seabird6454365",
    "seabird6454372",
    "seabird6454355",
    "seabird6454358",
    "seabird6454354",
    "seabird6454357",
    "seabird6454350",
    "seabird6454369",
    "seabird6454351",
    "seabird6454360",
    "seabird6454349",
    "seabird6454352",
    "seabird6454344",
    "seabird6454316",
    "seabird6454325",
    "seabird6454321",
    "seabird6454317",
    "seabird6454327",
    "seabird6454337",
    "seabird6454313",
    "seabird6454305",
    "seabird6454308",
    "seabird6454300",
    "seabird6454290",
    "seabird6454289",
    "seabird6454282",
    "seabird6454262",
    "seabird6454243",
    "seabird6454255",
    "seabird6454266",
    "seabird6454253",
    "seabird6454239",
    "seabird6454251",
    "seabird6454248",
    "seabird6454250",
    "seabird6454237",
    "seabird6454268",
    "seabird6454256",
    "seabird6454252",
    "seabird6454241",
    "seabird6454245",
    "seabird6454246",
    "seabird6454249",
    "seabird6454234",
    "seabird6454244",
    "seabird6454242",
    "seabird6454228",
    "seabird6454247",
    "seabird6454230",
    "seabird6454254",
    "seabird6454232",
    "seabird6454231",
    "seabird6454235",
    "seabird6454233",
    "seabird6454227",
    "seabird6454229",
    "seabird6454215",
    "seabird6454204",
    "seabird6454238",
    "seabird6454223",
    "seabird6454206",
    "seabird6454213",
    "seabird6454225",
    "seabird6454221",
    "seabird6454212",
    "seabird6454217",
    "seabird6454222",
    "seabird6454218",
    "seabird6454226",
    "seabird6454210",
    "seabird6454211",
    "seabird6454209",
    "seabird6454214",
    "seabird6454207",
    "seabird6454224",
    "seabird6454219",
    "seabird6454198",
    "seabird6454200",
    "seabird6454220",
    "seabird6454201",
    "seabird6454202",
    "seabird6454205",
    "seabird6454203",
    "seabird6454197",
    "seabird6454199",
    "seabird6454098",
    "seabird6454087",
    "seabird6454040",
    "seabird6453699",
    "seabird6453356",
    "seabird6453080",
    "seabird6452938",
    "seabird6452795",
    "seabird6452753",
    "seabird6452629",
    "seabird6452380",
    "seabird6452369",
    "seabird6452035",
    "seabird6452023",
    "seabird6452026",
    "seabird6452033",
    "seabird6452028",
    "seabird6452034",
    "seabird6452031",
    "seabird6452019",
    "seabird6452006",
    "seabird6452016",
    "seabird6452012",
    "seabird6452008",
    "seabird6452014",
    "seabird6452013",
    "seabird6452009",
    "seabird6452007",
    "seabird6452015",
    "seabird6452018",
    "seabird6452010",
    "seabird6452017",
    "seabird6452011",
    "seabird6451994",
    "seabird6452000",
    "seabird6451995",
    "seabird6452001",
    "seabird6451981",
    "seabird6451979",
    "seabird6452002",
    "seabird6451993",
    "seabird6451990",
    "seabird6451978",
    "seabird6451998",
    "seabird6451740",
    "seabird6451717",
    "seabird6451632",
    "seabird6451640",
    "seabird6451631",
    "seabird6451624",
    "seabird6451616",
    "seabird6451618",
    "seabird6451611",
    "seabird6451617",
    "seabird6451628",
    "seabird6451613",
    "seabird6451607",
    "seabird6451566",
    "seabird6451579",
    "seabird6451572",
    "seabird6451564",
    "seabird6451560",
    "seabird6451582",
    "seabird6451576",
    "seabird6451555",
    "seabird6451542",
    "seabird6451573",
    "seabird6451549",
    "seabird6451547",
    "seabird6451527",
    "seabird6451532",
    "seabird6451536",
    "seabird6451519",
    "seabird6451510",
    "seabird6451504",
    "seabird6451500",
    "seabird6451502",
    "seabird6451498",
    "seabird6451494",
    "seabird6451346",
    "seabird6451200",
    "seabird6451164",
    "seabird6450859",
    "seabird6450838",
    "seabird6450746",
    "seabird6450566",
    "seabird6450532",
    "seabird6450545",
    "seabird6450509",
    "seabird6450514",
    "seabird6450502",
    "seabird6450474",
    "seabird6450472",
    "seabird6450462",
    "seabird6450451",
    "seabird6450443",
    "seabird6450452",
    "seabird6450440",
    "seabird6450454",
    "seabird6450458",
    "seabird6450441",
    "seabird6450403",
    "seabird6450421",
    "seabird6450415",
    "seabird6450411",
    "seabird6450408",
    "seabird6450400",
    "seabird6450387",
    "seabird6450353",
    "seabird6450389",
    "seabird6450392",
    "seabird6450371",
    "seabird6450368",
    "seabird6450361",
    "seabird6450350",
    "seabird6450339",
    "seabird6450330",
    "seabird6450333",
    "seabird6450323",
    "seabird6450328",
    "seabird6450310",
    "seabird6450318",
    "seabird6450308",
    "seabird6450307",
    "seabird6450316",
    "seabird6450317",
    "seabird6450290",
    "seabird6450300",
    "seabird6450297",
    "seabird6450301",
    "seabird6450280",
    "seabird6450260",
    "seabird6450247",
    "seabird6450257",
    "seabird6450243",
    "seabird6450275",
    "seabird6450269",
    "seabird6450233",
    "seabird6450232",
    "seabird6450217",
    "seabird6450229",
    "seabird6450196",
    "seabird6450204",
    "seabird6450200",
    "seabird6450192",
    "seabird6450198",
    "seabird6450160",
    "seabird6450072",
    "seabird6449935",
    "seabird6449862",
    "seabird6449853",
    "seabird6449845",
    "seabird6449830",
    "seabird6449833",
    "seabird6449843",
    "seabird6449834",
    "seabird6449825",
    "seabird6449812",
    "seabird6449819",
    "seabird6449818",
    "seabird6449809",
    "seabird6449797",
    "seabird6449791",
    "seabird6449778",
    "seabird6449790",
    "seabird6449769",
    "seabird6449781",
    "seabird6449780",
    "seabird6449761",
    "seabird6449760",
    "seabird6449752",
    "seabird6449738",
    "seabird6449733",
    "seabird6449728",
    "seabird6449711",
    "seabird6449682",
    "seabird6449673",
    "seabird6449650",
    "seabird6449656",
    "seabird6449664",
    "seabird6449662",
    "seabird6449620",
    "seabird6449622",
    "seabird6449639",
    "seabird6449646",
    "seabird6449634",
    "seabird6449619",
    "seabird6449608",
    "seabird6449592",
    "seabird6449590",
    "seabird6449593",
    "seabird6449585",
    "seabird6449570",
    "seabird6449564",
    "seabird6449572",
    "seabird6449562",
    "seabird6449530",
    "seabird6449568",
    "seabird6449550",
    "seabird6449539",
    "seabird6449527",
    "seabird6449529",
    "seabird6449525",
    "seabird6449511",
    "seabird6449506",
    "seabird6449503",
    "seabird6449524",
    "seabird6449487",
    "seabird6449480",
    "seabird6449489",
    "seabird6449484",
    "seabird6449479",
    "seabird6449475",
    "seabird6449450",
    "seabird6449462",
    "seabird6449443",
    "seabird6449461",
    "seabird6449456",
    "seabird6449452",
    "seabird6449457",
    "seabird6449365",
    "seabird6449359",
    "seabird6449374",
    "seabird6449343",
    "seabird6449364",
    "seabird6449336",
    "seabird6449335",
    "seabird6449331",
    "seabird6449338",
    "seabird6448905",
    "seabird6448915",
    "seabird6448334",
    "seabird6447916",
    "seabird6447659",
    "seabird6446632",
    "seabird6446522",
    "seabird6446521",
    "seabird6446515",
    "seabird6446340",
    "seabird6446341",
    "seabird6446281",
    "seabird6444944",
    "seabird6444663",
    "seabird6444289",
    "seabird6444201",
    "seabird6444155",
    "seabird6443618",
    "seabird6443592",
    "seabird6443590",
    "seabird6443580",
    "seabird6443557",
    "seabird6443124",
    "seabird6442942",
    "seabird6442944",
    "seabird6442673",
    "seabird6442498",
    "seabird6442313",
    "seabird6442014",
    "seabird6441979",
    "seabird6441951",
    "seabird6441811",
    "seabird6441670",
    "seabird6441571",
    "seabird6441567",
    "seabird6441449",
    "seabird6441295",
    "seabird6439204",
    "seabird6439199",
    "seabird6430653",
    "seabird6430633",
    "seabird6430626",
    "seabird6430388",
    "seabird6430391",
    "seabird6428546",
    "seabird6426989",
    "seabird6426657",
    "seabird6426462",
    "seabird6426454",
    "seabird6426358",
    "seabird6425829",
    "seabird6425828",
    "seabird6425124",
    "seabird6425092",
    "seabird6424234",
    "seabird6424064",
    "seabird6423847",
    "seabird6423795",
    "seabird6423546",
    "seabird6423463",
    "seabird6423408",
    "seabird6423122",
    "seabird6422904",
    "seabird6421770",
    "seabird6421445",
    "seabird6421326",
    "seabird6421144",
    "seabird6421145",
    "seabird6349872",
    "seabird6349697",
    "seabird6349724",
    "seabird6349667",
    "seabird6349732",
    "seabird6349714",
    "seabird6349701",
    "seabird6349740",
    "seabird6349736",
    "seabird6349664",
    "seabird6349637",
    "seabird6349658",
    "seabird6349717",
    "seabird6349702",
    "seabird6349684",
    "seabird6349668",
    "seabird6349678",
    "seabird6349671",
    "seabird6349666",
    "seabird6349733",
    "seabird6349634",
    "seabird6349725",
    "seabird6349716",
    "seabird6349610",
    "seabird6349631",
    "seabird6349607",
    "seabird6349628",
    "seabird6349600",
    "seabird6349654",
    "seabird6349620",
    "seabird6349616",
    "seabird6349609",
    "seabird6349597",
    "seabird6349582",
    "seabird6349588",
    "seabird6349589",
    "seabird6349601",
    "seabird6349547",
    "seabird6349551",
    "seabird6349550",
    "seabird6349544",
    "seabird6349570",
    "seabird6349548",
    "seabird6316129",
    "seabird6316123",
    "seabird6316091",
    "seabird6316090",
    "seabird6316066",
    "seabird6349523",
    "seabird6349527",
    "seabird6349533",
    "seabird6349534",
    "seabird6349511",
    "seabird6349502",
    "seabird6349495",
    "seabird6349497",
    "seabird6349514",
    "seabird6349493",
    "seabird6349467",
    "seabird6349465",
    "seabird6349489",
    "seabird6349455",
    "seabird6349456",
    "seabird6349067",
    "seabird6349059",
    "seabird6349051",
    "seabird6349045",
    "seabird6349031",
    "seabird6349048",
    "seabird6349030",
    "seabird6349025",
    "seabird6348939",
    "seabird6332022",
    "seabird6273386",
    "seabird6273284",
    "seabird6273287",
    "seabird6273281",
    "seabird6273247",
    "seabird6273231",
    "seabird6273236",
    "seabird6271348",
    "seabird6273103",
    "seabird6273020",
    "seabird6272755",
    "seabird6271050",
    "seabird6246211",
    "seabird6267488",
    "seabird6267400",
    "seabird6210124",
    "seabird6209657",
    "seabird6205557",
    "seabird6203458",
    "seabird6203086",
    "seabird6203085",
    "seabird6202605",
    "seabird6202604",
    "seabird6202547",
    "seabird6202480",
    "seabird6202478",
    "seabird6202470",
    "seabird6202469",
    "seabird6202417",
    "seabird6202179",
    "seabird6202177",
    "seabird6202176",
    "seabird6201786",
    "seabird6201057",
    "seabird6201032",
    "seabird6201031",
    "seabird6200850",
    "seabird6200364",
    "seabird6200255",
    "seabird6200259",
    "seabird6200264",
    "seabird6200233",
    "seabird6200232",
    "seabird6200229",
    "seabird6200221",
    "seabird6200216",
    "seabird6200220",
    "seabird6200106",
    "seabird6200065",
    "seabird6200147",
    "seabird6195765",
    "seabird6195501",
    "seabird6195429",
    "seabird6195425",
    "seabird6194695",
    "seabird6194241",
    "seabird6194257",
    "seabird6194337",
    "seabird6194250",
    "seabird6194181",
    "seabird6194152",
    "seabird6193660",
    "seabird6193515",
    "seabird6193401",
    "seabird6193404",
    "seabird6193412",
    "seabird6191658",
    "seabird6191657",
    "seabird6191652",
    "seabird6191464",
    "seabird6191429",
    "seabird6191304",
    "seabird6191321",
    "seabird6191248",
    "seabird6190635",
    "seabird6190597",
    "seabird6190631",
    "seabird6190624",
    "seabird6190524",
    "seabird6190577",
    "seabird6189925",
    "seabird6189388",
    "seabird6189372",
    "seabird6188573",
    "seabird6187409",
    "seabird6187383",
    "seabird6187297",
    "seabird6187239",
    "seabird6186872",
    "seabird6186841",
    "seabird6141329",
    "seabird6185749",
    "seabird6185583",
    "seabird6185609",
    "seabird6185576",
    "seabird6185495",
    "seabird6184377",
    "seabird6184414",
    "seabird6184373",
    "seabird6184366",
    "seabird6184355",
    "seabird6184350",
    "seabird6184281",
    "seabird6184275",
    "seabird6184251",
    "seabird6184242",
    "seabird6184268",
    "seabird6184243",
    "seabird6184214",
    "seabird6182893",
    "seabird6182919",
    "seabird6182873",
    "seabird6182890",
    "seabird6126284",
    "seabird6124846",
    "seabird6124825",
    "seabird6124713",
    "seabird6124727",
    "seabird6124715",
    "seabird6124658",
    "seabird6124684",
    "seabird6124660",
    "seabird6124651",
    "seabird6124530",
    "seabird6124261",
    "seabird6124246",
    "seabird6123209",
    "seabird6123172",
    "seabird6179503",
    "seabird6123000",
    "seabird6122917",
    "seabird6122895",
    "seabird6122864",
    "seabird6179390",
    "seabird6179353",
    "seabird6122772",
    "seabird6122746",
    "seabird6122747",
    "seabird6122720",
    "seabird6179051",
    "seabird6122256",
    "seabird6178910",
    "seabird6178521",
    "seabird6178484",
    "seabird6178221",
    "seabird6176695",
    "seabird6175889",
    "seabird6175838",
    "seabird6175835",
    "seabird6175800",
    "seabird6175798",
    "seabird6175696",
    "seabird6173192",
    "seabird6173164",
    "seabird6173081",
    "seabird6173071",
    "seabird6172900",
    "seabird6172894",
    "seabird6172765",
    "seabird6172751",
    "seabird6172750",
    "seabird6172299",
    "seabird6172298",
    "seabird6172202",
    "seabird6172199",
    "seabird6172191",
    "seabird6172189",
    "seabird6172187",
    "seabird6172184",
    "seabird6171239",
    "seabird6171076",
    "seabird6170958",
    "seabird6170901",
    "seabird6170912",
    "seabird6170934",
    "seabird6170956",
    "seabird6170959",
    "seabird6170954",
    "seabird6170868",
    "seabird6170951",
    "seabird6170829",
    "seabird6170888",
    "seabird6170833",
    "seabird6170786",
    "seabird6170781",
    "seabird6170790",
    "seabird6170767",
    "seabird6170700",
    "seabird6170645",
    "seabird6170640",
    "seabird6170623",
    "seabird6170603",
    "seabird6170595",
    "seabird6170592",
    "seabird6170591",
    "seabird6170590",
    "seabird6170589",
    "seabird6170562",
    "seabird6170196",
    "seabird6169015",
    "seabird6169022",
    "seabird6169010",
    "seabird6168755",
    "seabird6168757",
    "seabird6168583",
    "seabird6168591",
    "seabird6168584",
    "seabird6168588",
    "seabird6168549",
    "seabird6168538",
    "seabird6168533",
    "seabird6168523",
    "seabird6168507",
    "seabird6168431",
    "seabird6168380",
    "seabird6168377",
    "seabird6168276",
    "seabird6168215",
    "seabird6168205",
    "seabird6168191",
    "seabird6168178",
    "seabird6168123",
    "seabird6168119",
    "seabird6167794",
    "seabird6167785",
    "seabird6167414",
    "seabird6167174",
    "seabird6167092",
    "seabird6167110",
    "seabird6167093",
    "seabird6167107",
    "seabird6167057",
    "seabird6167031",
    "seabird6167041",
    "seabird6165904",
    "seabird6165910",
    "seabird6165936",
    "seabird6165819",
    "seabird6165844",
    "seabird6165750",
    "seabird6165699",
    "seabird6165691",
    "seabird6165679",
    "seabird6165631",
    "seabird6165622",
    "seabird6165554",
    "seabird6165454",
    "seabird6165565",
    "seabird6165447",
    "seabird6165230",
    "seabird6165184",
    "seabird6165153",
    "seabird6165145",
    "seabird6164984",
    "seabird6164976",
    "seabird6164864",
    "seabird6164822",
    "seabird6164696",
    "seabird6164435",
    "seabird6164399",
    "seabird6164369",
    "seabird6164354",
    "seabird6164333",
    "seabird6164325",
    "seabird6164323",
    "seabird6164315",
    "seabird6164314",
    "seabird6164236",
    "seabird6164230",
    "seabird6164214",
    "seabird6164211",
    "seabird6164130",
    "seabird6164085",
    "seabird6163980",
    "seabird6163961",
    "seabird6163915",
    "seabird6163600",
    "seabird6163594",
    "seabird6163610",
    "seabird6163593",
    "seabird6163524",
    "seabird6162835",
    "seabird6162765",
    "seabird6162827",
    "seabird6162781",
    "seabird6162122",
    "seabird6162089",
    "seabird6162137",
    "seabird6162121",
    "seabird6162021",
    "seabird6162138",
    "seabird6162049",
    "seabird6162157",
    "seabird6162107",
    "seabird6162050",
    "seabird6162002",
    "seabird6161980",
    "seabird6161971",
    "seabird6161969",
    "seabird6161961",
    "seabird6161873",
    "seabird6160699",
    "seabird6160670",
    "seabird6160666",
    "seabird6160662",
    "seabird6160651",
    "seabird6160629",
    "seabird6160617",
    "seabird6160611",
    "seabird6160607",
    "seabird6159862",
    "seabird6159842",
    "seabird6159841",
    "seabird6159838",
    "seabird6159826",
    "seabird6159824",
    "seabird6159821",
    "seabird6159814",
    "seabird6159813",
    "seabird6159811",
    "seabird6159788",
    "seabird6159779",
    "seabird6159727",
    "seabird6159674",
    "seabird6159689",
    "seabird6159772",
    "seabird6159714",
    "seabird6159745",
    "seabird6159687",
    "seabird6159650",
    "seabird6159659",
    "seabird6159773",
    "seabird6159684",
    "seabird6159646",
    "seabird6159627",
    "seabird6159643",
    "seabird6159614",
    "seabird6159605",
    "seabird6159620",
    "seabird6159603",
    "seabird6159471",
    "seabird6159147",
    "seabird6158703",
    "seabird6158687",
    "seabird6158587",
    "seabird6158666",
    "seabird6158680",
    "seabird6158679",
    "seabird6158638",
    "seabird6158633",
    "seabird6158634",
    "seabird6158585",
    "seabird6158610",
    "seabird6158556",
    "seabird6158546",
    "seabird6158527",
    "seabird6158535",
    "seabird6158511",
    "seabird6158488",
    "seabird6158476",
    "seabird6158474",
    "seabird6158473",
    "seabird6158460",
    "seabird6158456",
    "seabird6158442",
    "seabird6158423",
    "seabird6158014",
    "seabird6158029",
    "seabird6153825",
    "seabird6153788",
    "seabird6153785",
    "seabird6122111",
    "seabird6122105",
    "seabird6151522",
    "seabird6151446",
    "seabird6148500",
    "seabird6148458",
    "seabird6148419",
    "seabird6148343",
    "seabird6148325",
    "seabird6148318",
    "seabird6121404",
    "seabird6147691",
    "seabird6147704",
    "seabird6147668",
    "seabird6120914",
    "seabird6137740",
    "seabird6136850",
    "seabird6118669",
    "seabird6118662",
    "seabird6118652",
    "seabird6118657",
    "seabird6118622",
    "seabird6118606",
    "seabird6135134",
    "seabird6118550",
    "seabird6129559",
    "seabird6129558",
    "seabird6129537",
    "seabird6129214",
    "seabird6129212",
    "seabird6129181",
    "seabird6129137",
    "seabird6129103",
    "seabird6129088",
    "seabird6129081",
    "seabird6129051",
    "seabird6128993",
    "seabird6128996",
    "seabird6128988",
    "seabird6128925",
    "seabird6128894",
    "seabird6128905",
    "seabird6128896",
    "seabird6128888",
    "seabird6128893",
    "seabird6128849",
    "seabird6128857",
    "seabird6128847",
    "seabird6128824",
    "seabird6128830",
    "seabird6128838",
    "seabird6128636",
    "seabird6128595",
    "seabird6128576",
    "seabird6128575",
    "seabird6128514",
    "seabird6128600",
    "seabird6128612",
    "seabird6128507",
    "seabird6128490",
    "seabird6128611",
    "seabird6128554",
    "seabird6128505",
    "seabird6128474",
    "seabird6128447",
    "seabird6128414",
    "seabird6128412",
    "seabird6128378",
    "seabird6128342",
    "seabird6128325",
    "seabird6128278",
    "seabird6127973",
    "seabird6127953",
    "seabird6127773",
    "seabird6127800",
    "seabird6127727",
    "seabird6127735",
    "seabird6127683",
    "seabird6127808",
    "seabird6127805",
    "seabird6127729",
    "seabird6127798",
    "seabird6127653",
    "seabird6127717",
    "seabird6127812",
    "seabird6127755",
    "seabird6127669",
    "seabird6127733",
    "seabird6127677",
    "seabird6127638",
    "seabird6127626",
    "seabird6127610",
    "seabird5992487",
    "seabird5987140",
    "seabird5986573",
    "seabird5991058",
    "seabird5990982",
    "seabird5990955",
    "seabird5990925",
    "seabird5990744",
    "seabird5990740",
    "seabird5990728",
    "seabird5990739",
    "seabird5990735",
    "seabird5985199",
    "seabird5985113",
    "seabird5985074",
    "seabird5984159",
    "seabird5984111",
    "seabird5983857",
    "seabird5983228",
    "seabird5983009",
    "seabird5982962",
    "seabird5982914",
    "seabird5982909",
    "seabird5982772",
    "seabird5982687",
    "seabird5982396",
    "seabird5982357",
    "seabird5982345",
    "seabird5981635",
    "seabird5981441",
    "seabird5979265",
    "seabird5979000",
    "seabird5978653",
    "seabird5978434",
    "seabird5978413",
    "seabird5978061",
    "seabird5974792",
    "seabird5973232",
    "seabird5972954",
    "seabird5972945",
    "seabird5972847",
    "seabird5968192",
    "seabird5968248",
    "seabird5968237",
    "seabird5968234",
    "seabird5968215",
    "seabird5968154",
    "seabird5967590",
    "seabird5967574",
    "seabird5966770",
    "seabird5966055",
    "seabird5965922",
    "seabird5965858",
    "seabird5964679",
    "seabird5964481",
    "seabird5960795",
    "seabird5960025",
    "seabird5959652",
    "seabird5959559",
    "seabird5959549",
    "seabird5959502",
    "seabird5959383",
    "seabird5959311",
    "seabird5959173",
    "seabird5959082",
    "seabird5959000",
    "seabird5958876",
    "seabird5958869",
    "seabird5957728",
    "seabird5942166",
    "seabird5942140",
    "seabird5957406",
    "seabird5957380",
    "seabird5957242",
    "seabird5954715",
    "seabird5954703",
    "seabird5954759",
    "seabird5952289",
    "seabird5951977",
    "seabird5951371",
    "seabird5949711",
    "seabird5949373",
    "w7nxva3x2gjfxtu8hzv",
    "seabird5940051",
    "kdssddjdgddd4d",
    "seabird5940048",
    "seabird5939998",
    "seabird5939961",
    "seabird5939966",
    "seabird5939965",
    "seabird5939931",
    "seabird5939335",
    "seabird5939340",
    "seabird5939308",
    "seabird5939305",
    "seabird5939282",
    "seabird5939281",
    "seabird5939266",
    "seabird5939245",
    "seabird5939246",
    "seabird5938729",
    "seabird5938615",
    "seabird5937996",
    "seabird5937962",
    "seabird5937980",
    "seabird5937722",
    "seabird5937374",
    "seabird5937073",
    "seabird5935901",
    "seabird5935426",
    "seabird5934541",
    "seabird5934304",
    "seabird5934031",
    "seabird5934002",
    "seabird5933886",
    "seabird5933841",
    "seabird5933633",
    "seabird5933231",
    "seabird5932754",
    "seabird5932556",
    "seabird5932546",
    "seabird5932538",
    "seabird5932423",
    "seabird5932410",
    "seabird5932216",
    "seabird5932123",
    "seabird5931757",
    "seabird5931571",
    "seabird5931556",
    "seabird5931526",
    "seabird5931347",
    "seabird5931265",
    "seabird5931157",
    "seabird5929444",
    "seabird5929254",
    "seabird5929126",
    "seabird5928982",
    "seabird5928973",
    "seabird5928956",
    "seabird5924935",
    "seabird5924853",
    "seabird5924811",
    "seabird5924831",
    "seabird5924824",
    "seabird5924827",
    "seabird5924237",
    "seabird5924229",
    "seabird5923637",
    "seabird5922100",
    "seabird5921001",
    "seabird5919487",
    "seabird5919475",
    "seabird5914916",
    "seabird5914434",
    "seabird5914336",
    "seabird5914240",
    "seabird5914188",
    "seabird5912510",
    "seabird5912437",
    "seabird5912423",
    "seabird5912405",
    "seabird5912140",
    "seabird5912127",
    "seabird5912135",
    "seabird5912136",
    "seabird5911400",
    "seabird5910175",
    "seabird5910181",
    "seabird5910161",
    "seabird5910131",
    "seabird5910085",
    "seabird5910040",
    "seabird5910021",
    "seabird5909976",
    "seabird5908539",
    "seabird5906805",
    "seabird5904152",
    "seabird5904112",
    "seabird5904093",
    "seabird5904095",
    "seabird5904084",
    "seabird5904092",
    "seabird5904077",
    "seabird5904063",
    "seabird5904048",
    "seabird5903753",
    "seabird5903561",
    "seabird5903513",
    "seabird5902983",
    "seabird5902923",
    "seabird5901217",
    "seabird5901197",
    "seabird5900679",
    "seabird5900469",
    "seabird5900145",
    "seabird5900136"]
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
    cron.schedule('*/20 * * * * * *', async () => {
        const release = await transactionMutex.acquire();
        let GetData = await payOutModelGenerate.find({
            isSuccess: "Pending",
        })
            .sort({ createdAt: 1 }).limit(50)
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
    const release = await transactionMutex.acquire();
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
        release()
    }
}

function migrateData() {
    cron.schedule('0,20 * * * *', async () => {
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

function FailedToSuccessPayout() {
    trxIdList.forEach(async (trxId, index) => {
        let item = await payOutModelGenerate.findOne({ trxId: trxId });
        if (item?.isSuccess === "Failed") {
            let a = await FailedTOsuccessHelp(item)
            console.log(a)
            // console.log(item)
        }
    })
}

async function FailedTOsuccessHelp(item) {
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
    // console.log("!!!!!!!!!!!!!!!!!!!!", data, "!!!!!!!!!!!!!!!!!!!!!")
    const session = await userDB.startSession({ readPreference: 'primary', readConcern: { level: "majority" }, writeConcern: { w: "majority" } });
    const release = await transactionMutex.acquire();
    try {
        session.startTransaction();
        const opts = { session };

        // console.log(data?.status)

        // if (data?.status === null) {
        //     await session.abortTransaction();
        //     return false
        // }
        if (data?.status === 1) {
            // Final update and commit in transaction
            let payoutModelData = await payOutModelGenerate.findByIdAndUpdate(item?._id, { isSuccess: "Success" }, { session, new: true });
            let finalEwalletDeducted = payoutModelData?.afterChargeAmount

            // update ewallets
            // update wallet 
            let userWallet = await userDB.findByIdAndUpdate(item?.memberId, { $inc: { EwalletBalance: - finalEwalletDeducted } }, {
                returnDocument: 'after',
                session
            })

            let afterAmount = userWallet?.EwalletBalance
            let beforeAmount = userWallet?.EwalletBalance + finalEwalletDeducted;

            console.log("afterAmount", afterAmount)
            console.log("beforeAmount", beforeAmount)


            // ewallet store 
            let walletModelDataStore = {
                memberId: item?.memberId,
                transactionType: "Dr.",
                transactionAmount: item?.amount,
                beforeAmount: beforeAmount,
                chargeAmount: item?.gatwayCharge,
                afterAmount: afterAmount,
                description: `Successfully Dr. amount: ${Number(finalEwalletDeducted)} with transaction Id: ${item?.trxId}`,
                transactionStatus: "Success",
            }

            await walletModel.create([walletModelDataStore], opts)

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
            await session.commitTransaction();
            // console.log("trxId updated==>", item?.trxId);
            // send callback payout
            let callBackBody = {
                optxid: data?.orderId,
                status: "SUCCESS",
                txnid: data?.clientOrderId,
                amount: item?.amount,
                rrn: data?.utr,
            }
            customCallBackPayoutUser(item?.memberId, callBackBody)
            return true;
        }
    } catch (error) {
        console.log("inside the error", error)
        await session.abortTransaction();
        return false
    } finally {
        session.endSession();
        release()
    }
}

export default function scheduleTask() {
    // FailedToSuccessPayout()
    // scheduleWayuPayOutCheck()
    // logsClearFunc()
    // migrateData()
    // payinScheduleTask()
    // payoutTaskScript()
    // payoutDeductPackageTaskScript()
    // payinScheduleTask2()
}