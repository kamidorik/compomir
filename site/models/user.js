const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/el_shop',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const User = new Schema({
    email: String,
    username: String,
    password: String,
    role: Number
  });

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);