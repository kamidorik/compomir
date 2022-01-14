const mongoose = require("mongoose");

mongoose.connect('mongodb://mongodb:27017/el_shop',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Order = mongoose.model(
  "Order",
  new mongoose.Schema({
    user_id: String,
    confirm_code: String,
    status: Number,
    timestamp: Number
  })
);

module.exports = Order;
