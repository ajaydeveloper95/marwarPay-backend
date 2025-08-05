import dotenv from "dotenv";
import connectionDB from "./db/index.js";
import cluster from "node:cluster"
import os from "os"
import "./queue/worker.js"
import { connection } from "./queue/queue.js"
const numCpu = os.cpus().length;
import app from "./app.js";


dotenv.config({
  path: "./env",
});


process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("uncaughtException Accured ! Shutting Down Server !");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("unhandledRejection Accured ! Shutting Down Server !");
  process.exit(1);
});

if (cluster.isPrimary) {
  for (let num = 0; num < 4; num++) {
    cluster.fork()
  }
} else {
  // connect
  connectionDB().then(async () => {

    // redis server
    let connectionStatus = await connection.ping();
    if (connectionStatus === "PONG") {
      console.log("Redis connected successfully");

      app.listen(process.env.SERVER_PORT, () => {
        console.log(`Server Running At PORT:${process.env.SERVER_PORT}`);
      })
    } else {
      console.error("Failed to connect to Redis:", redisError.message);
      throw new Error("failed to Redis database or down server!!")
    }
  }).catch((error) => {
    console.log("some issue on database connection", error)
  })
}

// // connect
// connectionDB().then(async () => {

//   // redis server
//   let connectionStatus = await connection.ping();
//   if (connectionStatus === "PONG") {
//     console.log("Redis connected successfully");

//   app.listen(process.env.SERVER_PORT, () => {
//     console.log(`Server Running At PORT:${process.env.SERVER_PORT}`);
//   })
//   } else {
//     console.error("Failed to connect to Redis:", redisError.message);
//     throw new Error("failed to Redis database !!")
//   }
// }).catch((error) => {
//   console.log("some issue on database connection", error)
// })