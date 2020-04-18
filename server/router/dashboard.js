process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname, '../../config'))

const debug = require('debug')
const log = debug(`${config.slug}:router:dashboard`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:dashboard:error`)

const express = require('express')
const nodeMediaServerContext = require('node-media-server/node_core_ctx')

const middleware = require('../middleware')
const streamReader = require('../streamReader')

const models = require('../../database/models')

module.exports = () => {
  const router = express.Router()
  router.get('/', middleware.catchErrors(async (req, res) => {
    const response = {
      bodyClasses: 'pageDashboard'
    }

    response.stats = await streamReader.getStreams()

    return res.render('dashboard', response)
  }))

  return router
}
