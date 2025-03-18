import { Schema, model } from "mongoose";

const FundAddedSchema = new Schema({
    memberId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Please Select Member Id !"]
    },
    transactionType: {
        type: String,
        enum: ["Dr.", "Cr."],
        required: [true, "Required Type of Transaction Dr. or Cr.!"]
    },
    transactionAmount: {
        type: Number,
        required: [true, "Required transaction amount !"]
    },
    payeeName: {
        type: String,
        required: [true, "Required transaction payeeName !"]
    },
    payeeAccountNumber: {
        type: String,
        required: [true, "Required transaction payeeAccountNumber !"]
    },
    payeeIFSC: {
        type: String,
        required: [true, "Required transaction payeeIFSC !"]
    },
    payeeBankName: {
        type: String,
        required: [true, "Required transaction payeeBankName !"]
    },
    paymentMode: {
        type: String,
        enum: ["IMPS", "RTGS", "NEFT"],
        required: [true, "Required transaction paymentMode !"]
    },
    bankRRN: {
        type: String,
        required: [true, "Required transaction bankRRN !"]
    },
    trxId: {
        type: String,
        index: true,
        unique: [true, "Trx Id should be Unique"],
        required: [true, "Required transaction id !"]
    },
    paymentDateTime: {
        type: Date,
        required: [true, "Required transaction date time !"]
    },
    description: {
        type: String,
        required: [true, "Required transaction description !"]
    },
    isSuccess: {
        type: String,
        enum: ["Pending", "Failed", "Success"],
        default: "Pending"
    },
}, { timestamps: true });

export default new model("fundAdded", FundAddedSchema);