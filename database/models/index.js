'use strict'

process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname, '../../config'))
const configDatabase = require(path.join(__dirname, '/../') + 'config.js')[config.env]

const debug = require('debug')
const log = debug(`${config.slug}:database`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:database:error`)

const fs = require('fs')
// const Promise = require('bluebird');
const Sequelize = require('sequelize')

const { promisify } = require('util')
const fsReadDir = promisify(fs.readdir)

const db = {}
const basename = path.basename(module.filename)

let sequelize

const init = async () => {
  try {
    if (configDatabase.use_env_variable) {
      sequelize = new Sequelize(process.env[configDatabase.use_env_variable])
    } else {
      sequelize = new Sequelize(
        configDatabase.database,
        configDatabase.username,
        configDatabase.password,
        configDatabase
      )
    }

    log('loading all database models from files')
    let filestream = await fsReadDir(__dirname)
    filestream = await filestream.filter((file) => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    })
    for await (const file of filestream) {
      log(`importing model ${path.join(__dirname, file)}`)
      const model = sequelize.import(path.join(__dirname, file))
      db[model.name] = model
    }
    log('imported all the models')

    log('initializing models')
    for await (const modelName of Object.keys(db)) {
      if (!db[modelName] || modelName === 'init') continue
      log(`initializing models.${modelName}`)
      await db[modelName].sync({ force: false })
      log(`initialized models.${modelName}`)
    }
    log('initialized all models successfully')

    log('associating all models')
    for await (const modelName of Object.keys(db)) {
      if (!db[modelName].associate) continue
      log(`associating models.${modelName}`)
      await db[modelName].associate(db)
      log(`associated models.${modelName}`)
    }
    log('associated all models successfully')

    db.sequelize = sequelize
    db.Sequelize = Sequelize
  } catch (err) {
    error('error initializing models', err)
  }

  return db
}

db.init = init

module.exports = db
