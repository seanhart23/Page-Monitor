import mongoose from "mongoose";
import { Monitor } from "../models/monitor.js";

export async function connectDatabase() {
  const connection = await mongoose.connect(process.env.MONGODB_URI);

  console.log("MongoDB connected:", {
    environment: process.env.NODE_ENV,
    database: connection.connection.name
  });
}