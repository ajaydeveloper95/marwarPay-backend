import { Schema, model } from "mongoose";

const payOutSchema = new Schema({
    memberId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Please Select Member id!"]
    },
    bankRRN: {
        type: String,
        required: [true, "Required RRN Number !"]
    },
    trxId: {
        type: String,
        trim: true,
        index: true,
        unique: true,
        required: [true, "Required Trx ID !"]
    },
    amount: {
        type: Number,
        required: [true, "Required Amount !"]
    },
    chargeAmount: {
        type: Number,
        required: [true, "Required payment gatway charge !"]
    },
    finalAmount: {
        type: Number,
        required: [true, "Required Credit amount !"]
    },
    optxId: {
        type: String,
        trim: true,
    },
    isSuccess: {
        type: String,
        enum: ["Pending", "Failed", "Success"],
    },
}, { timestamps: true });
payOutSchema.index({trxId:1}, { unique: true }) 
export default new model("payOutRecode", payOutSchema);