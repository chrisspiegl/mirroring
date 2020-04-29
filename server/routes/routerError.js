process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:router:error`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:error:error`)

const boom = require('boom')

const pnotice = require('pushnotice')(`${config.slug}:router:error`, { env: config.env, chat: config.pushnotice.chat, debug: true, disabled: config.pushnotice.disabled })

const errorResponder = (status, req, res, err) => {
  err = boom.boomify(err)
  const errorObject = {
    url: req.url,
    method: req.method,
    code: status,
    msg: err.output.payload.error,
    message: err.output.payload.message,
    error: err || undefined,
    stack: err.stack
  }

  if (status !== 404) {
    error(err.stack)
    pnotice(`Error ${status}: ${err.output.payload.error}\n${err.output.payload.message}\n${JSON.stringify(errorObject)}`)
  }

  if (res.locals.isApi) {
    // If the request is an API request, definitely respond with API response.
    return res.status(status).set('Content-Type', 'application/json').send(err.output.payload)
  }

  return res.format({
    '*/*': () => {
      return res.status(status).set('Content-Type', 'application/json').send(errorObject)
    },
    text: () => {
      return res.status(status).send(errorObject.message)
    },
    html: () => {
      error.bodyClasses = 'pageError'
      return res.status(status).render('error', errorObject)
    },
    json: () => {
      return res.status(status).send(errorObject)
    }
  })
}

const error404 = (req, res, next) => {
  throw boom.notFound()
}

const error500 = async (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return errorResponder(400, req, res, err)
  }
  if (err.isBoom) {
    return errorResponder(err.output.statusCode, req, res, err)
  }
  return errorResponder(500, req, res, err)
}

module.exports = {
  error404,
  error500,
  errorResponder
}
