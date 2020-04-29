process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:mailer`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:mailer:error`)

const nodemailer = require('nodemailer')
const Email = require('email-templates')

const { mail } = config

let emailObject

module.exports = () => {
  let transporter

  const initEmailObject = () => {
    transporter = nodemailer.createTransport(mail.smtp)

    const emailDefaults = {
      message: {
        from: `${config.name} <${mail.from}>`
      },
      send: mail.send, // set wether or not emails should be sent
      transport: transporter,
      preview: mail.preview,
      juice: true,
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: path.resolve(config.root, 'public/assets')
        }
      }
    }

    return new Email(emailDefaults)
  }

  if (!emailObject) {
    emailObject = initEmailObject()
  }

  const sendMail = (template, message, locals = {}) => {
    const messageDefaults = {}
    message = { ...messageDefaults, ...message }
    const emailOptions = {
      template: path.resolve(config.root, 'views', 'email', template),
      message,
      locals
    }
    if (!mail.send) {
      log(`Not sending email '${template}' to '${message.to}' / Mail Sending Disabled in Config`)
    } else {
      log(`Sending email email '${template}' to '${message.to}'`)
    }
    return emailObject.send(emailOptions)
  }

  return {
    sendMail
  }
}
