import { Schema, model } from "mongoose";

const payOutSchemaGen = new Schema({
    memberId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Please Select Member id!"]
    },
    mobileNumber: {
        type: String,
        required: [true, "Required Mobile numer !"]
    },
    accountHolderName: {
        type: String,
        required: [true, "Required Account Holder Name !"]
    },
    accountNumber: {
        type: String,
        required: [true, "Required Account Number !"]
    },
    ifscCode: {
        type: String,
        required: [true, "Required IFSC Code!"]
    },
    amount: {
        type: Number,
        required: [true, "Required Amount !"]
    },
    pannelUse: {
        type: String,
    },
    gatwayCharge: {
        type: Number,
        required: [true, "Required getway chage amount !"]
    },
    afterChargeAmount: {
        type: Number,
        required: [true, "Required Amount !"]
    },
    trxId: {
        type: String,
        trim: true,
        unique: true,
        index: true,
        required: [true, "Required Trx ID !"]
    },
    isSuccess: {
        type: String,
        enum: ["Pending", "Failed", "Success"],
        default: "Pending",
    },
}, { timestamps: true });

payOutSchemaGen.index({createdAt:1}) 
payOutSchemaGen.index({trxId:1}, { unique: true }) 

export default new model("payOutGenerated", payOutSchemaGen);