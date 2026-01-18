import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "") //header for mobile / API clients //bearer removed
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Unauthorized request");
        }

        req.user = user;   // 👈 attach logged-in user
        next();            // 👈 pass control
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Token");
    }
})