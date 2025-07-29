import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import onFinished from "on-finished";
import userRoutes from "./routes/adminPannelRoutes/user.routes.js";
import packageRoutes from "./routes/adminPannelRoutes/package.routes.js";
import payinRoutes from "./routes/adminPannelRoutes/payIn.routes.js";
import payOutRoutes from "./routes/adminPannelRoutes/payOut.routes.js";
import apiSwitchRoutes from "./routes/adminPannelRoutes/apiSwitch.routes.js";
import callBackRoutes from "./routes/adminPannelRoutes/callBack.routes.js";
import walletRoutes from "./routes/adminPannelRoutes/wallet.routes.js";
import utilityRoutes from "./routes/adminPannelRoutes/utility.routes.js";
import supportRoutes from "./routes/adminPannelRoutes/support.routes.js";
import fundAddRoutes from "./routes/adminPannelRoutes/fundAdd.routes.js";
import ipWhiteListRoutes from "./routes/adminPannelRoutes/ipwhitelist.routes.js";
import chargeBackRoutes from "./routes/adminPannelRoutes/chargeBack.routes.js";
import userHandleUser from "./routes/userPannelRoutes/userHandleUser.routes.js";
import payInUserPannel from "./routes/userPannelRoutes/payInUser.routes.js";
import payOutUserPannel from "./routes/userPannelRoutes/payOutUser.routes.js";
import walletUserPannel from "./routes/userPannelRoutes/walletUser.routes.js";
import supportUserPannel from "./routes/userPannelRoutes/supportPannel.routes.js";
import fundAddUserPannel from "./routes/userPannelRoutes/fundAddUser.routes.js";
import callBackUrl from "./routes/userPannelRoutes/callBackUser.routes.js";
import { errors } from "celebrate";
import { ApiError } from "./utils/ApiError.js";
import ErrorMiddleware from "./middlewares/ErrorMiddleware.js";
import scheduleTask from "./utils/scheduleTask.js";
import Log from "./models/Logs.model.js";

const app = express();

// Auto schedule tasks
scheduleTask();

// Set up Morgan to log POST requests with request and response details
morgan.token("custom", (req, res) => {
    return JSON.stringify({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode || 500,
        requestBody: req.body,
        responseBody: res.body,
        timestamp: new Date().toISOString(),
    });
});

// Only trust the first proxy (like NGINX)
app.set('trust proxy', "loopback");

app.use((req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send to capture the response body
    res.send = function (body) {
        res.body = body; // Store the response body in res.body
        return originalSend.call(this, body);
    };

    // Override res.json to capture JSON responses
    res.json = function (body) {
        res.body = body; // Store the response body in res.body
        return originalJson.call(this, body);
    };

    next();
});

const postRequestLogger = morgan(":custom", {
    stream: {
        write: async (message) => {
            try {
                const logEntry = JSON.parse(message);
                await Log.create(logEntry);
            } catch (error) {
                console.error("Failed to save log:", error);
            }
        },
    },
});

// Global logger for all POST requests
app.use((req, res, next) => {
    if (req.method === "POST") {
        postRequestLogger(req, res, next);
    } else {
        next();
    }
});

// Middleware for CORS
const corsOptions = {
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors());
// app.use(cors(corsOptions));

// Middleware for parsing requests
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));

// Admin panel routes
app.use("/apiAdmin/v1/user/", userRoutes);
app.use("/apiAdmin/v1/package/", packageRoutes);
app.use("/apiAdmin/v1/payin/", payinRoutes);
app.use("/apiAdmin/v1/payout/", payOutRoutes);
app.use("/apiAdmin/v1/apiswitch/", apiSwitchRoutes);
app.use("/apiAdmin/v1/callBack/", callBackRoutes);
app.use("/apiAdmin/v1/wallet/", walletRoutes);
app.use("/apiAdmin/v1/utility/", utilityRoutes);
app.use("/apiAdmin/v1/support/", supportRoutes);
app.use("/apiAdmin/v1/fundAdd/", fundAddRoutes);
app.use("/apiAdmin/v1/ipWhitelist/", ipWhiteListRoutes);
app.use("/apiAdmin/v1/chargeBack/", chargeBackRoutes);

// User panel routes
app.use("/apiUser/v1/userRoute/", userHandleUser);
app.use("/apiUser/v1/payin/", payInUserPannel);
app.use("/apiUser/v1/payout/", payOutUserPannel);
app.use("/apiUser/v1/wallet/", walletUserPannel);
app.use("/apiUser/v1/support/", supportUserPannel);
app.use("/apiUser/v1/fundAdd/", fundAddUserPannel);
app.use("/apiUser/v1/callBackUrl/", callBackUrl);

// Catch-all for undefined routes
app.all("*", (req, res, next) => {
    next(new ApiError(404, `Not Available Path ${req.baseUrl} !`));
});

// Error handling
app.use(errors());
app.use(ErrorMiddleware);

export default app;
