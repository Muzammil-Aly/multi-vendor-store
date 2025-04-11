import connectDB from "./db/index.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";

dotenv.config({
  path: "/.env",
});

const app = express();

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Error in connecting database", error);
      throw error;
    });

    app.get("/", (req, res) => {
      res.send("Server is running!");
    });
    app.listen(process.env.PORT || 8001, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("Mongo db connection failed", error);
  });
