import asynchandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

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
    const { fullName, email, username, password } = req.body
    console.log("NAME:", fullName);

    // This Validation part is tough to understand
    if (
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are Required")
    }

    // Check user exists or not
    const existedUser= User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists with given username or email")
    }

    // Check for images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
}
);

export default registerUser;