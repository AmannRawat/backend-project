import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Comments } from "../models/comments.model.js"


/*Algorithm
Step 1: Get videoId from params
Step 2: Validate videoId
Step 3: Check video exists (optional but good)
Step 4: Fetch comments
filter: video = videoId
sort: newest first (createdAt: -1)
Step 5: Populate owner (VERY IMPORTANT)
👉 So frontend gets:
username
avatar
Step 6: (Optional but strong) Pagination
👉 limit + page
Step 7: Send response
*/
const getVideoComments = asyncHandler(async (req, res) => {
    
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoID Invalid")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video does not exist")
    }

    //BREAKS WHEN 10000 Cmments
    // const comments = await Comments.find({ video: videoId })
    //     .populate("owner", "userName avatar") // only needed fields
    //     .sort({ createdAt: -1 }); // newest first
    //SO
    const comments = await Comments.find({ video: videoId })
        .populate("owner", "userName avatar")  // only needed fields
        .sort({ createdAt: -1 }) // newest first (DESCENDING ORDER)
        .skip((page - 1) * limit)
        .limit(Number(limit));
    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "Comments fetched successfully"
        )
    );
})

/*
Algorithm
1: required Data 
2: Validate Data
3: Video Ecist or not
4: Create new doc for comment
5: Send response
*/
const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { videoId } = req.params;
    const userId = req.user?._id;

    // Validate content
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required");
    }

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Create comment
    const comment = await Comments.create({
        content,
        video: videoId,
        owner: userId
    });

    // Return response
    return res.status(201).json(
        new ApiResponse(
            201,
            comment,
            "Comment added successfully"
        )
    );
})

const updateComment = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required");
    }
    const userId = req.user?._id
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }

    const comment = await Comments.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== userId.toString()) {
        comment.content = content
        await comment.save()
    } else {
        throw new ApiError(403, "You are not allowed to update this comment");
    }

    return res.status(200).json(
        new ApiResponse(200, comment, "Comment updated successfully")
    );
})

const deleteComment = asyncHandler(async (req, res) => {
    const userID = req.user?._id
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }

    const comment = await Comments.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await Comments.findByIdAndDelete(commentId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    );
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}