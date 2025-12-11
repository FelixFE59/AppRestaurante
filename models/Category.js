const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Ej: "Hamburguesas"
  description: String, // Opcional
  icon: String, // Ej: "🍔" o nombre de icono
  order: Number, // Para ordenar las categorías
});

module.exports = mongoose.model("Category", categorySchema);
