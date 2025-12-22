import express from "express";
import cors from "cors";
import cookieParser from "cokkie-parser";
const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials : true,
}));

app.use(express.json({limit: '15kb'}));

app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use(cookieParser());

export default app;