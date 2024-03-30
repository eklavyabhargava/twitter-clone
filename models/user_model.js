const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    emailId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePic: {
      type: String,
      default:
        "https://firebasestorage.googleapis.com/v0/b/twitter-clone-webapp-dev.appspot.com/o/public%2Fuser.png?alt=media&token=3d29f923-8b10-45a2-ae90-7ab5d51295b3",
    },
    location: { type: String },
    dob: { type: Date },
    followers: [{ type: ObjectId, ref: "User" }],
    followings: [{ type: ObjectId, ref: "User" }],
  },

  { timestamps: true }
);

mongoose.model("User", userSchema);
