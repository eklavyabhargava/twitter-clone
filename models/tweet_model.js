const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const tweetSchema = new mongoose.Schema({
    content: { type: String, required: true },
    tweetedBy: { type: ObjectId, ref: "User" },
    likes: [{ type: ObjectId, ref: "User" }],
    retweetBy: [{ type: ObjectId, ref: "User" }],
    image: { type: String },
    replies: [{ type: ObjectId, ref: "Tweet" }],
},

{ timestamps: true }
);

mongoose.model('Tweet', tweetSchema);