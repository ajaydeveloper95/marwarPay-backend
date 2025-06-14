import { model } from "mongoose";
import { Schema } from "mongoose";

const BeneficiaryList = new Schema({
    accountNo: {
        type: String,
        required: true
    },
    ifsc: {
        type: String,
        required: true
    },
    bankName: {
        type: String,
        required: true
    },
    beneficiaryId: {
        type: String,
        required: true
    },
    usedPanel: {
        type: String,
        required: true
    }
}, { timestamps: true, versionKey: false })

export default new model("beneficiaryList", BeneficiaryList);