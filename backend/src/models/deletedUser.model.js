import mongoose from "mongoose";

const deletedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  deletedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const DeletedUser = mongoose.model("DeletedUser", deletedUserSchema);

export default DeletedUser;