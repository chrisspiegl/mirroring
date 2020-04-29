process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:server`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:server:error`)

log(`Running '${config.name}' Server in '${process.env.NODE_ENV}' environment`)

const pmx = require('pmx')
pmx.init({ http: true })

const bodyParser = require('body-parser')
const compression = require('compression')
// const csurf = require('csurf')
const express = require('express')
const expressStatusMonitor = require('express-status-monitor')
const flash = require('express-flash')
const helmet = require('helmet')
// const cors = require('cors')
const logger = require('morgan')
const moment = require('moment-timezone')
const pug = require('pug')
const session = require('express-session')
const SessionRedisStore = require('connect-redis')(session)
const slashes = require('connect-slashes')

moment.tz.setDefault('UTC')

const models = require('database/models')
const middleware = require('server/middleware')
// const routes = require('server/routes')
const pnotice = require('pushnotice')(`${config.slug}:server`, { env: config.env, chat: config.pushnotice.chat, debug: true, disabled: config.pushnotice.disabled })
const redis = require('server/redis')
const mediaServer = require('server/media_server');

// Application
const app = express()
app.use(helmet())
// app.use(cors())
// morganBody(app) // Log all messages including their parameters in a failry pretty way
app.use(logger('tiny')) // Less extreme logging of requests
// app.use(middleware.analytics) // Disable analytics cause it's a internal tool
app.use(expressStatusMonitor())
app.enable('trust proxy') // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// app.use(require('server/limiter').limiterReject); // Apply rate limiting to all routes
// app.use(require('server/limiter').limiterSlowDown); // Apply limter to slow down to all routes
app.set('views', path.join(config.root, 'views'))
app.set('view engine', 'pug')
app.set('view cache', (config.envShort === 'pro'))
app.use(express.static(path.join(config.root, 'public')))
app.use(compression())
app.use(bodyParser.json()) // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: false })) // to support URL-encoded bodies

const sessionRedisStoreOptions = config.database.redis
sessionRedisStoreOptions.prefix = `${config.slugShort}:${config.envShort}:sess:`
sessionRedisStoreOptions.client = redis.redisClient
app.use(session({
  // https://lockmedown.com/securing-node-js-managing-sessions-express-js/
  store: new SessionRedisStore(sessionRedisStoreOptions),
  secret: config.secrets.session,
  resave: false,
  proxy: true,
  saveUninitialized: true,
  cookie: {
    path: '/',
    maxAge: 365 * 24 * 60 * 60 * 1000, // The maximum age (in milliseconds) of a valid session.
    secure: (config.server.protocol === 'https'),
    httpOnly: true // Since the session ID is of no use to the client, there is absolutely no reason that the front-end  application should ever have access to the session ID in the cookie.  However, by default, any script running on the front-end application will have access to a cookie’s contents.
  },
  name: 'id'
}))

app.use(flash())
app.use(middleware.extension)
app.use(require('server/locals'))
app.use((err, req, res, next) => {
  // Error in the Express App
  error(err.message)
  pnotice(`app.use error ${err.message}`)
  next(err, req, res)
})
app.use((req, res, next) => {
  // Each and every request
  return next()
})
app.use(middleware.catchErrors(async (req, res, next) => {
  // Load the user from the session
  // This is specifically needed in PushNotice because we don't use passport.io
  if (req.session.user) {
    const user = await models.User.findByPk(req.session.user.idUser)

    if (!user) {
      error(`req.session.user.idUser is set to ${req.session.user.idUser} but there is no user with this id in the database`)
      await req.session.regenerate((err) => {
        if (err) {
          error('/auth/signout', err)
          return res.redirect('/')
        } else {
          req.flash('info', 'Successfully signed out')
          return res.redirect('/')
        }
      })
      req.user = undefined
      return next()
    }
    req.user = user
    return next()
  }
  return next()
}))

// app.use('/api/v1', require('server/routes/routerApi').apiV1());
// app.use('/api', require('server/routes/routerApi').api());

app.use(slashes(false)) // has to be used after `/api` routes and `express.static` so it does not change those urls
// app.use(csurf({ cookie: false }))

// app.use(routes)

// app.use('/auth', require('server/routes/auth/index')())
// app.use('/contacts?', require('server/routes/contact/index')())
app.use('/streamkeys?', require('server/routes/streamKey')())
app.use('/relays?', require('server/routes/relay')())
app.use('/dashboard', require('server/routes/dashboard')())
app.use('/home', require('server/routes/home')())
app.use('/', require('server/routes/home')())
app.use(require('server/routes/routerError').error404)
app.use(require('server/routes/routerError').error500)

const server = app.listen(config.server.port, config.server.address, async () => {
  await models.init()
  mediaServer.run()

  const host = server.address().address
  const port = server.address().port
  const livereloadDate = new Date()
  const fs = require('fs')
  fs.writeFileSync(path.join(config.root, '/data/livereload.json'), JSON.stringify({ livereload: livereloadDate }), { flat: 'w' })
  log('Livereload written at ' + livereloadDate)
  log('App listening at ' + config.server.protocol + '://' + config.server.hostname + (config.server.portPublic === '' ? '' : ':' + config.server.portPublic))
  log(`Internal Adress: ${host}:${port}`)
  pnotice('App listening at ' + config.server.protocol + '://' + config.server.hostname + (config.server.portPublic === '' ? '' : ':' + config.server.portPublic))
})

// Graceful shutdown
process.on('SIGINT', async () => {
  const cleanUp = async () => {
    // Clean up other resources like DB connections
    log('closing database connection')
    if (models && models.sequelize) {
      await models.sequelize.close()
    }
  }

  log('Closing server...')

  server.close(async () => {
    log('Server closed !!! ')

    await cleanUp()
    process.exit()
  })

  // Force close server after 5secs
  setTimeout(async (e) => {
    log('Forcing server close !!!', e)

    await cleanUp()
    process.exit(1)
  }, 10000) // 10 seconds
})

process.on('unhandledRejection', async (reason, promise) => {
  error('unhandledRejection', reason.stack || reason, promise)
  pnotice(`unhandledRejection:\n${JSON.stringify(reason)}`, 'ERROR')
  // routerError.error500(reason);
})
