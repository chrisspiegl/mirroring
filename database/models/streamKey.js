const uuid = require('uuid')

module.exports = function (sequelize, DataTypes) {
  const StreamKey = sequelize.define('StreamKey', {
    idStreamKey: {
      type: DataTypes.UUID,
      defaultValue: () => uuid.v4(),
      primaryKey: true,
      unique: true,
      allowNull: false
    },
    idUser: {
      type: DataTypes.UUID,
      allowNull: true // TODO: Must be not null allowed once users are implemented
    },
    note: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    key: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    freezeTableName: true,
    paranoid: true
  })

  // Class Method
  StreamKey.associate = function (models) {
    this.models = models
    return Promise.all([
      models.StreamKey.hasMany(models.Relay, {
        foreignKey: 'idStreamKey'
      })
    ])
  }
  return StreamKey
}
