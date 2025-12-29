import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" })); // Increase JSON payload limit to 10 MB
app.use(express.urlencoded({ limit: "10mb", extended: true })); // Increase URL-encoded payload limit

app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true,
  })
);

// Health check endpoint for quick reachability tests
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// Serve uploaded images (useful in development or when Cloudinary isn't configured)
// Ensure path points to backend/public/uploads (no parent directory) so files saved locally are served correctly.
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});


