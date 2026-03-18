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
1: Get requred data
2: Validate Data
3: Check if comment exist or not
3: Check if Like already exist on comment or not 
4: Perform task toggling accordingly
5: Send Response
*/
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment Id Invalid")
    }

    const comment = await Comments.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne(
        {
            comment: commentId,
            likedBy: userId
        }
    )
    let isLiked;
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        isLiked = false;
    } else {
        await Like.create({
            comment: commentId,
            likedBy: userId
        });
        isLiked = true;
    }

    return res.status(200).json(
        new ApiResponse(200, isLiked, isLiked ? "Comment Liked" : "Comment Unliked")
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Id not found")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet Not found")
    }

    const existingLike = await Like.findOne(
        {
            tweet: tweetId,
            likedBy: userId
        }
    )
    let isLiked;
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        isLiked = false;
    } else {
        await Like.create({
            tweet: tweetId,
            likedBy: userId
        })
        isLiked = true;
    }

    return res.status(200).json(
        new ApiResponse(200, isLiked, isLiked ? "Tweet Liked" : "Tweet Unliked")
    )
}
)
/*
 Algorithm
    1: Get required data
    2: Query Like collection
    3: Populate video details
    4: Extract only videos
    5: Send Reponse
*/
const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    // Find all likes for this user that have video
    const likedVideos = await Like.find({
        likedBy: userId,
        video: { $ne: null } // only video likes
    }).populate("video");

    // Extract only video objects
    const videos = likedVideos.map(like => like.video);

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Liked videos fetched successfully"
        )
    );
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}