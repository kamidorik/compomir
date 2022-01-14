const mongoose = require("mongoose");

mongoose.connect('mongodb://mongodb:27017/el_shop',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Order_item = mongoose.model(
  "Order_item",
  new mongoose.Schema({
    user_id: String,
    product_id: String,
    order_id: String
  })
);

module.exports = Order_item;
