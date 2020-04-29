const request = require('request');

function removeDevice(baseUrl, deviceId, service, servicePath, cb) {
  const options = {
    url: `${baseUrl}/iot/devices/${deviceId}`,
    method: 'DELETE',
    json: true,
    headers: {
      'fiware-service': service,
      'fiware-servicepath': servicePath,
    },
  };

  request(options, err => {
    if (err) {
      console.log(err); // eslint-disable-line no-console
    }
    return cb();
  });
}

function removeEntity(baseUrl, entityId, service, servicePath, cb) {
  const options = {
    url: `${baseUrl}/v2/entities/${entityId}`,
    method: 'DELETE',
    json: true,
    headers: {
      'fiware-service': service,
      'fiware-servicepath': servicePath,
    },
  };

  request(options, err => {
    if (err) {
      console.log(err); // eslint-disable-line no-console
    }
    return cb();
  });
}

module.exports = {
  removeDevice,
  removeEntity,
};
