import { eWalletQueue } from "../queue/queue.js";


export const eWalletCrJobs = async (memberId, transactionAmount, chargeAmount, txnID) => {
    const ewalletQueueData = await eWalletQueue.add("eWalletAdded", {
        memberId, transactionType: "Cr.", transactionAmount, chargeAmount, txnID
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000 // 5 seconds
        },
        removeOnComplete: true
    })

    return "Success Added your Job in success"
}

export const eWalletDrJobs = async (memberId, transactionAmount, chargeAmount, txnID) => {
    const ewalletQueueData = await eWalletQueue.add("eWalletAdded", {
        memberId, transactionType: "Dr.", transactionAmount, chargeAmount, txnID
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000 // 5 seconds
        },
        removeOnComplete: true
    })

    return "Success Added your Job"
}