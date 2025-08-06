import { upiWalletQueue } from "../queue/queue.js";


export const upiWalletJobs = async (memberId, transactionAmount, txnID) => {
    const payinQueueData = await upiWalletQueue.add("upiWalletAdded", {
        memberId, transactionAmount, txnID
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000 // 5 seconds
        },
        removeOnComplete: true
    })

    // console.log(payinQueueData?.id)
    return "Success Added your Job"
}