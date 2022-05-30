const User = require('../models/user');
//importo il criptatore di password
const bcrypt = require('bcryptjs');
//mostro form di log in
exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: req.flash('error')
  });
};
//mostro form di registrazione
exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: req.flash('error')
  });
};
//registro il fatto che sono registrato e attivo la sessione
exports.postLogin = (req, res, next) => {
  //estraggo dalla richiesta email e password
  const email = req.body.email;
  const password = req.body.password;
  //cerco l'utente attraverso l'email
  User.findOne({email:email})
  .then(user => {
    //se non trovo l'utente rendirizzo
    if(!user){
      req.flash('error','invalid email or password');
      return res.redirect('/login');
    }
    //altrimenti confronto le password criptate attraverso bcrypt
    bcrypt.compare(password,user.password)
    //restituirà un valore booleano
    .then(doMatch => {
      //se il risultato sarà vero allora effetuerò le varie operazione e reindirizzo un utente loggato
      if(doMatch){
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save(err => {
          console.log(err);
          res.redirect('/');
        });
      }
      req.flash('error','invalid email or password');
      res.redirect('/login');
    })
  })
  .catch(err => console.log(err));
};

//registro un nuovo utente
exports.postSignup = (req, res, next) => {
  //estrapolo dal form i dati
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  //controllo che non ci sia un email uguale 
  User.findOne({email:email})
  //una svolta la ricerca mi assicuro che possa avere una risposta in entrambi i casi
  .then(userDoc => {
    //se esiste reindirizzo alla pagina di signup
    if (userDoc){
      req.flash('error','email arleady exist,please choose another email')
      return res.redirect('/signup');
    }
    //cripto la password: il 12 indica il livello di hash da applicare(12 è altamente sicuro)
    return bcrypt.hash(password,12)
    //altrimentri creo l'utente nuovo con tanto di carrello
    .then(hashedPassword => {
      const user = new User({
        email:email,
        password:hashedPassword,
        cart : {items:[]}
        });
        //salvo il nuovo utente
      return user.save();
    })
    //se tutto è andato a buon fine reindirizzo l'utente loggato nella pagina login per usufruire effettivamente del nuovo account
    .then(result => {
      req.flash('goodMessage','your account is created')
      res.redirect('/login');
    });
  })
  .catch(err => console.log(err));
};

//esco dal login e termino la sessione
exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};
