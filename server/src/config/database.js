import mongoose from "mongoose";
import env from "./env.js";

let cachedPromise = null;
let isConnected = false;

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      autoIndex: env.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      waitQueueTimeoutMS: 5000,
      socketTimeoutMS: 30000
    }).then((conn) => {
      isConnected = true;
      console.log(`[Database] MongoDB connection established successfully (Host: ${conn.connection.host}, Database: ${conn.connection.name})`);

      if (mongoose.connection.listenerCount("error") === 0) {
        mongoose.connection.on("error", (err) => {
          console.error("[Database] Runtime MongoDB connection error:", err.message);
        });
      }

      if (mongoose.connection.listenerCount("disconnected") === 0) {
        mongoose.connection.on("disconnected", () => {
          console.warn("[Database] MongoDB connection disconnected.");
          isConnected = false;
          cachedPromise = null;
        });
      }

      return conn;
    }).catch((error) => {
      cachedPromise = null;
      isConnected = false;
      console.error("[Database] Failed to connect to MongoDB:", error.message);
      throw error;
    });
  }

  return cachedPromise;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    cachedPromise = null;
    console.log("[Database] MongoDB disconnected cleanly.");
  }
};

export default connectDatabase;
