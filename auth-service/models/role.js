const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      enum: {
        values: ["candidate", "admin", "moderator", "psychologist"],
        message:
          "Role must be either candidate, admin, moderator or psychologist",
      },
    },
    permissions: [
      {
        type: String,
        enum: [
          "read:users",
          "write:users",
          "delete:users",
          "read:tests",
          "write:tests",
          "delete:tests",
          "read:results",
          "write:results",
          "read:statistics",
          "manage:all",
        ],
      },
    ],
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
