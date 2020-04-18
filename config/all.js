path = require('path')

module.exports = {
  env: process.env.NODE_ENV,
  envShort: (process.env.NODE_ENV) ? process.env.NODE_ENV.substring(0, 3) : undefined,
  name: 'Stream Mirroring',
  slug: 'simir',
  slugShort: 'mir',
  version: require(path.normalize(__dirname + '/../package.json')).version,

  root: path.normalize(__dirname + '/..'),

  secrets: {
    session: 'REPLACE WITH RANDOM KEY',
    jwt: 'REPLACE WITH RANDOM KEY'
  },

  database: {
    path: path.join(path.normalize(__dirname + '/..'), 'data/'), // Used for logs and file storage in `/data` folder
    sequelize: {
      dialect: undefined,
      username: undefined,
      password: undefined,
      database: undefined,
      host: undefined,
      storage: undefined,
      logging: false,
      dialectOptions: {
        supportBigNumbers: true
      },
      define: {
        freezeTableName: true,
        charset: 'utf8mb4',
        dialectOptions: {
          collate: 'utf8_general_ci'
        }
      }
    },

    redis: {
      host: '127.0.0.1',
      port: 6379,
      options: {}
    }
  },

  server: {
    port: process.env.PORT || 3000,
    portPublic: process.env.PORT || 3000,
    address: '127.0.0.1',
    hostname: 'localhost',
    protocol: 'http'
  },

  pushnotice: {
    disabled: true,
    chat: {
      id: undefined,
      secret: undefined
    }
  },

}
