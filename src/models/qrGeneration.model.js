import { Schema, model } from "mongoose";

const qrGenerationSchema = new Schema({
    memberId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Please Select Member Id !"]
    },
    trxId: {
        type: String,
        // trim: true,
        index: true,
        unique:[true,"Trx Id should be Unique"],
        required: [true, "Required TrxId !"]
    },
    refId: {
        type: String,
    },
    pannelUse: {
        type: String,
    },
    amount: {
        type: Number,
        required: [true, "Required Amount !"]
    },
    name: {
        type: String,
        required: [true, "Required Name !"]
    },
    ip: {
        type: String,
    },
    qrData: {
        type: String,
    },
    qrIntent: {
        type: String,
    },
    callBackStatus: {
        type: String,
        enum:["Pending","Failed","Success"],
        default: "Pending"
    },
}, { timestamps: true }); 
qrGenerationSchema.index({createdAt:1}, { unique: true }) 
qrGenerationSchema.index({trxId:1}, { unique: true }) 
export default new model("qrGenerationRecode", qrGenerationSchema);