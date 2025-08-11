import { Schema, model } from "mongoose";

const oldEwalletSchema = new Schema({
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
    beforeAmount: {
        type: Number,
        required: [true, "Required Before transaction amount !"]
    },
    chargeAmount: {
        type: Number,
        required: [true, "Required charge amount !"]
    },
    afterAmount: {
        type: Number,
        required: [true, "Required After transaction amount !"]
    },
    migratedAt: { type: Date, default: Date.now },
    description: {
        type: String,
        required: [true, "Required transaction description !"]
    },
    transactionStatus: {
        type: String,
        enum: ["Pending", "Failed", "Success"],
        default: "Pending"
    },
    createdAt: {
        type: Date,
        required: [true, "createdAt date required"]
    },
    updatedAt: {
        type: Date,
        required: [true, "updateAt date required"]
    }
}, { timestamps: { createdAt: 'CreatedAtMigrate', updatedAt: 'UpdatedAtMigrate' } });

export default new model("oldEwallet", oldEwalletSchema);