
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, deleteUser, deleteMessage } from "../controllers/message.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, upload.single("file"), sendMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.delete("/users/:id", protectRoute, deleteUser);

export default router;