import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials : true,
}));

app.use(express.json({limit: '15kb'}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// Routed Import
import userRouter from "./routes/user.routes.js";
// Routes declaration
app.use("/api/v1/users",userRouter) //http://localhost:8000/api/v1/users/register

export {app};