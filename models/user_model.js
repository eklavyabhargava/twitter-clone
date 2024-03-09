const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    emailId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: "user.png" },
    location: { type: String },
    dob: { type: Date },
    followers: [{ type: ObjectId, ref: "User" }],
    followings: [{ type: ObjectId, ref: "User" }],
  },

  { timestamps: true }
);

mongoose.model("User", userSchema);
