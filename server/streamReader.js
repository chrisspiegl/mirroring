process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:streamReader`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:streamReader:error`)

const NodeMediaServer = require('node-media-server')
const nodeMediaServerContext = require('node-media-server/node_core_ctx')
const NodeCoreUtils = require('node-media-server/node_core_utils');
const NodeRelaySession = require('node-media-server/node_relay_session');

const VqtStreamsInfo = require('video-quality-tools').StreamsInfo
const VqtFramesMonitor = require('video-quality-tools').FramesMonitor
const vqtProcessFrames = require('video-quality-tools').processFrames
const VqtErrors = require('video-quality-tools').Errors
const VqtExitReasons = require('video-quality-tools').ExitReasons
const shortid = require('shortid');
const _ = require('lodash')
const { Op } = require('sequelize')

const models = require('database/models')

function MyError(name, message=''){
  this.name = name
  this.message = message
}

MyError.prototype = Error.prototype

// ====================================================================
// ====================================================================
// Streams
// ====================================================================
// ====================================================================

const streamDisable = async (streamKey) => {
  if (!streamKey) {
    throw new MyError('ParameterMissing', 'must be called with streamKey or idStreamKey')
  }
  streamKeyDb = await models.StreamKey.findOne({
    where: {
      [Op.or]: {
        idStreamKey: streamKey,
        key: streamKey,
      }
    }
  })

  if (streamKeyDb) {
    streamKey = streamKeyDb.key
  } else {
    throw new MyError('StreamKeyNotFound', 'Not a valid stream key or idStreamKey')
  }

  let activeStreamSession = streamIsActive(streamKey)

  if (!activeStreamSession) {
    log(`${streamKey} : not active, no need to end the session`)
    return false
  }

  log(`${streamKey} : active, ending the session`)
  activeStreamSession.reject()
  return true
}

const streamIsActive = (streamKey) => {
  const publisherId = nodeMediaServerContext.publishers.get('/live/' + streamKey)
  const publisherSession = nodeMediaServerContext.sessions.get(publisherId);
  if (publisherSession) return publisherSession
  return false;
}

const getActiveStreams = () => {
  const publisherIds = nodeMediaServerContext.publishers
  const activeStreamSessions = {}
  for (const [publishStreamPath, publisherId] of publisherIds.entries()) {
    const session = nodeMediaServerContext.sessions.get(publisherId);
    if (!session.isStarting) continue
    let regRes = /\/(.*)\/(.*)/gi.exec(session.publishStreamPath)
    if (regRes === null) continue
    let [app, streamKey] = _.slice(regRes, 1)
    activeStreamSessions[streamKey] = session
  }
  return activeStreamSessions;
}


const getStreams = async () => {
  let stats = {};

  nodeMediaServerContext.sessions.forEach(function (session, id) {
    if (session.isStarting) {
      let regRes = /\/(.*)\/(.*)/gi.exec(session.publishStreamPath || session.playStreamPath);

      if (regRes === null) return;

      let [app, stream] = _.slice(regRes, 1);

      if (!_.get(stats, [app, stream])) {
        _.set(stats, [app, stream], {
          publisher: null,
          subscribers: []
        });
      }

      switch (true) {
        case session.isPublishing: {
          _.set(stats, [app, stream, 'publisher'], {
            app: app,
            stream: stream,
            clientId: session.id,
            connectCreated: session.connectTime,
            bytes: session.socket.bytesRead,
            ip: session.socket.remoteAddress,
            audio: session.audioCodec > 0 ? {
              codec: session.audioCodecName,
              profile: session.audioProfileName,
              samplerate: session.audioSamplerate,
              channels: session.audioChannels
            } : null,
            video: session.videoCodec > 0 ? {
              codec: session.videoCodecName,
              width: session.videoWidth,
              height: session.videoHeight,
              profile: session.videoProfileName,
              level: session.videoLevel,
              fps: session.videoFps
            } : null,
          });

          break;
        }
        case !!session.playStreamPath: {
          switch (session.constructor.name) {
            case 'NodeRtmpSession': {
              stats[app][stream]['subscribers'].push({
                app: app,
                stream: stream,
                clientId: session.id,
                connectCreated: session.connectTime,
                bytes: session.socket.bytesWritten,
                ip: session.socket.remoteAddress,
                protocol: 'rtmp'
              });

              break;
            }
            case 'NodeFlvSession': {
              stats[app][stream]['subscribers'].push({
                app: app,
                stream: stream,
                clientId: session.id,
                connectCreated: session.connectTime,
                bytes: session.req.connection.bytesWritten,
                ip: session.req.connection.remoteAddress,
                protocol: session.TAG === 'websocket-flv' ? 'ws' : 'http'
              });

              break;
            }
          }

          break;
        }
      }
    }
  });
  return stats
}

