process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const config = require('config')

const debug = require('debug')
const log = debug(`${config.slug}:redis`)
log.log = console.log.bind(console)
const error = debug(`${config.slug}:redis:error`)

const redis = require('redis')
const Promise = require('bluebird')

Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

const redisClient = redis.createClient(config.database.redis)

redisClient.unref()

redisClient.on('error', (err) => {
  return error(err)
})

module.exports = {
  redis: redis,
  redisClient: redisClient,
  client: redisClient
}
