const express = require('express');
//importo il validator con le funzioni del pacchetto check
const { check,body } = require('express-validator/check');
//importo il controller
const authController = require('../controllers/auth');
//importo il modello user
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
//contorllo la mail
 body('email').isEmail().withMessage('email non valida')
.custom((value,{req}) => {
    return User.findOne({email:value})
    .then(userDoc => {
        if(!userDoc){
            return Promise.reject('email not exist')
        }
    })
}),
body('password', 'Password has to be valid.')
.isLength({ min: 5 })
.isAlphanumeric()
, authController.postLogin);
//utilizzo il validatore indicando il nome dell'input da verificare e cosa deve verificare
router.post('/signup',
[
    //verifico la mail
    check('email')          //qui passo il nome di ciò che voglio passare
    .isEmail()             //qui specifico che tipo di validazione voglio
    .withMessage('email non valida')     //questo è il messaggio nel caso la validazione trovasse errori
    .custom((value,{req}) => {           //qui posso impostare validazioni specifiche
        return User.findOne({email:value})
        .then(userDoc => {
            if(userDoc){
                return Promise.reject('Email arledy exist, please pick a different one')
            }
        })
    }),
    //verifico la password
    body('password','please enter a passsword with only numbers and text(min. 5 characters)')
    .isLength({min:5})
    .isAlphanumeric()
    ,
    //verifico la corrispondenza delle password
    body('confirmPassword')
    .custom((value,{req}) => {
        if(value !== req.body.password){
            throw new Error('password have to match')
        }
        return true;
    })
],
authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset',authController.resetPassword);

router.post('/reset',authController.postReset);

router.get('/reset/:token',authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);

module.exports = router;