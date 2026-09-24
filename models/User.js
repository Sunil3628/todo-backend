const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: false,
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

module.exports = mongoose.model("User", userSchema);