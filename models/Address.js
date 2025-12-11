// models/Address.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // A quién pertenece esta dirección
    },
    label: {
      // Etiqueta: "Casa", "Trabajo", etc.
      type: String,
      required: true,
    },
    line1: {
      // Dirección principal
      type: String,
      required: true,
    },
    line2: String, // Detalle extra (opcional)
    city: String, // Ciudad / Cantón
    province: String, // Provincia
    reference: String, // Referencia: "Portón negro...", etc.
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Address", addressSchema);
