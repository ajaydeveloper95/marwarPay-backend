import { upiWalletQueue } from "../queue/queue.js";


export const upiWalletJobs = async (memberId, transactionAmount, txnID) => {
    const payinQueueData = await upiWalletQueue.add("upiWalletAdded", {
        memberId, transactionAmount, txnID
    }, {
        removeOnComplete: true,
        attempts: 3
    })

    // console.log(payinQueueData?.id)
    return "Success Added your Job"
}