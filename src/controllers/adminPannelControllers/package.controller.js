import packageModel from "../../models/package.model.js";
import payOutPackageModel from "../../models/payOutCharge.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getPackage = asyncHandler(async (req, res) => {
    let pack = await packageModel.find();
    if (!pack) {
        return new ApiError(400, "No Package Avabile !")
    }
    res.status(200).json(new ApiResponse(200, pack))
})

export const getSinglePackage = asyncHandler(async (req, res) => {
    let query = req.params.id;
    let pack = await packageModel.findById(query);
    if (!pack) {
        return new ApiError(400, "No Package Avabile !")
    }
    res.status(200).json(new ApiResponse(200, pack))
})

export const addPackage = asyncHandler(async (req, res) => {
    let pack = await packageModel.create(req.body);
    res.status(201).json(new ApiResponse(201, pack))
})

export const updatePackage = asyncHandler(async (req, res) => {
    let query = req.params.id;
    let queryFind = await packageModel.findById(query)
    if (!queryFind) {
        return res.status(400).json(new ApiResponse(400, null, "Package Not Found !"))
    }
    let update = await packageModel.findByIdAndUpdate(query, { ...req.body })
    res.status(200).json(new ApiResponse(200, update))
})

export const deletePackage = asyncHandler(async (req, res) => {
    let query = req.params.id;
    let quaryFind = await packageModel.findByIdAndDelete(query)
    if (!quaryFind) {
        return res.status(400).json(new ApiError(400, "Package Not Found !"))
    }
    res.status(200).json(new ApiResponse(200, quaryFind))
})

export const getPayOutPackage = asyncHandler(async (req, res) => {
    let quaryFind = await payOutPackageModel.find()
    if (!quaryFind) {
        return res.status(400).json(new ApiError(400, "Package Not Found !"))
    }
    res.status(200).json(new ApiResponse(200, quaryFind))
})

export const getSinglePayOutPackage = asyncHandler(async (req, res) => {
    let query = req.params.id;
    let pack = await payOutPackageModel.findById(query);
    if (!pack) {
        return new ApiError(400, "No Package Avabile !")
    }
    res.status(200).json(new ApiResponse(200, pack))
})

export const addPayOutPackage = asyncHandler(async (req, res) => {
    let quaryFind = await payOutPackageModel.create(req.body)
    res.status(201).json(new ApiResponse(200, quaryFind))
})

export const updatePayOutPackage = asyncHandler(async (req, res) => {
    let packageId = req.params.id;
    const packUpdate = req.body;
    let quaryFind = await payOutPackageModel.findByIdAndUpdate(packageId, { ...packUpdate }, { new: true });
    res.status(200).json(new ApiResponse(200, quaryFind))
})