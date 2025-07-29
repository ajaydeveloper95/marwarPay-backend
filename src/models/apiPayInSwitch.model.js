import { Schema, model } from "mongoose";

const apiPayInSwitchSchema = new Schema({
    apiName: {
        type: String,
        required: [true, "Please Enter Api pay in Switch Name !"]
    },
    apiURL: {
        type: String,
        required: [true, "Please Enter Api pay in URL !"]
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

export default new model("payinswitch", apiPayInSwitchSchema);