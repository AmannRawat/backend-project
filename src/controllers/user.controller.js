import asynchandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something Went Wrong While Genrating Refresh and Access Tokens")
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
const registerUser = asynchandler(async (req, res) => {
    // getting User data
    const { fullName, email, userName, password } = req.body
    console.log("NAME:", fullName);

    // This Validation part is tough to understand
    if (
        [fullName, userName, email, password].some((field) => field?.trim() === "")
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
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    // Creating User Object
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        converImage: coverImage?.url || "",  //Safety measure
        email,
        password,
        userName: userName.toLowerCase()
    })

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

const loginUser = asynchandler(async (req, res) => {
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

const logoutUser = asynchandler(async (req, res) => {
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

const refreshAccessToken = asynchandler(async (req, res) => {
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
     const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
 
     return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
             new ApiResponse(
                 200,
                 {accessToken,refreshToken: newRefreshToken},
                 "Access Token Refreshed"
             )
         )
   } catch (error) {
     throw new ApiError(401,error?message || "Invalid refresh token")
   }
});

export { registerUser, loginUser, logoutUser ,refreshAccessToken};