const updateStreamKeyLastActiveAt = async (streamKey) => {
  return await models.StreamKey.update({
    lastActiveAt: new Date(),
  }, {
    where: {
      key: streamKey,
    },
  })
}

const getStreamKeyFromStreamPath = (path) => {
  try {
    let parts = path.split('/')
    return parts[parts.length - 1]
  } catch (e) {
    return undefined
  }
}

// ====================================================================
// ====================================================================
// Transcoder
// ====================================================================
// ====================================================================

const attachStreamRelay = async (idRelay) => {
  const relay = await models.Relay.findByPk(idRelay, {
    include: ['StreamKey']
  })
  if (!idRelay) {
    throw new MyError('ParameterMissing', 'must be called with idRelay')
  }
  if (!relay) {
    log(`relay ${idRelay} not found`)
    return false
  }
  if (!relay.StreamKey) {
    log(`relay ${relay.note} parent stream not found`)
    return false
  }
  if (!relay.StreamKey.enabled) {
    log(`${relay.StreamKey.key} : relay ${relay.note} parent stream is currently disabled, not attatching`)
    return false
  }

  if (!await streamIsActive(relay.StreamKey.key)) {
    log(`${relay.StreamKey.key} : relay ${relay.note} parent stream is not active, not attatching`)
    return false
  }
  if (!relay.enabled) {
    log(`${relay.StreamKey.key} : relay ${relay.note} is disabled, not attatching`)
    return false
  }
  url = relay.url + relay.key
  // nodeMediaServerContext.nodeEvent.emit('relayPush', url, 'live', relay.StreamKey.key)
  relayPushStart(url, 'live', relay.StreamKey.key, idRelay)
  log(`${relay.StreamKey.key} : relay ${relay.note} got attached`)

  const relayUpdateObject = {
    lastActiveAt: new Date()
  }
  await relay.set(relayUpdateObject, null).save()
  return true
}

const attatchStreamRelays = async (streamKey, idStreamKey) => {
  log(`${streamKey} : attaching relays`)
  const app = 'live'

  const relays = await models.Relay.findAll({
    where: {
      idStreamKey: idStreamKey
    }
  })

  log(`${streamKey} : found ${relays.length} relays`)
  for (let relay of relays) {
    log(`${streamKey} : relay ${relay.note} is ${(relay.enabled) ? 'enabled' : 'disabled'}`)
    if (!relay.enabled) {
      continue
    }
    url = relay.url + relay.key
    // nodeMediaServerContext.nodeEvent.emit('relayPush', url, 'live', streamKey)
    relayPushStart(url, 'live', streamKey, relay.idRelay)
    log(`${streamKey} : relay ${relay.note} got attached`)

    const relayUpdateObject = {
      lastActiveAt: new Date()
    }
    await relay.set(relayUpdateObject, null).save()
  }

  return
}

const getActiveRelays = () => {
  const activeRelays = {}
  for (const [sessionId, session] of dynamicRelaySessions) {
    if (session.idRelay) {
      activeRelays[session.idRelay] = session
    }
  }
  return activeRelays;
}

