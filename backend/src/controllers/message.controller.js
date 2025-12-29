import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import DeletedUser from "../models/deletedUser.model.js";

import cloudinary from "../lib/cloudinary.js";
import streamifier from "streamifier";
import fs from "fs/promises";
import path from "path";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    
    const deletedUsers = await DeletedUser.find({ userId: loggedInUserId });
    const deletedUserIds = deletedUsers.map(du => du.deletedUserId.toString());

    const availableUsers = filteredUsers.filter(user => !deletedUserIds.includes(user._id.toString()));

    res.status(200).json(availableUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let fileObj = null;

    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    // Support multipart file uploads via multer (req.file)
    if (req.file) {
      const isImage = String(req.file.mimetype).startsWith("image/");

      if (cloudinaryConfigured) {
        const buffer = req.file.buffer;
        const uploadFromBuffer = (buffer) =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: isImage ? "chat_images" : "chat_files", resource_type: "auto" }, (error, result) => {
              if (result) resolve(result);
              else reject(error);
            });
            streamifier.createReadStream(buffer).pipe(stream);
          });

        const uploadResponse = await uploadFromBuffer(buffer);
        const url = uploadResponse.secure_url || uploadResponse.url;

        if (isImage) imageUrl = url;

        fileObj = {
          url,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        };
      } else {
        // Save to local uploads folder
        const ext = (req.file.mimetype || "application/octet-stream").split("/")[1]
          ? (req.file.mimetype || "application/octet-stream").split("/")[1].split("+")[0]
          : "bin";
        const fileName = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, req.file.buffer);
        const url = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;

        if (isImage) imageUrl = url;

        fileObj = {
          url,
          filename: req.file.originalname || fileName,
          mimeType: req.file.mimetype,
          size: req.file.size,
        };
      }
    } else if (image) {
      // legacy/base64 image support
      if (cloudinaryConfigured) {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } else {
        // Expect base64 data URL and save locally
        const matches = String(image).match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          const base64Data = matches[2];
          const ext = mime.split("/")[1];
          const fileName = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          await fs.mkdir(uploadsDir, { recursive: true });
          const filePath = path.join(uploadsDir, fileName);
          const buffer = Buffer.from(base64Data, "base64");
          await fs.writeFile(filePath, buffer);
          imageUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;

          fileObj = {
            url: imageUrl,
            filename: fileName,
            mimeType: mime,
            size: buffer.length,
          };
        } else {
          throw new Error("Invalid image data");
        }
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileObj,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const deleteUser = async (req, res) => {
  try {
    const { id: userToDeleteId } = req.params;
    const loggedInUserId = req.user._id;

    
    const newDeletedUser = new DeletedUser({
      userId: loggedInUserId,
      deletedUserId: userToDeleteId,
    });

    await newDeletedUser.save();

    res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    console.log("Error in deleteUser controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    // If file is stored locally in uploads, remove it
    if (message.file && message.file.url) {
      try {
        const fileUrl = message.file.url;
        const urlObj = new URL(fileUrl);
        const pathname = urlObj.pathname; // e.g. /uploads/filename
        if (pathname.startsWith("/uploads/")) {
          const fileName = pathname.split("/").pop();
          const filePath = path.join(process.cwd(), "public", "uploads", fileName);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch (e) {
        // ignore URL parsing or unlink errors
      }
    }

    await Message.deleteOne({ _id: messageId });

    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    const senderSocketId = getReceiverSocketId(message.senderId.toString());

    const payload = { messageId };

    if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", payload);
    if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", payload);

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};