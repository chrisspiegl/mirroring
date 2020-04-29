process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:router:index`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:index:error`)

const app = module.exports = require('express')();

const slashes = require('connect-slashes')
// const csurf = require('csurf')

// app.use('/api/v1', require('./routerApi').apiV1());
// app.use('/api', require('./routerApi').api());

app.use(slashes(false)) // has to be used after `/api` routes and `express.static` so it does not change those urls
// app.use(csurf({ cookie: false }))

app.use('/streamkeys?', require('./streamKey')())
app.use('/relays?', require('./relay')())
app.use('/dashboard', require('./dashboard')())
app.use('/vlctextedit', require('./vlcTextEdit')())
app.use('/home', require('./home')())
app.use('/', require('./home')())
app.use(require('./routerError').error404)
app.use(require('./routerError').error500)
