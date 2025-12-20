require("dotenv").config({path:"./env"});
import {} from 'dotenv/config' ;
import express from "express";
import connectDB from "./db/index.js";

const app = express();

const startServer = async () => {
  await connectDB();
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
};

startServer();
