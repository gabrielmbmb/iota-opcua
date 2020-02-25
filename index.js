const logger = require('winston');
const defaultConfig = require('./config');
const iotAgentOPCUA = require('./src/opcua.iotagent');
const configService = require('./src/services/config.service');

function main() {
  configService.setConfig(defaultConfig);
  iotAgentOPCUA.start(defaultConfig, error => {
    if (error) {
      logger.error(`Error starting OPC UA IoT Agent: ${error}`);
      process.exit(-1);
    } else {
      logger.info('OPC UA IoT Agent started');
      process.on('SIGINT', () => {
        iotAgentOPCUA.stop();
      });
    }
  });
}

main();
