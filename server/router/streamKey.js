process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname, '../../config'))

const debug = require('debug')
const log = debug(`${config.slug}:router:streamKey`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:streamKey:error`)

const express = require('express')
const shortid = require('shortid');

const middleware = require('../middleware')
const streamReader = require('../streamReader')

const models = require('../../database/models')

const generateNewStreamKey = async () => {
  let i = 0
  let generatedKey, keyAlreadyExists;
  do {
    i++
    generatedKey = shortid.generate()
    keyAlreadyExists = await models.StreamKey.count({
      where: {
        key: generatedKey,
      },
    })
  } while(keyAlreadyExists > 0 && i < 100)
  if (keyAlreadyExists > 0) {
    generatedKey = undefined // set undefined if even the 100th generated key already existed in the database.
  }
  return generatedKey;
}

module.exports = () => {
  const router = express.Router()

  router.get('/', middleware.catchErrors(async (req, res) => {
    const response = {
      bodyClasses: 'pageStreamKeys'
    }

    response.streamKeys = await models.StreamKey.findAll({
      order: [
        ['deletedAt', 'ASC'],
        ['note', 'ASC'],
      ],
      paranoid: false, // make archived items visible
    })

    response.activeStreams = await streamReader.getActiveStreams()

    return res.render('streamKeys', response)
  }))

  router.post('/create', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { body } = req

    body.idStreamKey = undefined

    if (!body.note) {
      req.flash('warn', 'note must be set')
      return res.redirect('/streamKeys')
    }

    body.enabled = false

    const generatedKey = await generateNewStreamKey()

    if (!generatedKey) {
      req.flash('error', `Tried regenerating the stream key 100 times and could not find a unique one. Please contact the admin.`)
      return res.redirect(`/streamKeys`)
    }

    body.key = generatedKey

    const streamKeyDb = await models.StreamKey.create(body)

    if (streamKeyDb) {
      req.flash('info', 'Created new stream key')
      return res.redirect('/streamKeys')
    }
    req.flash('error', 'Error while creating a new stream key.')
    return res.redirect('/streamKeys')
  }))

  router.post('/:idStreamKey', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params, body } = req

    body.idStreamKey = params.idStreamKey


    if (!body.idStreamKey) {
      req.flash('warn', 'idStreamKey must be set')
      return res.redirect('/streamKeys')
    }
    if (!await models.StreamKey.findOne({
      where: {
        idStreamKey: body.idStreamKey
      },
      paranoid: false,
    })) {
      req.flash('warn', 'Stream key must already exist in database to update it')
      return res.redirect('/streamKeys')
    }
    if (!body.note) {
      req.flash('warn', 'note must be set')
      return res.redirect('/streamKeys')
    }

    body.key = undefined // set undefined because this can not be updated, it can only be regenerated!

    const streamKeyDb = await models.StreamKey.update(body, {
      where: {
        idStreamKey: params.idStreamKey,
      },
      fields: [
        'note',
      ]
    })

    if (streamKeyDb) {
      req.flash('info', 'Updated stream key')
      return res.redirect('/streamKeys')
    }
    req.flash('error', 'Error while updating a stream key.')
    return res.redirect('/streamKeys')
  }))

  router.get('/:idStreamKey/regenerate', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const generatedKey = await generateNewStreamKey()

    if (!generatedKey) {
      req.flash('error', `Tried regenerating the stream key 100 times and could not find a unique one. Please contact the admin.`)
      return res.redirect(`/streamKeys`)
    }

    const databaseResult = await models.StreamKey.update({
      key: generatedKey,
    }, {
      where: {
        idStreamKey: params.idStreamKey,
      },
      fields: [
        'key',
      ]
    })

    if (databaseResult) {
      req.flash('info', `Regenerated stream key, the new stream key now is: ${generatedKey}`)
      return res.redirect(`/streamKeys`)
    }
    req.flash('error', 'Failed to regenerate the stream key.')
    return res.redirect('/streamKeys')
  }))

  router.get('/:idStreamKey/delete', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params, query } = req

    const databaseResult = await models.StreamKey.destroy({
      where: {
        idStreamKey: params.idStreamKey,
      },
      force: (parseInt(query.force) === 1)
    })

    if (parseInt(query.force) === 1) {
      req.flash('info', 'Deleted stream key forever.')
    } else {
      req.flash('info', 'Archived stream key.')
    }
    return res.redirect('/streamKeys')
  }))

  router.get('/:idStreamKey/restore', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const restoreCount = await models.StreamKey.restore({
      where: {
        idStreamKey: params.idStreamKey,
      },
    })

    if (restoreCount > 0) {
      req.flash('info', 'Restored stream key')
    } else {
      req.flash('error', 'You tried to restore a stream key that does not exist.')
    }
    return res.redirect('/streamKeys')
  }))

  router.get('/:idStreamKey/disable', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const databaseResult = await models.StreamKey.update({
      enabled: false,
    }, {
      where: {
        idStreamKey: params.idStreamKey,
      },
      fields: [
        'enabled',
      ]
    })
    if (databaseResult) {
      const detatched = await streamReader.streamDisable(params.idStreamKey)
      req.flash('info', `Disabled stream key${(detatched) ? ' and closed active stream' : '' }.`)
      return res.redirect(`/streamKeys`)
    }
    req.flash('error', 'Failed to disable the stream key.')
    return res.redirect('/streamKeys')
  }))

  router.get('/:idStreamKey/enable', middleware.catchErrors(async (req, res) => {
    // only redirects
    const { params } = req

    const databaseResult = await models.StreamKey.update({
      enabled: true,
    }, {
      where: {
        idStreamKey: params.idStreamKey,
      },
      fields: [
        'enabled',
      ]
    })
    if (databaseResult) {
      req.flash('info', `Enabled stream key.`)
      return res.redirect(`/streamKeys`)
    }
    req.flash('error', 'Failed to enable the stream key.')
    return res.redirect('/streamKeys')
  }))

  router.get('/:idStreamKey/rename', middleware.catchErrors(async (req, res) => {
    // only redirects
    req.flash('info', 'stream key rename is not implemented')
    return res.redirect('/streamKeys')
  }))

  return router
}
