const mongoose = require("mongoose");

mongoose.connect('mongodb://mongodb:27017/el_shop',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Product = mongoose.model(
  "Product",
  new mongoose.Schema({
    name: String,
    picture: String,
    price: Number,
    product_type: String,
    quantity: Number,
    hidden: Boolean,
    isActual: Boolean
  })
);

module.exports = Product;
