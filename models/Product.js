// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Ej: "Hamburguesa Clásica"
  description: String,
  price: { type: Number, required: true }, // Precio
  imageUrl: String, // Más adelante será la foto subida
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  active: { type: Boolean, default: true }, // Para ocultar sin borrar
});

module.exports = mongoose.model("Product", productSchema);
