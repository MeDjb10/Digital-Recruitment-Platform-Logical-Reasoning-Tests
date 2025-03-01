const mongoose = require("mongoose");

// Update the enum array to include refresh tokens
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
      enum: ["reset", "verification", "refresh"],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
      default: function () {
        // Default expiration: 1 hour for regular tokens
        const expiryTime = 3600000; // 1 hour
        
        // For refresh tokens, use longer expiry (7 days)
        if (this.type === 'refresh') {
          return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        
        return new Date(Date.now() + expiryTime);
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
