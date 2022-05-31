//importo la gestione delle mail
const nodemailer = require('nodemailer');
//mailtemplate
const EmailTemplate = require('email-templates');
const path = require('path');

let transporter = nodemailer.createTransport({
  port: process.env.MAIL_PORT,
  host:process.env.MAIL_HOST,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});

const emailTemplate = new EmailTemplate({
  views: {
    options: { extension: 'ejs' },
    root: path.join(__dirname,'..', 'views', 'emails',)
  }
})

function sendemail(user,path,object,data){
    emailTemplate.render(path, data)
    .then(
      dataHtml => {
        transporter.sendMail({
          from:'test@test.com',
          to:user.email,
          subject:object,
          html:dataHtml
        });
      }
    )
} 

module.exports = {sendemail}