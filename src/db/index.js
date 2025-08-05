import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectionDB = async () => {
    try {
        let connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`, {
            maxPoolSize: 10, // adjust for your workload
            serverSelectionTimeoutMS: 5000, // shorter fail fast
        });
        console.log(`\n MongoDB connected !! DB Host : ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("Some issue on Database connection !! Further action required !!")
    }
}

export default connectionDB;