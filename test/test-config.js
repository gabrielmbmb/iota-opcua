const config = {};

config.iota = {
  logLevel: 'FATAL',
  logFile: true,
  timestamp: true,
  contextBroker: {
    host: 'localhost',
    port: '1026',
  },
  server: {
    port: '4081',
  },
  deviceRegistry: {
    type: 'memory',
  },
  mongodb: {
    host: 'localhost',
    port: '27017',
    db: 'iotagentopcua',
  },
  types: {},
  service: 'howtoService',
  subservice: '/howto',
  providerUrl: 'http://localhost:4081',
  deviceRegistrationDuration: 'P20Y',
  defaultType: 'Thing',
  defaultResource: '/iot/opcua',
};

module.exports = config;
