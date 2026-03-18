import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//Implementing like controller functions
/*
Algorithm
Step 1: Extract required data
Step 2: Validate input
Step 3: Check if like already exists
        Case 1: Like exists
        User already liked → so UNLIKE
        Delete that like document
        Return response: "Video unliked"
        Case 2: Like does NOT exist
        User hasn’t liked → so LIKE
        Create new Like document:
        video: videoId
        likedBy: userId
        Return response: "Video liked"
Step 4: Send response
*/
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    // Checks if video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    });
    let isLiked;

    // Toggle logic
    if (existingLike) {
        // UNLIKE
        await Like.findByIdAndDelete(existingLike._id);
        isLiked = false;
    } else {
        // LIKE
        await Like.create({
            video: videoId,
            likedBy: userId
        });
        isLiked = true;
    }

    // Send response
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isLiked
            },
            isLiked ? "Video liked successfully" : "Video unliked successfully"
        )
    );
})

/* Algorithm
1:
*/
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}