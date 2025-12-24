import asynchandler from "../utils/asyncHandler.js";

const registerUser = asynchandler(
    async (req, res) => {
        res.status(200).json({ message: "User Registered" });
    }
);

export default registerUser;