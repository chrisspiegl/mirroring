process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:locals`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:locals:error`)

const _ = require('lodash')
const moment = require('moment')

module.exports = function (req, res, next) {
  if (!res.locals) {
    res.locals = {}
  }

  res.locals = _.merge(res.locals, {
    isPage: true,
    isApi: false,
    _: _,
    moment: moment,
    // flash: req.flash(),
    req: req,
    namePrintDay: function (date) {
      return date.calendar(null, {
        sameDay: '[Today]',
        nextDay: '[Tomorrow]',
        nextWeek: '[Next] dddd',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd',
        sameElse: 'MMM DD, YYYY'
      })
    },
    config: config,
    renderTimestamp: moment().toISOString(),
    title: config.name,
    url: `${config.server.protocol}://${config.server.hostname}${config.server.portPublic === '' ? '' : ':' + config.server.portPublic}/`,
    headScript: `
      <script>
        var rootUri = '\/'
        var rootUrl = '${config.server.protocol}://${config.server.hostname}${config.server.portPublic === '' ? '' : ':' + config.server.portPublic}/'
      </script>
    `
  })
  return next()
}
