import { Queue } from "bullmq";

const eWalletQueueManager = new Queue("ewallet-queue", {
    connection: {
        host: "127.0.0.1",
        port: "6379"
    }
});

export async function eWalletProducer(email, amount) {
    const Job = await eWalletQueueManager.add("eWalletFund", { email, amount })
    console.log("job added to queue id:", Job?.id)
    console.log(Job)
}

export async function eWalletProducerStatus() {
    const waitingJobs = await eWalletQueueManager.getJobs(["waiting", "active", "completed", "failed"]);
    // console.log("Jobs in different states:", waitingJobs);
}