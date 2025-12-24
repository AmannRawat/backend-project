import asynchandler from "../utils/asyncHandler";

const registerUser = asynchandler(
    async(req,res) => {
        res.status(200).json(message="ok");

    }
);

export default registerUser;