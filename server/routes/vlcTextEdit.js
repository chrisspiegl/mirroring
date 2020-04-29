process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:router:vlcTextEdit`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:router:vlcTextEdit:error`)

const fs = require('fs');
const util = require('util');

const express = require('express')

const middleware = require('server/middleware')

const readFile = util.promisify(fs.readFile); // Convert fs.readFile into Promise version of same
const writeFile = util.promisify(fs.writeFile); // Convert fs.writeFile into Promise version of same

module.exports = () => {
  const router = express.Router()

  router.get('/', middleware.catchErrors(async (req, res) => {
    const response = {
      bodyClasses: 'pageVlcTextEdit'
    }

    response.vlc = {
      topRight: await readFile(config.vlcTextFiles.topRight, 'utf8'),
      centerCenter: await readFile(config.vlcTextFiles.centerCenter, 'utf8'),
    }

    return res.render('vlcTextEdit', response)
  }))

  router.post('/', middleware.catchErrors(async (req, res) => {
    const response = {
      bodyClasses: 'pageVlcTextEdit'
    }

    try {
      const { body } = req
      const textTopRight = body.vlcTextTopRight
      const textCenterCenter = body.vlcTextCenterCenter

      await writeFile(config.vlcTextFiles.topRight, textTopRight)
      await writeFile(config.vlcTextFiles.centerCenter, textCenterCenter)
    } catch (err) {
      res.flash('error', `Error while writing files. Please check the console or ask an administrator.`)
      error(err)
    }


    return res.redirect('/vlctextedit')
  }))

  return router
}
