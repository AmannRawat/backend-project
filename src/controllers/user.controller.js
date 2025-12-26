import asynchandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
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

export default registerUser;