const detatchStreamRelay = async (idRelay) => {
  if (!idRelay) {
    throw new MyError('ParameterMissing', 'must be called with idRelay')
  }

  const activeRelays = getActiveRelays()

  if (activeRelays[idRelay]) {
    log(`found active relay ${idRelay} and ending the session`)
    activeRelays[idRelay].end()
    return true
  }
  return false
}

// TODO: Maybe this is better stored in the NMS Context Sessions with a 'isRelay: true'? Right now storing it in this extra Map.
const dynamicRelaySessions = new Map()

const relayPushStart = (url, app, name, idRelay) => {
  let conf = {};
  conf.ffmpeg = config.rtmpServer.relay.ffmpeg;
  conf.inPath = `rtmp://127.0.0.1:${config.rtmpServer.rtmp.port}/${app}/${name}`;
  conf.ouPath = url;
  let id = NodeCoreUtils.generateNewSessionID();
  let session = new NodeRelaySession(conf);
  session.id = id;
  session.idRelay = idRelay;
  session.on('end', (id) => {
    dynamicRelaySessions.delete(id);
  });
  dynamicRelaySessions.set(id, session);
  session.run();
  log('[Relay dynamic push] start', id, conf.inPath, ' to ', conf.ouPath);
}






// ====================================================================
// ====================================================================
// Transcoder
// ====================================================================
// ====================================================================

const attatchStreamTranscoders = async (streamKey, idStreamKey) => {
  log(`${streamKey} : attaching transcoders`)
  const app = 'live'

  // const relays = await models.Relay.findAll({
  //   where: {
  //     idStreamKey: idStreamKey
  //   }
  // })

  let transcoders = [
    {
      note: 'NIYAMA / LIVE to 720p',
      idTranscoder: '3c2cf118-f158-48f0-b0dd-c415d6a0b495',
      idStreamKey: '5322fb20-074e-4c82-ae93-9024cf0fc862',
      enabled: true,
      url: 'rtmp://127.0.0.1/live/',
      key: '3IkAqC1Pq',
    },
    {
      note: 'NIYAMA / PLAYLIST to 720p',
      idTranscoder: '009ad86f-b4c7-47d9-9d4d-eac195f6eeb5',
      idStreamKey: 'fd60584c-fab9-4468-ae51-daf2565c5906',
      enabled: false,
      url: 'rtmp://127.0.0.1/720p/',
      key: 'lTgpsAp0x',
    },
  ]

  transcoders = _.filter(transcoders, {idStreamKey: idStreamKey})

  log(`${streamKey} : found ${transcoders.length} transcoders`)
  for (let transcoder of transcoders) {
    log(`${streamKey} : transcoder ${transcoder.note} is ${(transcoder.enabled) ? 'enabled' : 'disabled'}`)
    if (!transcoder.enabled) {
      continue
    }
    url = transcoder.url + transcoder.key
    // nodeMediaServerContext.nodeEvent.emit('transcoderPush', url, 'live', streamKey)
    transcoder720pStart(url, 'live', streamKey, transcoder.idtranscoder)
    log(`${streamKey} : transcoder ${transcoder.note} got attached`)

    // const relayUpdateObject = {
    //   lastActiveAt: new Date()
    // }
    // await relay.set(relayUpdateObject, null).save()
  }

  return
}


const StreamTranscoder = require('server/streamTranscoder')
let transcoderSessions = new Map()

