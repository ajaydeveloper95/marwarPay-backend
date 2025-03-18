import supportModel from "../../models/supportTicket.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getAllTicket = asyncHandler(async (req, res) => {
    let pack = await supportModel.aggregate([{ $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "TicketID": 1, "subject": 1, "relatedTo": 1, "message": 1, "isStatus": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }])
    if (pack.length === 0) {
        return res.status(400).json({message:"Failed",data:"No Ticket Avabile !"})
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const getSingleTicket = asyncHandler(async (req, res) => {
    let ticketId = req.params.ticketId;
    // let pack = await supportModel.find({ TicketID: ticketId })
    let pack = await supportModel.aggregate([{ $match: { TicketID: ticketId } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "TicketID": 1, "subject": 1, "relatedTo": 1, "message": 1, "isStatus": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }])
    if (pack.length === 0) {
        return res.status(400).json({message:"Failed",data:"No Ticket Avabile !"})
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const updateTicketStatus = asyncHandler(async (req, res) => {
    let ticketId = req.params.id;
    const { isStatus } = req.body;
    let pack = await supportModel.findByIdAndUpdate(ticketId, { isStatus: isStatus }, { new: true });
    if (pack.length === 0) {
        return res.status(400).json({message:"Failed",data:"No Ticket Avabile !"})
    }
    res.status(200).json(new ApiResponse(200, pack))
});

export const allPendingTicket = asyncHandler(async (req, res) => {
    let pack = await supportModel.aggregate([{ $match: { isStatus: "Pending" } }, { $lookup: { from: "users", localField: "memberId", foreignField: "_id", as: "userInfo" } }, {
        $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
        }
    }, { $project: { "_id": 1, "memberId": 1, "TicketID": 1, "subject": 1, "relatedTo": 1, "message": 1, "isStatus": 1, "createdAt": 1, "createdAt": 1, "userInfo._id": 1, "userInfo.userName": 1, "userInfo.memberId": 1 } }, { $sort: { createdAt: -1 } }]);
    if (pack.length === 0) {
        return res.status(400).json({message:"Failed",data:"No Ticket Avabile !"})
    }
    res.status(200).json(new ApiResponse(200, pack))
});