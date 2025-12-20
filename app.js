const express = require("express");
const path = require("path");
const morgan = require("morgan");
const chalk = require("chalk");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const mongoose = require("mongoose");

const app = express();

const User = require("./models/User");
const bcrypt = require("bcrypt");
const Category = require("./models/Category");
const Product = require("./models/Product");
const Address = require("./models/Address");
const Order = require("./models/Order");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

const PORT = process.env.PORT || 3000;

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/app_restaurante_dev";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-123";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  res.locals.cart = req.session.cart;
  next();
});

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => console.error("Error conectando MongoDB:", err));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, username, email, phone, password } = req.body;

  try {
    const user = new User({ name, username, email, phone, password });
    await user.save();
    res.redirect("/login");
  } catch (err) {
    console.error("Error registrando usuario:", err);
    res.status(400).render("register", {
      error: "No se pudo crear el usuario. ¿Usuario o correo ya existe?",
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).render("login", {
        error: "Usuario o contraseña incorrectos",
      });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
    };

    res.redirect("/menu");
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).render("login", {
      error: "Error interno. Inténtalo más tarde.",
    });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

app.get("/seed", async (req, res) => {
  try {
    await Category.deleteMany({});
    await Product.deleteMany({});

    const categorias = await Category.insertMany([
      { name: "Hamburguesas", icon: "🍔", order: 1 },
      { name: "Bebidas", icon: "🥤", order: 2 },
      { name: "Postres", icon: "🍰", order: 3 },
    ]);

    const catHamb = categorias.find((c) => c.name === "Hamburguesas");
    const catBeb = categorias.find((c) => c.name === "Bebidas");
    const catPost = categorias.find((c) => c.name === "Postres");

    await Product.insertMany([
      {
        name: "Hamburguesa Clásica",
        description: "Carne, queso, lechuga, tomate y salsa especial.",
        price: 3500,
        imageUrl: "/imagenes/Hamburguesa clasica.webp",
        category: catHamb._id,
        extras: [
          { code: "queso_extra", label: "Queso extra", price: 500 },
          { code: "tocino", label: "Tocino", price: 700 },
          { code: "salsa_bbq", label: "Salsa BBQ extra", price: 300 },
        ],
      },
      {
        name: "Hamburguesa Doble Queso",
        description: "Doble carne y doble queso.",
        price: 4500,
        imageUrl: "/imagenes/Hamburguesa doble queso.avif",
        category: catHamb._id,
        extras: [
          { code: "tocino", label: "Tocino", price: 700 },
          { code: "pan_artesanal", label: "Pan artesanal", price: 600 },
        ],
      },
      {
        name: "Gaseosa 350ml",
        description: "Refresco frío.",
        price: 1200,
        imageUrl: "/imagenes/gaseosas.webp",
        category: catBeb._id,
        extras: [
          { code: "hielo_extra", label: "Hielo extra", price: 0 },
          { code: "sin_azucar", label: "Versión sin azúcar", price: 0 },
        ],
      },
      {
        name: "Helado de vainilla",
        description: "Con sirope de chocolate.",
        price: 1800,
        imageUrl: "/imagenes/helado_vainilla.webp",
        category: catPost._id,
        extras: [
          {
            code: "sirope_chocolate",
            label: "Sirope de chocolate extra",
            price: 300,
          },
          { code: "nueces", label: "Nueces", price: 400 },
        ],
      },
    ]);

    res.send("Seed completado. Categorías y productos creados.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en seed");
  }
});

app.get("/menu", requireLogin, async (req, res) => {
  try {
    const categories = await Category.find().sort("order");
    const selectedCategory = req.query.category || null;

    let filter = { active: true };
    if (selectedCategory) {
      filter.category = selectedCategory;
    }

    const products = await Product.find(filter).populate("category");

    res.render("menu", {
      categories,
      products,
      selectedCategory,
    });
  } catch (err) {
    console.error("Error cargando menú:", err);
    res.status(500).send("Error cargando menú");
  }
});

app.get("/producto/:id", requireLogin, async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.status(404).send("Producto no encontrado");
    }

    res.render("producto_detalle", { product });
  } catch (err) {
    console.error("Error cargando detalle del producto", err);
    res.status(500).send("Error cargando el detalle del producto");
  }
});

