const config = {};

config.iota = {
  /**
   * Logging level. Valid values: 'SILLY', 'DEBUG', 'VERBOSE', 'INFO' , 'WARN' or 'ERROR'
   */
  logLevel: process.env.IOTA_LOG_LEVEL || 'DEBUG',
  /**
   * If this flag is active, log messages will be saved in the directory 'logs'.
   */
  logFile: false,
  /**
   * When this flag is active, the IoT Agent will add the TimeInstant attribute to every entity created, as well
   * as a TimeInstant metadata to each attribute, with the current timestamp.
   */
  timestamp: true,
  /**
   * Orion Context Broker configuration.
   */
  contextBroker: {
    /**
     * Host where OCB instance is located.
     */
    host: process.env.IOTA_CB_HOST || 'localhost',
    /**
     * Port where OCB instance is listening.
     */
    port: process.env.IOTA_CB_PORT || '1026',
  },
  /**
   * Configuration of the North Port of the IoT Agent.
   */
  server: {
    /**
     * Port where the IoT Agent will be listening for NGSI and provisioning requests.
     */
    port: process.env.IOTA_NORTH_PORT || '4081',
  },
  /**
   * Defines the configuration for the Device Registry, where all the information about devices and configuration
   * groups will be stored. There are currently just two types of registries allowed:
   *
   * - 'memory': transient memory-based repository for testing purposes. All the information in the repository is
   *             wiped out when the process is restarted.
   *
   * - 'mongodb': persistent MongoDB storage repository. All the details for the MongoDB configuration will be read
   *             from the 'mongodb' configuration property.
   */
  deviceRegistry: {
    type: process.env.IOTA_REGISTRY_TYPE || 'mongodb',
    /**
     * Mongo DB configuration. This section will only be used if the deviceRegistry is 'mongodb'.
     */
  },
  mongodb: {
    /**
     * Host where the MongoDB instance is located.
     */
    host: process.env.IOTA_MONGO_HOST || 'localhost',
    /**
     * Port where the MongoDB instance is listening.
     */
    port: process.env.IOTA_MONGO_PORT || '27017',
    /**
     * Name of MongoDB where the IoT Agent data will be stored.
     */
    db: process.env.IOTA_MONGO_DB || 'iotagentopcua',
  },
  /**
   *  Types array for static configuration of services. Check documentation in the IoTAgent Library for Node.js for
   *  further details:
   *
   *      https://github.com/telefonicaid/iotagent-node-lib#type-configuration
   */
  types: {},
  /**
   * Default service, for IoT Agent installations that won't require preregistration.
   */
  service: 'howtoService',
  /**
   * Default subservice, for IoT Agent installations that won't require preregistration.
   */
  subservice: '/howto',
  /**
   * URL Where the IoT Agent Will listen for incoming updateContext and queryContext requests (for commands and
   * passive attributes). This URL will be sent in the Context Registration requests.
   */
  providerUrl: process.env.IOTA_PROVIDER_URL || 'http://localhost:4081',
  /**
   * Default maximum expire date for device registrations.
   */
  deviceRegistrationDuration: 'P20Y',
  /**
   * Default type, for IoT Agent installations that won't require preregistration.
   */
  defaultType: 'Thing',
  /**
   * Default resource of the IoT Agent. This value must be different for every IoT Agent connecting to the IoT
   * Manager.
   */
  defaultResource: '/iot/opcua',
};

module.exports = config;
