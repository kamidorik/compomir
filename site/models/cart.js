const mongoose = require("mongoose");

mongoose.connect('mongodb://mongodb:27017/el_shop',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Cart = mongoose.model(
  "Cart",
  new mongoose.Schema({
    user_id: String,
    product_id: String
  })
);

module.exports = Cart;
