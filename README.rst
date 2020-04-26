================
OPC UA IoT Agent
================
Bridge between the NGSI and OPC UA protocols. This agent allows the
communication with a device that implements an OPC UA server, making possible
to read data and dump it to the Orion Context Broker as well as sending
commands to the device.


**Warning:** this is not the official OPC UA IoT Agent of the FIWARE catalog.
The official can be found here_.

.. _here: https://github.com/Engineering-Research-and-Development/iotagent-opcua

Contents
========
* Background_
* Features_
* Install_
* Usage_


.. _Background:

Background
==========

.. _Features:

Features
========

- [X] Create connection with OPC UA server dinamically via API
- [X] Load devices from registry
- [ ] Create devices from configuration file
- [X] Create devices via API
- [X] Attribute automatic update in Orion Context Broker (active attribute)
- [ ] Attribute request update from Orion Context Broker (lazy attribute)
- [ ] Execute method in OPC UA Server requested by Orion Context Broker

.. _Install:

Install
=======

.. _Usage:

Usage
=====