const transcoder720pStart = (url, app, name, idTranscoder) => {
  console.log('transcoder720pStart');
  let conf = {};
  conf.ffmpeg = config.rtmpServer.trans.ffmpeg;
  conf.mediaroot = config.rtmpServer.http.mediaroot;
  conf.rtmpPort = config.rtmpServer.rtmp.port;
  conf.streamPath = 'live/live';
  conf.streamApp = 'live';
  conf.streamName = 'live';

  conf.inPath = `rtmp://127.0.0.1:${config.rtmpServer.rtmp.port}/${app}/${name}`;
  conf.ouPath = url; // IGNORED IN CUSTOM streamTranscoder
  conf.output = ['-f', 'flv', url]

  conf.ac = 'aac'
  conf.acParam = ['-b:a', '160k', '-ar', 44100, '-ac', 2]

  conf.vc = 'libx264'
  conf.vcParam = [
    // '-vf', 'scale=1280:720',
    '-crf', '30',
    '-x264opts', 'keyint=48:no-scenecut',
    '-r', '24/1',
    '-s', '1280x720',
    '-profile:v', 'high',
    '-preset', 'veryfast',
    '-b:v', '3000k',
      '-minrate', '3000k',
      '-maxrate', '3000k',
      '-bufsize', '1500k',
  ]
    // '-tune', 'zerolatency',

  let id = NodeCoreUtils.generateNewSessionID();
  let session = new StreamTranscoder(conf)
  session.id = id;
  session.idTranscoder = idTranscoder;
  transcoderSessions.set(id, session)
  session.on('end', (id) => {
    transcoderSessions.delete(id);
  });
  session.run();
  log('[Transcoder 720p dynamic] start', id, conf.inPath, ' to ', conf.ouPath);
}





// ====================================================================
// ====================================================================
// Stream Analysis
// ====================================================================
// ====================================================================

const streamAnalysis = async (streamKey) => {
  // Documentation of the plugin being used: https://www.npmjs.com/package/video-quality-tools
  const streamsInfoOptions = {
      ffprobePath: require('ffprobe-static').path,
      timeoutInMs: 2000
  }

  const framesMonitorOptions = {
      ffprobePath: require('ffprobe-static').path,
      timeoutInMs: 2000,
      bufferMaxLengthInBytes: 100000,
      errorLevel: 'error',
      exitProcessGuardTimeoutInMs: 1000,
      analyzeDurationInMs: 9000
  }

  const AMOUNT_OF_FRAMES_TO_GATHER = 100
  const INTERVAL_TO_ANALYZE_FRAMES = 5000 // in milliseconds

  const streamsInfo = new VqtStreamsInfo(streamsInfoOptions, `rtmp://stream.spiegl.co:1935/live/${streamKey}`)
  const framesMonitor = new VqtFramesMonitor(framesMonitorOptions, `rtmp://stream.spiegl.co:1935/live/${streamKey}`)

  // const streamInfo = await streamsInfo.fetch()
  streamsInfo.fetch()
      .then(info => {
        console.log('Video info:', info.videos)
        console.log('Audio info:', info.audios)
      }).catch(err => console.error(err))

  // Frame Network Quality Analysing
  let framesNetwork = []
  let framesQuality = []

  framesMonitor.on('frame', frame => {
      framesNetwork.push(frame)
      framesQuality.push(frame)

      if (AMOUNT_OF_FRAMES_TO_GATHER <= framesQuality.length) {
        try {
          const info = vqtProcessFrames.encoderStats(framesQuality)
          framesQuality = info.remainedFrames
          console.log('encoderStats: ', info.payload)
        } catch(err) {
          if (err instanceof VqtErrors.GopNotFoundError) {}
          else {
            console.log(err)
          }
        }
      }
  })

  framesMonitor.listen();

  setInterval(() => {
      try {
        console.log('framesToAnalyze: ', framesNetwork.length);
        const info = vqtProcessFrames.networkStats(framesNetwork, INTERVAL_TO_ANALYZE_FRAMES)
        console.log('networkStats: ', info)
        framesNetwork = []
      } catch(err) {
        // only if arguments are invalid
        console.log(err)
      }
  }, INTERVAL_TO_ANALYZE_FRAMES)

}

module.exports = {
  attachStreamRelay,
  attatchStreamRelays,
  attatchStreamTranscoders,
  detatchStreamRelay,
  getActiveRelays,
  getActiveStreams,
  getStreamKeyFromStreamPath,
  getStreams,
  streamAnalysis,
  streamDisable,
  streamIsActive,
  updateStreamKeyLastActiveAt,
}