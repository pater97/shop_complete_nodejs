const User = require('../models/user');
//importo il criptatore di password
const bcrypt = require('bcryptjs');
//importo il gestore mail
const {sendemail} = require('../helper/mailHelper');
//importo il pacchetto per criptare nativo node.js
const crypto = require('crypto');
//importo il validatore che riceverà i risultati della diagnosi impostata nelle rotte
const { validationResult } = require('express-validator/check');
//mostro form di log in
exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};
//mostro form di registrazione
exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: req.flash('error'),
    //gli passo dei valori dell'input vuoti perchè quando la renderizzo la prima volta altrimenti mi darebbe errore in quanto in caso di validazione ho gli oldInput
    oldInput:{
      email:'',
      password:'',
      confirmPassword:'',
    },
    validationErrors: []
  });
};
//registro il fatto che sono registrato e attivo la sessione
exports.postLogin = (req, res, next) => {
  //estraggo dalla richiesta email e password
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if( !errors.isEmpty() ){                            //se errors non è vuoto allora ci sono stati degli errori, quindi blocca l'esecuzione
    return res.status(422).render('auth/login',{       //errore 422 è un errore che suggerisce che la validazione è andata male
      path:'/login',
      pageTitle: 'login ',
      errorMessage: errors.array()[0].msg,
      //passo i valori di modo che se la validazione fallisce li ho disponibili e l'utente non li deve riscrivere.
      oldInput: {
        email:email,
        password: password,
      },
      validationErrors: errors.array()
    });
  }
  User.findOne({email:email})
  .then(user => {
    if (!user){
      return res.status(422).render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: 'Invalid email or password.',
        oldInput: {
          email: email,
          password: password
        },
        validationErrors: []
      });
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
      return res.status(422).render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: 'Invalid email or password.',
        oldInput: {
          email: email,
          password: password
        },
        validationErrors: []
      });
    })
    .catch(err => {
      console.log(err);
      res.redirect('/login');
    });
  })
  .catch(err => console.log(err));
};

//registro un nuovo utente
exports.postSignup = (req, res, next) => {
  //estrapolo dal form i dati
  const email = req.body.email;
  const password = req.body.password;
  
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);   //salvo tutti gli errori trovati in questa variabile 
  if( !errors.isEmpty() ){                            //se errors non è vuoto allora ci sono stati degli errori, quindi blocca l'esecuzione
    return res.status(422).render('auth/signup',{       //errore 422 è un errore che suggerisce che la validazione è andata male
      path:'/signup',
      pageTitle: 'Signup ',
      errorMessage: errors.array()[0].msg,
      //passo i valori di modo che se la validazione fallisce li ho disponibili e l'utente non li deve riscrivere.
      oldInput: {
        email:email,
        password: password,
        confirmPassword: confirmPassword
      },
      validationErrors: errors.array()
    });
  }
    //cripto la password: il 12 indica il livello di hash da applicare(12 è altamente sicuro)
    bcrypt.hash(password,12)
    //altrimentri creo l'utente nuovo con tanto di carrello
    .then(hashedPassword => {
      const user = new User({
        email:email,
        password:hashedPassword,
        name: 'test',
        cart : {items:[]}
        });
        //salvo il nuovo utente
      return user.save();
    })
    .then(user => {
      console.log('mail inviata');
      sendemail(user,'welcome','benvenuto',{name:user.name});
    })
    //se tutto è andato a buon fine reindirizzo l'utente loggato nella pagina login per usufruire effettivamente del nuovo account
    .then(result => {
      req.flash('goodMessage','your account is created')
      res.redirect('/login');
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

exports.resetPassword = (req,res,next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset your password',
    errorMessage: req.flash('error')
  });
};

exports.postReset = (req,res,next) => {
  //creo un token randomico da inserire all'utente con il quale farò la comparazione
  crypto.randomBytes(32, (err,buffer) => {
    if(err){
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    //trovo l'utente tramite la mail del form
    User.findOne({email: req.body.email })
    .then( user => {
      //se non trovo la mail mando l'errore e reindirizzo
      if(!user){
        req.flash('error','no email adress found, please retry');
        res.redirect('/reset');
      }
      //altrimenti assegno i token agli user
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      return user.save();
    })
    .then( user => {
      //reindirizzo sulla home l'utente
      res.redirect('/');
      //invio la mail passando l'utente (grazie al custrutto estrapolerà in maniera automatica la mail),l'oggetto mail,la pagina da renderizzare e le variabili
      sendemail(user,'reset','resetta la password',{name:user.name,token:token});
      console.log('mail inviata')
    })
    .catch(err => console.log(err));
  })
};

exports.getNewPassword =  (req,res,next) => {
  //estrapolo il token 
  const token = req.params.token;
  // cerco l'utente con lo stesso token
  User.findOne({resetToken: token,resetTokenExpiration: { $gt: Date.now()}})    //gt indica "valore maggiore di"
  .then( user => {
    let message = req.flash('error');
    if(message.lenght > 0){
      message = message[0];
    }else {
      message = null;
    }
    res.render('auth/new-password',{
      path:'/new-password',
      pageTitle: 'New password',
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token
    })
  })
};

exports.postNewPassword = (req,res,next) => {
  //estraggo la nuova password dal body
  const newPassord = req.body.password;
  //estraggo l'id
  const userId = req.body.userId;
  //estraggo il token
  const passwordToken = req.body.passwordToken;
  //creo una variabile per salvare l'utente che troverò in seguito
  let resetUser;
  //ricerco l'utente in base ai criteri che ho estratto
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {$gt:Date.now()},
    _id: userId
  })
  .then(user => {
    resetUser = user;
    //cripto la nuova password inserita
    return bcrypt.hash(newPassord,12);
  })
  .then(hashedPassword => {
    //aggiorno le modiche all'utente e salvo
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save();
  })
  .then(result => {
    res.redirect('/login')
    sendemail(resetUser,'confirm-new-password','nuova password impostata con successo!',{name:resetUser.name});
  })
  .catch(err => console.log(err));
}