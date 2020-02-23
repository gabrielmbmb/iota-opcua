const logger = require('winston');
const defaultConfig = require('./config');
const iotAgentOPCUA = require('./src/opcua.iotagent');
const configService = require('./src/services/config.service');

function start() {
  configService.setConfig(defaultConfig);
  iotAgentOPCUA.start(defaultConfig.iota, error => {
    if (error) {
      logger.error(
        'Error starting OPC UA IoT Agents: %s',
        JSON.stringify(error)
      );
    } else {
      logger.info('OPC UA IoT Agent started');
    }
  });
}

start();
