process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:router:home`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:home:error`)

const express = require('express')

const middleware = require('server/middleware')

const models = require('database/models')

module.exports = () => {
  const router = express.Router()
  router.get('/', middleware.catchErrors(async (req, res) => {
    const response = {
      bodyClasses: 'pageHome'
    }

    // Redirect logged in users to the dashboard unless they are accessing /home directly
    if (req.user && req.baseUrl !== '/home') {
      return res.redirect('/dashboard')
    }

    return res.render('home', response)
  }))

  return router
}

const getStreams = async () => {
  let stats = {};

  this.sessions.forEach(function (session, id) {
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
}