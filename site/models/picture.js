const mongoose = require("mongoose");

mongoose.connect('mongodb://mongodb:27017/el_shop',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Picture = mongoose.model(
  "Picture",
  new mongoose.Schema({
    filename: String,
    old_filename: String
  })
);

module.exports = Picture;
