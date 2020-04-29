process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname, '../config'))

const debug = require('debug')
const log = debug(`${config.slug}:mediaServer`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:mediaServer:error`)

const NodeMediaServer = require('node-media-server')

const streamReader = require('./streamReader')
const models = require('../database/models')

function MyError(name, message=''){
  this.name = name
  this.message = message
}

MyError.prototype = Error.prototype

nms = new NodeMediaServer(config.rtmpServer)

nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`)
  const session = nms.getSession(id)
  // console.log('session: ', session)
  if (args.app && args.app != 'live' && args.app != '720p') {
    log(`Rejected session because it is not in the 'live' app.`)
    session.reject()
  }
})

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`)
  const session = nms.getSession(id)
  // console.log('session: ', session)
})

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`)
  const session = nms.getSession(id)
  // console.log('session: ', session)
})

nms.on('prePublish', async (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
  const session = nms.getSession(id)
  const streamKey = streamReader.getStreamKeyFromStreamPath(StreamPath)
  console.log('streamKey: ', streamKey)

  // Authenticating the Stream
  try {
    if (!streamKey) {
      throw new MyError('StreamKeyNotFound')
    }
    streamKeyDb = await models.StreamKey.findOne({
      where: {
        key: streamKey
      }
    }) // check if stream key exists in database
    if (!streamKeyDb) {
      throw new MyError('StreamKeyInvalid')
    }
    if (!streamKeyDb.enabled) {
      throw new MyError('StreamKeyDisabled')
    }

    await streamReader.attatchStreamRelays(streamKeyDb.key, streamKeyDb.idStreamKey)
    await streamReader.updateStreamKeyLastActiveAt(streamKeyDb.key)
    // await streamAnalysis(streamKeyDb.key)

    // await streamReader.attatchStreamTranscoders(streamKeyDb.key, streamKeyDb.idStreamKey)

  } catch(e) {
    console.log(e)
    session.reject()
  }

})

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
  const session = nms.getSession(id)
  const streamKey = streamReader.getStreamKeyFromStreamPath(StreamPath)
  // console.log('session: ', session)
  console.log('streamKey: ', streamKey)
  if (streamKey) {
    streamReader.updateStreamKeyLastActiveAt(streamKey)
  }
})

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
  const session = nms.getSession(id)
  const streamKey = streamReader.getStreamKeyFromStreamPath(StreamPath)
  // console.log('session: ', session)
  console.log('streamKey: ', streamKey)
  if (streamKey) {
    streamReader.updateStreamKeyLastActiveAt(streamKey)
  }
})

// nms.on('prePlay', (id, StreamPath, args) => {
//   console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
//   // const session = nms.getSession(id)
//   // session.reject()
// })

// nms.on('postPlay', (id, StreamPath, args) => {
//   console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
// })

// nms.on('donePlay', (id, StreamPath, args) => {
//   console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
// })

module.exports = nms
