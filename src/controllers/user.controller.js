import asynchandler from "../utils/asyncHandler.js";

/* Steps to Register User
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
const registerUser = asynchandler(
);

export default registerUser;