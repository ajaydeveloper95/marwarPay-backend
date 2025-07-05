import { Schema, model } from "mongoose";

const payInSchema = new Schema({
    memberId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Please Select Member Id !"]
    },
    payerName: {
        type: String,
    },
    trxId: {
        type: String,
        trim: true,
        index: true,
        unique:[true,"Trx Id should be Unique"],
        required: [true, "Required TrxId !"]
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
    vpaId: {
        type: String,
    },
    bankRRN: {
        type: String,
        required: [true, "Required bank RRN !"]
    },
    description: {
        type: String,
        required: [true, "Required Description !"]
    },
    trxInItDate: {
        type: String,
    },
    trxCompletionDate: {
        type: String,
    },
    isSuccess: {
        type: String,
        enum: ["Pending", "Failed", "Success"],
        required: [true, "Required Status Success or Failed !"]
    },
}, { timestamps: true });
// payInSchema.index({trxId:1}, {unique:true})
export default new model("payInRecode", payInSchema);