app.get("/direcciones", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const direcciones = await Address.find({ user: userId }).sort({
      createdAt: -1,
    });

    res.render("direcciones", { direcciones });
  } catch (err) {
    console.error("Error cargando las direcciones", err);
    res.status(500).send("Error cargando las direcciones del usuario");
  }
});

app.post("/direcciones", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { label, line1, line2, city, province, reference } = req.body;

    await Address.create({
      user: userId,
      label,
      line1,
      line2,
      city,
      province,
      reference,
    });

    res.redirect("/direcciones");
  } catch (err) {
    console.error("Error guardando dirección:", err);
    res.status(500).send("Error guardando dirección");
  }
});

app.post("/direcciones/:id/eliminar", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;

    await Address.deleteOne({ _id: addressId, user: userId });

    res.redirect("/direcciones");
  } catch (err) {
    console.error("Error eliminando dirección:", err);
    res.status(500).send("Error eliminando dirección");
  }
});

app.post("/carrito/agregar/:id", requireLogin, async (req, res) => {
  try {
    const productId = req.params.id;
    const qty = parseInt(req.body.qty || "1", 10);

    let extras = req.body.extras || [];
    if (!Array.isArray(extras)) {
      extras = extras ? [extras] : [];
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Producto no encontrado");
    }

    // ¿Ya está en el carrito?
    const existing = req.session.cart.find(
      (item) => item.productId === productId
    );

    if (existing) {
      existing.qty += qty;
    } else {
      req.session.cart.push({
        productId,
        name: product.name,
        price: product.price,
        qty,
        extras,
      });
    }

    res.redirect("/carrito");
  } catch (err) {
    console.error("Error agregando al carrito:", err);
    res.status(500).send("Error agregando al carrito");
  }
});

app.get("/carrito", requireLogin, (req, res) => {
  const carrito = req.session.cart || [];
  let total = 0;
  carrito.forEach((item) => {
    total += item.price * item.qty;
  });

  res.render("carrito", { carrito, total });
});

app.post("/carrito/eliminar/:id", requireLogin, (req, res) => {
  const productId = req.params.id;
  req.session.cart = (req.session.cart || []).filter(
    (item) => item.productId !== productId
  );
  res.redirect("/carrito");
});

app.post("/carrito/vaciar", requireLogin, (req, res) => {
  req.session.cart = [];
  res.redirect("/carrito");
});

app.get("/pedido/confirmar", requireLogin, async (req, res) => {
  const carrito = req.session.cart || [];
  if (carrito.length === 0) {
    return res.redirect("/carrito");
  }

  const userId = req.session.user.id;
  const direcciones = await Address.find({ user: userId }).sort({
    createdAt: -1,
  });

  if (direcciones.length === 0) {
    return res.redirect("/direcciones");
  }

  let total = 0;
  carrito.forEach((item) => {
    total += item.price * item.qty;
  });

  res.render("pedido_confirmar", { carrito, direcciones, total });
});

app.post("/pedido/confirmar", requireLogin, async (req, res) => {
  try {
    const carrito = req.session.cart || [];
    if (carrito.length === 0) {
      return res.redirect("/carrito");
    }

    const userId = req.session.user.id;
    const { addressId } = req.body;

    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) {
      return res.status(400).send("Dirección inválida");
    }

    let total = 0;
    carrito.forEach((item) => {
      total += item.price * item.qty;
    });

    const order = await Order.create({
      user: userId,
      address: address._id,
      items: carrito.map((item) => ({
        product: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
      })),
      total,
      status: "pendiente",
    });

    req.session.cart = [];

    res.redirect("/perfil");
  } catch (err) {
    console.error("Error creando pedido:", err);
    res.status(500).send("Error creando pedido");
  }
});

app.get("/perfil", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const user = await User.findById(userId);

    const direcciones = await Address.find({ user: userId });

    const pedidos = await Order.find({ user: userId })
      .populate("address")
      .sort({ createdAt: -1 });

    res.render("perfil", { user, direcciones, pedidos });
  } catch (err) {
    console.error("Error cargando perfil:", err);
    res.status(500).send("Error cargando perfil");
  }
});

app.get("/contacto", (req, res) => {
  res.render("contacto");
});

app.listen(PORT, () => {
  console.log(chalk.bgHex("#ff69b4").white.bold(" EXPRESS SERVER STARTED "));
  console.log(
    chalk.green("Running at: ") + chalk.cyan("http://localhost:3000")
  );
  console.log(chalk.gray("Press Ctrl+C to stop the server."));
});
