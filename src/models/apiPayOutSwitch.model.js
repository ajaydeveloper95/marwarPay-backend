import { Schema, model } from "mongoose";

const apiPayOutSwitchSchema = new Schema({
    apiName: {
        type: String,
        required: [true, "Please Enter Api pay out  Switch Name !"]
    },
    apiURL: {
        type: String,
        required: [true, "Please Enter Api pay out URL !"]
    },
    apiInfo: {
        type: String,
    },
    trxIdType: {
        type: String,
        enum: ["Num", "AlphaNum"],
        default: "AlphaNum"
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

export default new model("payoutswitch", apiPayOutSwitchSchema);