const _ = require('lodash')
const fs = require('fs')
const path = require('path')

let allConf = {}

const allConfPath = path.join(path.normalize(__dirname), 'all')

try {
  console.log('Loading ' + allConfPath)
  allConf = require(allConfPath)
} catch (err) {
  console.error(err)
  console.error('Configuration file ' + allConfPath + ' is missing!')
  console.error('Shutting down!')
  process.exit()
}

let envConf = {}

const envConfPath = path.join(path.normalize(__dirname), '' + process.env.NODE_ENV)

try {
  console.log('Loading ' + envConfPath)
  envConf = require(envConfPath)
} catch (err) {
  console.error(err)
  console.error('No custom configuration for ' + envConfPath + ' environment')
}

module.exports = _.merge(allConf, envConf)
