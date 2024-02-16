const mongoose = require("mongoose");

const connectDb = async () => {
  const MONGODB_URL = process.env.MONGODB_URL;

  try {
    // connect to mongodb database
    await mongoose.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
