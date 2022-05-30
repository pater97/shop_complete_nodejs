//importo pack per i percorsi
const path = require('path');
//importo express
const express = require('express');
//importo pack per gestire il corpo delle richieste
const bodyParser = require('body-parser');
//importo mongoose
const mongoose = require('mongoose');
//importo pack per gestire le session
const session = require('express-session');
//importo pack per connettere le session a mongodb
const MongoDBStore = require('connect-mongodb-session')(session);
//importo la sicurezza csfr token
const csfr = require('csurf');
//importo il pacchetto per la gestione degli errori nel caso in cui ci fossero tramite la session
const flash = require('connect-flash');
const errorController = require('./controllers/error');
const User = require('./models/user');
//imposto l'uri dato da mongodb
const MONGODB_URI =
'mongodb+srv://root:hdJVk1UWmv8JF2Co@cluster0.1uaxy.mongodb.net/prova?retryWrites=true&w=majority';
//utilizzo express
const app = express();
//creo la connessione tra mongo db e session e creo la nuova collection che conterrà le session
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
//la rendo disponibile
const csrfProtection = csfr();
//setto il template engine
app.set('view engine', 'ejs');
app.set('views', 'views');
//importo le rotte
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
//uso il pack per la gestione del corpo di richiesta
app.use(bodyParser.urlencoded({ extended: false }));
//percorso statico css
app.use(express.static(path.join(__dirname, 'public')));
//creo la session e la connetto allo store di mongo db 
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
//uso la protezione che verrà attivata prima delle rotte
app.use(csrfProtection);
//utilizzo il flash per la visualizzazione di errori tramite sessione
app.use(flash());
//creo un middleware per la req dell'utente
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
  .then(user => {
    req.user = user;
    next();
  })
  .catch(err => console.log(err));
});
//creo il middleware che passerà le variabili locali a tutti gli altri middleware, in questo caso sia il token che il cookie
app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;     
  res.locals.csrfToken = req.csrfToken()        //locals è una funzione express che permette di passare delle variabili locali
  next();
})
//uso le rotte
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
//uso il controller per la gestione degli errori in questo caso il 404
app.use(errorController.get404);
//connetto db e faccio partire il server ( creo un utente se non dovesse esserci all'avvio del server)
mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3000);
    console.log('connesso!')
  })
  .catch(err => {
    console.log(err);
  });
