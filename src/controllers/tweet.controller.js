import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user?._id;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content Is require")
    }

    if (content.length > 280) {
        throw new ApiError(400, "Tweet too long");
    }

    const tweet = await Tweet.create(
        {
            content: content,
            owner: userId,
        }
    )

    return res.status(201).json(
        new ApiResponse(201, tweet, "Tweet Created Successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {

})

const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { tweetId } = req.params;
    const userId = req.user?._id;

    // Validate content
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    if (content.length > 280) {
        throw new ApiError(400, "Tweet too long");
    }

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    // Find tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Check ownership
    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not allowed to update this tweet");
    }

    // Update
    tweet.content = content;
    await tweet.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            tweet,
            "Tweet updated successfully"
        )
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user?._id;

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    // Find tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Check ownership
    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not allowed to delete this tweet");
    }

    // Delete
    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        )
    );
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}