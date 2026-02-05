import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    // throw new Error("JWT SECRET IS MISSING")
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found while generating tokens");
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        // throw new ApiError(500, "Something Went Wrong While Generating Refresh and Access Tokens")
        console.error("TOKEN ERROR 👉", error);
        throw new ApiError(500, error.message);
    }
}
/* ALGORITHM
    Steps to Register User
    1- Get User Details from frontend
    2- Validation (if data is correct eg: Not Empty)
    3- Check if user alredy Exist (email,username which are unique)
    4- Check for Images, Check for avatar
    5- Upload them to cloudinary
    6- Create user object -create entry in db
    7- Remove password and refresh token field from response
    8- Check for user creation
    9- Return response or error if failed

*/
const registerUser = asyncHandler(async (req, res) => {
    // getting User data
    const { fullName, email, userName, password } = req.body
    // console.log("NAME:", fullName);

    // This Validation part is tough to understand
    if (
        [fullName, userName, email, password].some(field => !field || String(field).trim() === "")
    ) {
        throw new ApiError(400, "All Fields are Required")
    }

    // Check user exists or not
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists with given username or email")
    }

    // Check for images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (Array.isArray(req.files?.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    // Upload to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;
    if (!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    // Creating User Object
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        avatarPublicId: avatar.public_id,
        coverImage: coverImage?.url || "", //Safety measure
        coverImagePublicId: coverImage?.public_id || "", //Safety measure
        email,
        password,
        userName: userName.toLowerCase()
    });


    // Removing Passaword etc

    // Fetching created user without password and refresh token 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    ) // this is a way to exclude fields

    // Check User Creation
    if (!createdUser) {
        throw new ApiError(500, "User Registration Failed...Something went wrong")
    }

    // Sending Response
    return res.status(201).json(new ApiResponse(
        200,
        "User Registered Successfully",
        createdUser
    ));
}
);

/* ALGORITHM
    Steps to Login User
    1- Get User Details from frontend req body
    2- Validate data username or email
    3- Check if user alredy Exist
    4- Check Password
    5- Access and refresh tokens generate
    6- Send tokens via Cookies 
    7- Return response or error if failed
*/

const loginUser = asyncHandler(async (req, res) => {
    // Get data
    // throw new Error("LOGIN CONTROLLER HIT");

    const { email, userName, password } = req.body;

    // Validate data if given
    if ((!userName && !email) || !password) {
        throw new ApiError(400, "Username/email and password are required");
    }

    // Finding User (await bcz database dusre desh me ho skta hai)
    const user = await User.findOne({
        $or: [{ userName }, { email }]
    });

    //If User Exists
    if (!user) {
        throw new ApiError(404, "User Does Not Exist")
    }

    // Mine methods exist in my instance of user not User of mongoose 
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // throw new ApiError(401, "I")
    // Access and refresh tokens generate
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken")

    const options = { // To secure Cookies to not get modified
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, "User Logged In Successfully",
                {
                    user: loggedInUser, accessToken, refreshToken //risky to send in json (XSS attack)
                })
        );
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = { // To secure Cookies to not get modified
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out SuccessFully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorised Request")
    }


    try {
        const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decoded?._id)


        if (!user) {
            throw new ApiError(401, "Invalid refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired and used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);


        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Access Token Refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body;

    if (newPassword !== confPassword) {
        throw new ApiError(400, "Password not confirmed");
    }

    const userID = req.user?._id;
    const user = await User.findById(userID);
    const isPassCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPassCorrect) {
        throw new ApiError(400, "Invalid Old Password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Password Changed Successfully", {}));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, "current user fetched successfully", req.user));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "Fields are empty");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, "Account details updates Succsessfully", user));
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
        throw new ApiError(404, "User not found");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error While uploading on avatar");
    }

    if (existingUser.avatarPublicId) {
        await deleteFromCloudinary(existingUser.avatarPublicId);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
                avatarPublicId: avatar.public_id,
            }
        }, { new: true }
    ).select("-password");


    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar Updated Successfully")
        )
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
        throw new ApiError(404, "User not found");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(400, "Error While uploading on cover Image");
    }

    // delete old cover image
    if (existingUser.coverImagePublicId) {
        await deleteFromCloudinary(existingUser.coverImagePublicId);
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
                coverImagePublicId: coverImage.public_id,
            }
        }, { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image Updated Successfully")
        )
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params;

    if (userName?.trim() === "") {
        throw new ApiError(400, "Username is required");
    }

    // User.find({username}) 

    //OR
    const channel = await User.aggregate([
        { //$match → WHERE in SQL
            $match: { // Filtering Stage to match username 
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: { // Joining with subscriptions collection
                from: "subscriptions", //lower case and plural
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, {
            /* Explanation
            In MongoDB aggregation:
            Left side = the documents currently flowing in the pipeline
            Right side = the collection you $lookup from (subscriptions)
            $lookup is basically LEFT OUTER JOIN by default.
            */
            $lookup: { // Joining with subscriptions collection
                from: "subscriptions", //lower case and plural model
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        }, {
            $addFields: { // Adding new fields
                subscribersCount: {
                    $size: "$subscribers" //$ means field name
                },
                channelsSubsribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        }, { //$project → SELECT specific columns
            $project: {   //Projection is used to include or exclude fields from the result set. 1 for include and 0 for exclude
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                email: 1, //Why 1? why not 2 3 4 5? Bcz its a boolean value where 1 means include and 0 means exclude so if we want to include email we put 1 if we dont want to include email we put 0
                subscribersCount: 1,
                channelsSubsribedToCount: 1,
                isSubscribed: 1
            }
        }
    ]);
    // console.log("CHANNEL:", channel);
    if (!channel || channel.length === 0) {
        throw new ApiError(404, "Channel not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "Channel Profile Fetched Successfully")
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
};


//Issue I faced
// When working through postman i noticed with i changing code postman still runs older code so after figuring out find out that inpackage.json there was a issue with how index.js is placed adn shown there as in thsi project index.js is in src not root so i have to describe that path to main isnide package.json