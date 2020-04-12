const { MessageSecurityMode, SecurityPolicy } = require('node-opcua');

/**
 * Get OPC UA connection parameters from internal attributes received in device provisioning payload.
 *
 * @param {Object} internalAttributes Payload internal attributesp
 * @returns {Object | Error} OPC UA connection parameters or an array which contains found errors
 */
function getOPCUAconnectionParameters(internalAttributes) {
  const spectedParameters = {
    opcuaEndpoint: 'endpoint',
    opcuaSecurityMode: 'securityMode',
    opcuaSecurityPolicy: 'securityPolicy',
    opcuaCredentials: 'credentials',
  };
  const connectionParameters = {};
  const errors = [];

  // Check that all connection parameters are provided (except credentials which is optional)
  Object.keys(spectedParameters).forEach(attr => {
    if (!internalAttributes[attr] && attr !== 'opcuaCredentials') {
      errors.push(`${attr} was spected but it was not provided!`);
    } else {
      connectionParameters[spectedParameters[attr]] = internalAttributes[attr];
    }
  });

  // Check if securityMode is valid
  const possibleSecurityModes = Object.values(MessageSecurityMode);
  if (!possibleSecurityModes.includes(connectionParameters.securityMode)) {
    errors.push(
      `Security Mode provided is not valid. Possible values: ${possibleSecurityModes}`
    );
  }

  // Check if securityPolicy is valid
  const possibleSecurityPolicies = Object.keys(SecurityPolicy);
  if (!possibleSecurityPolicies.includes(connectionParameters.securityPolicy)) {
    errors.push(
      `Security Policy provided is not valid. Possible values: ${possibleSecurityPolicies}`
    );
  }

  // Check if credentials are provided, if the securityMode is 'Sign' or 'SignAndEncrypt'
  if (
    connectionParameters.securityMode === 'Sign' ||
    connectionParameters.securityMode === 'SignAndEncrypt'
  ) {
    if (!connectionParameters.credentials) {
      errors.push(
        `Security Mode was ${connectionParameters.securityMode} but credentials were not provided!`
      );
    } else {
      if (!connectionParameters.credentials.userName) {
        errors.push('credentials object has not key "userName"');
      }
      if (!connectionParameters.credentials.password) {
        errors.push('credentials object has not key "password"');
      }
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  return connectionParameters;
}

module.exports = {
  getOPCUAconnectionParameters,
};
