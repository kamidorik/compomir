const express = require('express'); 
const bodyParser = require('body-parser');
const session = require('express-session'); 
const passport = require('passport'); 
const roles = require('./roles')
const connectEnsureLogin = require('connect-ensure-login');
const cors = require ('cors')
const bcrypt = require('bcrypt')
const multer = require('multer');
const catalog = require('./categories')
const hbs = require('express-handlebars');

const app = express()
const port = 3000

const User = require('./models/user');
const Product = require('./models/product.js')
const Cart = require('./models/cart.js')
const Configurator = require('./models/configurator.js')
const Picture = require('./models/picture.js')
const Order_item = require('./models/order_item.js')
const Order = require('./models/order.js')
app.use(cors())

app.use(session({
  secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 }
}));

app.use(express.static('static'));
app.use('/static', express.static(__dirname + '/static'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.engine('handlebars', hbs.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

const imageUpload = multer({
  dest: 'static/images',
});

app.get('/', async (req, res, next) => {
    let row = [[]] 
    let k = 0;
    let actual_list = await Product.find({"isActual": true});
    let parsed_list = actual_list.map(function(model) { return model.toObject(); });
    for (var i = 0; i < actual_list.length; i++) {
      let list_index = parsed_list[i]
      row[k].push(list_index)
      if (row[k].length >= 4) {row.push([]); k += 1; }
    }
    res.render('main_page', {layout: 'main', req, actual_list: row});
});

app.post('/signup', function(req, res, next) {
  console.log('registering user');
  User.register(new User({username: req.body.username, role: 0}), req.body.password, function(err) {
    if (err) {
      res.status(400).send({"err": "Некорректный ввод"})
      return next(err);
    }

    res.redirect('/');
  });
});


app.post('/create_product', async(req, res, next) => {
  if (req.user) {if (req.user.role == 2) {
    let hidden = "hidden" in req.body ? true : false;

    let isActual = "actual" in req.body ? true : false;
    await Product.create({name: req.body.name, price: req.body.price, hidden, quantity: req.body.quantity, picture: req.body.file, isActual, product_type: req.body.category})
    res.redirect('/admin/view_table/products');
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/add_cart/:product_id', async (req, res, next) => { 
  if (req.user) {
    let user = req.user.toObject();
    await Cart.create({user_id: user._id, product_id: req.params.product_id})
    res.redirect('/cart');
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/add_configurator/:product_id', async (req, res) => { 
  if (req.user) {
    let user = req.user.toObject();
    await Configurator.create({user_id: user._id, product_id: req.params.product_id})
    res.redirect('/configure');
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});



app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),  function(req, res) {
    res.redirect('/');
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/admin/stats', async (req, res, next) => {
  if (req.user) {if (req.user.role == 2) {
    let users_count = await User.count({})
    let products_count = await Product.count({})
    let orders_count = await Order.count({})
    let item_count = await Order_item.count({})
    res.render('stats', {layout: 'admin', users_count, products_count, orders_count, item_count});
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/new_product', function (req, res, next) {
  if (req.user) {if (req.user.role == 2) {
    let just_categories = []
    for (var i = 0; i < catalog.length; i++) {
      for (var j = 0; j < catalog[i]['children'].length; j++) {
        just_categories.push(catalog[i]['children'][j])
      }
    }
    res.render('new_product', {layout: 'admin', category: just_categories});
   } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/upload_picture', function (req, res, next) {
  if (req.user) {
    if (req.user.role == 2) {
      res.render('upload_picture', {layout: 'admin'}); 
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/upload_picture', imageUpload.single('image'), async (req, res) => { 
  if (req.user) {if (req.user.role == 2) {
    console.log(req.file);
    await Picture.create({filename: req.file.filename, old_filename: req.file.originalname})
    res.redirect('/admin/view_table/pictures');
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/update_product/:id', async (req, res, next) => {
  if (req.user) {
    if (req.user.role == 2) {
      let just_categories = []
      for (var i = 0; i < catalog.length; i++) {
        for (var j = 0; j < catalog[i]['children'].length; j++) {
          just_categories.push(catalog[i]['children'][j])
        }
      }
      let product = await Product.findOne({'_id': req.params.id});
      let parsed_prod = product.toObject();
      res.render('update_product', {layout: 'admin', product: parsed_prod, category: just_categories}); 
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/update_product/:id', async(req, res, next) => {
  if (req.user) {if (req.user.role == 2) {
    let hidden = "hidden" in req.body ? true : false;
    let isActual = "actual" in req.body ? true : false;
    let product = await Product.findOne({'_id': req.params.id})
    product.overwrite({name: req.body.name, price: req.body.price, hidden, quantity: req.body.quantity, picture: req.body.file, isActual, product_type: req.body.category});
    await product.save();
    res.redirect('/admin/view_table/products');
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/delete_product/:id', async(req, res, next) => {
  if (req.user) {if (req.user.role == 2) {
    await Product.deleteOne({'_id': req.params.id})
    await Cart.deleteMany({'product_id': req.params.id})
    await Configurator.deleteMany({'product_id': req.params.id})
    await Order_item.deleteMany({'product_id': req.params.id})
    res.redirect('/admin/view_table/products');
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/delete_configurator', async(req, res, next) => {
  if (req.user) {
    await Configurator.deleteMany({'user_id': req.user._id})
    res.redirect('/configure');
  } else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/delete_cart', async(req, res, next) => {
  if (req.user) {
    await Cart.deleteMany({'user_id': req.user._id})
    res.redirect('/cart');
  } else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

async function make_code(length) {
  var result           = '';
  var characters       = '0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}

app.get('/order/:id', async (req, res, next) => {
  if (req.user) {
    try {
      let full_price = 0;
      let order_plain = await Order.findOne({'_id': req.params.id});
      let order = order_plain.toObject()
      if (order['user_id'] != req.user._id) { res.render('not_found', {layout: 'main', req}); return; }
      let order_items_plain = await Order_item.find({'order_id': order['_id']});
      let order_items = order_items_plain.map(function(model) { return model.toObject(); });
      switch (order['status']) {
        case 0:
          order['status'] = "Готов к передаче"
          break
        case 1:
          order['status'] = "Доставлен"
          break
        case 2:
          order['status'] = "Отменен"
          break
        default:
          order['status'] = "Ошибка"
          break
      }
      for (var i = 0; i < order_items.length; i++) {
        let prod = await Product.findOne({'_id': order_items[i]['product_id']});
        order_items[i]['price'] = prod['price']
        full_price += prod['price'];
        order_items[i]['name'] = prod['name']
      }
      res.render('order', {layout: 'main', req, order, order_items, full_price})
    } catch (e) {
      console.log(e)
      res.render('not_found', {layout: 'main', req});
    }
  } else next(); 
}, function (req, res, next) {
    res.redirect('/');
});

app.get('/profile/orders', async (req, res, next) => {
  if (req.user) {
      let orders = await Order.find({'user_id': req.user._id});
      let parsed_orders = orders.map(function(model) { return model.toObject(); });
      for (var i = 0; i < parsed_orders.length; i++) {
        switch (parsed_orders[i]['status']) {
          case 0:
            parsed_orders[i]['status'] = "Готов к передаче"
            break
          case 1:
            parsed_orders[i]['status'] = "Доставлен"
            break
          case 2:
            parsed_orders[i]['status'] = "Отменен"
            break
          default:
            parsed_orders[i]['status'] = "Ошибка"
            break
        }
        var date = new Date(parsed_orders[i]['timestamp']);
        parsed_orders[i]['timestamp'] = date.toISOString().slice(0, 16).replace("T", " ");
      }
      res.render('profile_orders', {layout: 'main', elements: parsed_orders}); 
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/search', async (req, res, next) => {
  if (req.body.q) {
    let search_lis = await Product.find({ name:  { "$regex": req.body.q, "$options": "i" } });
    let category_name = "Поиск"
    let row = [[]] 
    let k = 0;
    let search_list = search_lis.map(function(model) { return model.toObject(); });
    console.log(search_list)
    for (var i = 0; i < search_list.length; i++) {
      let list_index = search_list[i]
      row[k].push(list_index)
      if (row[k].length >= 4) {row.push([]); k += 1; }
    }
    res.render('category_search', {layout: 'main', req, search_list: row, category_name});
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/open_order/:id', async (req, res, next) => {
  if (req.user) {
    if (req.user.role == 2) {
      let full_price = 0;
      let order_plain = await Order.findOne({'_id': req.params.id});
      let order = order_plain.toObject()
      let order_items_plain = await Order_item.find({'order_id': order['_id']});
      let order_items = order_items_plain.map(function(model) { return model.toObject(); });
      switch (order['status']) {
        case 0:
          order['status'] = "Готов к передаче"
          break
        case 1:
          order['status'] = "Доставлен"
          break
        case 2:
          order['status'] = "Отменен"
          break
        default:
          order['status'] = "Ошибка"
          break
      }
      for (var i = 0; i < order_items.length; i++) {
        let prod = await Product.findOne({'_id': order_items[i]['product_id']});
        order_items[i]['price'] = prod['price']
        full_price += prod['price'];
        order_items[i]['name'] = prod['name']
      }
      res.render('open_order', {layout: 'admin', req, order, order_items, full_price})
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/update_status/:id', async(req, res, next) => {
  if (req.user) {if (req.user.role == 2) {
    let ord = await Order.findOne({'_id': req.params.id})
    ord.status = req.body.status;
    await ord.save();
    res.redirect('/admin/view_table/orders');
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/create_order', async(req, res, next) => {
  if (req.user) {
    let cart = await Cart.find({'user_id': req.user._id});
    let code = await make_code(4);
    let order = await Order.create({'user_id': req.user._id, 'confirm_code': code, 'status': 0, 'timestamp': Date.now()})
    console.log(order)
    for (var i = 0; i < cart.length; i++) {
      await Order_item.create({'user_id': cart[i].user_id,
        'product_id': cart[i].product_id,
        'order_id': order._id
      })
    }
    await Cart.deleteMany({'user_id': req.user._id})
    res.redirect(`/order/${order._id}`);
  } else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.post('/delete_user/:id', async(req, res, next) => {
  if (req.user) {if (req.user.role == 2) {
    await User.deleteOne({'_id': req.params.id})
    res.redirect('/admin/view_table/users');
  } else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/view_table/pictures', async (req, res, next) => {
  if (req.user) {
    if (req.user.role == 2) {
      let pics = await Picture.find({});
      let parsed_pics = pics.map(function(model) { return model.toObject(); });
      res.render('view_pictures', {layout: 'admin', elements: parsed_pics}); 
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/view_table/products', async (req, res, next) => {
  if (req.user) {
    if (req.user.role == 2) {
      let products = await Product.find({});
      let parsed_products = products.map(function(model) { return model.toObject(); });
      res.render('view_products', {layout: 'admin', elements: parsed_products}); 
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/view_table/users', async (req, res, next) => {
  if (req.user) {
    if (req.user.role == 2) {
      let users = await User.find({});
      let parsed_users = users.map(function(model) { return model.toObject(); });
      for (var i = 0; i < parsed_users.length; i++) {
        switch (parsed_users[i]['role']) {
          case 0:
            parsed_users[i]['role'] = "Пользователь"
            break
          case 1:
            parsed_users[i]['role'] = "Редактор"
            break
          case 2:
            parsed_users[i]['role'] = "Администратор"
            break
          default:
            parsed_users[i]['role'] = "Ошибка"
            break
        }
      }
      res.render('view_users', {layout: 'admin', elements: parsed_users}); 
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin/view_table/orders', async (req, res, next) => {
  if (req.user) {
    if (req.user.role == 2) {
      let orders = await Order.find({});
      let parsed_orders = orders.map(function(model) { return model.toObject(); });
      for (var i = 0; i < parsed_orders.length; i++) {
        switch (parsed_orders[i]['status']) {
          case 0:
            parsed_orders[i]['status'] = "Готов к передаче"
            break
          case 1:
            parsed_orders[i]['status'] = "Доставлен"
            break
          case 2:
            parsed_orders[i]['status'] = "Отменен"
            break
          default:
            parsed_orders[i]['status'] = "Ошибка"
            break
        }
        var date = new Date(parsed_orders[i]['timestamp']);
        parsed_orders[i]['timestamp'] = date.toISOString().slice(0, 16).replace("T", " ");
      }
      res.render('view_orders', {layout: 'admin', elements: parsed_orders}); 
    }
    else next();
  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/admin', function (req, res, next) {
  if (req.user) {if (req.user.role == 2) res.render('admin_main', {layout: 'admin'}); else next();  }
  else next(); 
}, function (req, res, next) {
  res.redirect('/');
});

app.get('/profile', connectEnsureLogin.ensureLoggedIn(), function (req, res){
  let admin = req.user.role == 2 ? true : false;
  res.render('profile', {layout: 'main', req, user: req.user.toObject(), admin});
});

app.get('/catalog', function (req, res){
  res.render('catalog', {layout: 'main', req, catalog});
});

app.get('/cart', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  let elems = await Cart.find({"user_id": req.user._id});
  let elements = []
  let isButtons = false;
  for (var j = 0; j < elems.length; j++) {
    let prod = await Product.findOne({"_id": elems[j]['product_id']});
    prod = prod.toObject();
    elements.push(prod)
  }
  console.log(elements)
  let price = 0;
  for (var i = 0; i < elements.length; i++) {
    price += elements[i]['price'];
  }
  if (elements.length > 0) isButtons = true;
  console.log(elements)
  res.render('cart', {layout: 'main', req, elements, price, isButtons});
});

app.get('/configure', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  let elems = await Configurator.find({"user_id": req.user._id});
  let elements = []
  for (var j = 0; j < elems.length; j++) {
    let prod = await Product.findOne({"_id": elems[j]['product_id']});
    prod = prod.toObject();
    elements.push(prod)
  }
  console.log(elements)
  let price = 0;
  for (var i = 0; i < elements.length; i++) {
    price += elements[i]['price'];
  }
  console.log(elements)
  res.render('configure', {layout: 'main', req, elements, price});
});

app.get('/category/:category', async (req, res) => {
  let search_lis = await Product.find({"product_type": req.params.category});
  let category_name = "Неизвестно"
  for (var i = 0; i < catalog.length; i++) {
    for (var j = 0; j < catalog[i]['children'].length; j++) {
      if (req.params.category == catalog[i]['children'][j]['value']) category_name = catalog[i]['children'][j]['name']
    }
  }
  let row = [[]] 
  let k = 0;
  let search_list = search_lis.map(function(model) { return model.toObject(); });
  console.log(search_list)
  for (var i = 0; i < search_list.length; i++) {
    let list_index = search_list[i]
    row[k].push(list_index)
    if (row[k].length >= 4) {row.push([]); k += 1; }
  }
  res.render('category_search', {layout: 'main', req, search_list: row, category_name});
});

app.get('/product/:id', async (req, res) => {
  let confa = ['motherboard', 'graphics', 'processors', 'pc_case', 'power_supply', 'hdd'];
  try {
    let product_plain = await Product.findOne({"_id": req.params.id});
    let product = product_plain.toObject()
    let isConfigurable = false;
    console.log(product)
    for (var i = 0; i < catalog.length; i++) {
      for (var j = 0; j < catalog[i]['children'].length; j++) {
        if (product['product_type'] == catalog[i]['children'][j]['value']) category_name = catalog[i]['children'][j]['name']
      }
    }
    if (confa.includes(product['product_type'])) isConfigurable = true;
    res.render('product', {layout: 'main', req, product, category_name, isConfigurable})
  } catch (e) {
    console.log(e)
    res.render('not_found', {layout: 'main', req});
  }
});

app.get('/login', function(req, res) {
  res.render('login', {layout: 'main'});
});

app.get('/register', function(req, res) {
  res.render('register', {layout: 'main'});
});

  

app.listen(port, () => {
  console.log(`Приложение запущено на http://localhost:${port}`)
})
