Reasoning - Tests / auth - service / models / token.js;
const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["reset", "verification"],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
      default: function () {
        // Default expiration: 1 hour from now
        return new Date(Date.now() + 3600000);
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index that automatically expires documents based on the expires field
tokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
