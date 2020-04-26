const request = require('request');
const { should, expect } = require('chai');
const config = require('../../config.js');

// Test payloads
const noInternalAttributes = require('../json/no_internal_attributes_device.json');
const noOpcuaConnectionParameters = require('../json/no_opcua_connection_parameters.json');
const noOpcuaEndpointParameter = require('../json/no_opcua_endpoint_parameter.json');
const noOpcuaSecurityPolicyParameter = require('../json/no_opcua_security_policy_parameter.json');
const noOpcuaSecurityModeParameter = require('../json/no_opcua_security_mode_parameter.json');

const host = 'localhost';
const { port } = config.iota.server;
const service = 'test';
const servicePath = '/';

const options = {
  url: `http://${host}:${port}/iot/devices`,
  method: 'POST',
  headers: {
    'fiware-service': service,
    'fiware-servicepath': servicePath,
  },
};

describe('Device provisioning API', function() {
  describe('When a device provisioning does not have internalAttributes', function() {
    it('should return a message with an error', function(done) {
      request(
        { ...options, ...{ json: noInternalAttributes } },
        (err, res, body) => {
          expect(body).have.property('message');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });
  });

  describe('When a device provisioning does not have OPC UA connection parameters', function() {
    it('should return a message indicating what are the missing parameters', function(done) {
      request(
        { ...options, ...{ json: noOpcuaConnectionParameters } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include("internalAttributes can't be empty");
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });
  });

  describe('When a device provisioning is missing some OPC UA connection parameter', function() {
    it('should return a message if OPC UA endpoint is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaEndpointParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('opcuaEndpoint was expected');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA security policy is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaSecurityPolicyParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('opcuaSecurityPolicy was expected');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });

    it('should return a message if OPC UA security mode is missing', function(done) {
      request(
        { ...options, ...{ json: noOpcuaSecurityModeParameter } },
        (err, res, body) => {
          expect(body).have.property('message');
          expect(body)
            .property('message')
            .to.include('opcuaSecurityMode was expected');
          should().not.exist(err);
          expect(res.statusCode).to.equal(500);
          done();
        }
      );
    });
  });
});
