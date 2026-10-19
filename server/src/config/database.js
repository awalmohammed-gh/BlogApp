import mongoose from "mongoose";
import env from "./env.js";

let isConnected = false;

export const connectDatabase = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 10000,
      maxPoolSize:20,
      minPoolSize:2,
      maxIdleTimeMS:60000,
      waitQueueTimeoutMS:5000,
      socketTimeoutMS:30000
    });

    isConnected = true;
    console.log(`[Database] MongoDB connection established successfully (Host: ${conn.connection.host})`);

    mongoose.connection.on("error", (err) => {
      console.error("[Database] Runtime MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[Database] MongoDB connection disconnected.");
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.error("[Database] Failed to connect to MongoDB:", error.message);
    throw error;
  }
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("[Database] MongoDB disconnected cleanly.");
  }
};

export default connectDatabase;
