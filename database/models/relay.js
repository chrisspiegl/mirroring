const uuid = require('uuid')

module.exports = function (sequelize, DataTypes) {
  const Relay = sequelize.define('Relay', {
    idRelay: {
      type: DataTypes.UUID,
      defaultValue: () => uuid.v4(),
      primaryKey: true,
      unique: true,
      allowNull: false
    },
    idStreamKey: {
      type: DataTypes.UUID,
      primaryKey: false,
      unique: false,
      allowNull: false
    },
    idUser: {
      type: DataTypes.UUID,
      unique: false,
      allowNull: true // TODO: Must be not null allowed once users are implemented
    },
    note: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false
    },
    key: {
      type: DataTypes.TEXT,
      unique: false,
      allowNull: true
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    freezeTableName: true,
    paranoid: true
  })

  // Class Method
  Relay.associate = function (models) {
    this.models = models
    return Promise.all([
      models.Relay.belongsTo(models.StreamKey, {
        foreignKey: 'idStreamKey'
      })
    ])
  }
  return Relay
}
