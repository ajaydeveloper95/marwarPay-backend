import { Schema, model } from "mongoose";

const oldQrGenerationSchema = new Schema({
    memberId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: [true, "Please Select Member Id !"]
    },
    trxId: {
        type: String,
        trim: true,
        index: true,
        unique: [true, "Trx Id should be Unique"],
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
    migratedAt: { type: Date, default: Date.now },
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
        enum: ["Pending", "Failed", "Success"],
        default: "Pending"
    },
}, { timestamps: true });
oldQrGenerationSchema.index({ createdAt: 1 })
oldQrGenerationSchema.index({ trxId: 1 })
export default new model("oldQrGenerationRecode", oldQrGenerationSchema);