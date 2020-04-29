process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:router:relay`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:relay:error`)

const express = require('express')

const middleware = require('server/middleware')
const streamReader = require('server/streamReader')

const models = require('database/models')

module.exports = () => {
  const router = express.Router()

  router.get('/', middleware.catchErrors(async (req, res) => {
    const response = {
      bodyClasses: 'pageRelays'
    }

    response.relays = await models.Relay.findAll({
      include: ['StreamKey'],
      order: [
        ['deletedAt', 'ASC'],
        ['note', 'ASC']
      ],
      paranoid: false, // make archived items visible
    })

    response.activeRelays = await streamReader.getActiveRelays()

    return res.render('relays', response)
  }))

  router.post('/create', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { body } = req

    body.idRelay = undefined

    if (!body.note) {
      req.flash('warn', 'note must be set')
      return res.redirect('/relays')
    }
    if (!body.idStreamKey) {
      req.flash('warn', 'idStreamKey must be set')
      return res.redirect('/relays')
    }
    if (!await models.StreamKey.findOne({
      where: {
        idStreamKey: body.idStreamKey
      },
      paranoid: false,
    })) {
      req.flash('warn', 'idStreamKey must already exist in database')
      return res.redirect('/relays')
    }
    if (!body.url) {
      req.flash('warn', 'url must be set')
      return res.redirect('/relays')
    }

    body.enabled = false

    const relayDb = await models.Relay.create(body)

    if (relayDb) {
      req.flash('info', 'Created new relay')
      return res.redirect('/relays')
    }
    req.flash('error', 'Error while creating a new relay.')
    return res.redirect('/relays')
  }))

  router.post('/:idRelay', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params, body } = req

    body.idRelay = params.idRelay


    if (!body.idRelay) {
      req.flash('warn', 'idRelay must be set')
      return res.redirect('/relays')
    }
    if (!await models.Relay.findOne({
      where: {
        idRelay: body.idRelay
      },
      paranoid: false,
    })) {
      req.flash('warn', 'Relay must already exist in database to update it')
      return res.redirect('/relays')
    }
    if (!body.note) {
      req.flash('warn', 'note must be set')
      return res.redirect('/relays')
    }
    if (!body.idStreamKey) {
      req.flash('warn', 'idStreamKey must be set')
      return res.redirect('/relays')
    }
    if (!await models.StreamKey.findOne({
      where: {
        idStreamKey: body.idStreamKey
      },
      paranoid: false,
    })) {
      req.flash('warn', 'idStreamKey must already exist in database')
      return res.redirect('/relays')
    }
    if (!body.url) {
      req.flash('warn', 'url must be set')
      return res.redirect('/relays')
    }

    const relayDb = await models.Relay.update(body, {
      where: {
        idRelay: params.idRelay,
      },
      fields: [
        'note',
        'url',
        'key',
        'idStreamKey',
      ]
    })

    const detatched = await streamReader.detatchStreamRelay(params.idRelay)
    const attached = await streamReader.attachStreamRelay(params.idRelay)

    if (relayDb) {
      req.flash('info', 'Updated relay')
      return res.redirect('/relays')
    }
    req.flash('error', 'Error while updating a relay.')
    return res.redirect('/relays')
  }))

  router.get('/:idRelay/delete', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params, query } = req

    const relay = await models.Relay.destroy({
      where: {
        idRelay: params.idRelay,
      },
      force: (parseInt(query.force) === 1)
    })

    if (parseInt(query.force) === 1) {
      req.flash('info', 'Deleted relay forever.')
    } else {
      req.flash('info', 'Archived relay.')
    }
    return res.redirect('/relays')
  }))

  router.get('/:idRelay/restore', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const restoreCount = await models.Relay.restore({
      where: {
        idRelay: params.idRelay,
      },
    })

    if (restoreCount > 0) {
      req.flash('info', 'Restored relay')
    } else {
      req.flash('error', 'You tried to restore a relay that does not exist.')
    }
    return res.redirect('/relays')
  }))

  router.get('/:idRelay/disable', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const relay = await models.Relay.update({
      enabled: false,
    }, {
      where: {
        idRelay: params.idRelay,
      },
      fields: [
        'enabled',
      ]
    })
    if (relay) {
      const detatched = await streamReader.detatchStreamRelay(params.idRelay)
      req.flash('info', `Disabled relay${(detatched) ? ' and detatched from active stream' : '' }.`)
      return res.redirect(`/relays`)
    }
    req.flash('error', 'Failed to disable the relay.')
    return res.redirect('/relays')
  }))

  router.get('/:idRelay/enable', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const relay = await models.Relay.update({
      enabled: true,
    }, {
      where: {
        idRelay: params.idRelay,
      },
      fields: [
        'enabled',
      ]
    })
    if (relay) {
      const attached = await streamReader.attachStreamRelay(params.idRelay)
      req.flash('info', `Enabled relay${(attached) ? ' and attatched to stream' : '' }.`)
      return res.redirect(`/relays`)
    }
    req.flash('error', 'Failed to enable the relay.')
    return res.redirect('/relays')
  }))

  router.get('/:idRelay/rename', middleware.catchErrors(async (req, res) => {
    // only redirects
    req.flash('info', 'relay rename is not implemented')
    return res.redirect('/relays')
  }))

  return router
}
