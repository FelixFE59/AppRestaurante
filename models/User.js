// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // para login
  password: { type: String, required: true }, // cifrada
  name: { type: String, required: true }, // nombre real
  email: { type: String, required: true, unique: true },
  phone: { type: String }, // opcional
});

// Igual que en tu proyecto: hasheamos la contraseña antes de guardar
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

module.exports = mongoose.model("User", userSchema);
