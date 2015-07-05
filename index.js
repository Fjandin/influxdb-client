"use strict";

var lodash = require("lodash");
var request = require("./lib/request.js");

// Constructor
var InfluxdbClient = function InfluxConnector(options) {
    // Store options
    this.options = lodash.extend({
        host: "127.0.0.1",
        port: 8086,
        protocol: "http",
        database: null,
        user: null,
        password: null,
        retentionPolicy: null,
        useClientTimestamp: false
    }, options);

    // Store http options template
    this.optionsHttp = {
        host: this.options.host,
        port: this.options.port,
        protocol: this.options.protocol + ":"
    };

    // Set auth to http options if defined
    if (this.options.user && this.options.password) {
        this.optionsHttp.auth = [this.options.user, this.options.password].join(":");
    }
};

// Write raw
InfluxdbClient.prototype.writeRaw = function writeRaw(body, database, retentionPolicy) {
    var options;

    // Retention policy to use
    retentionPolicy = retentionPolicy || this.options.retentionPolicy || "";

    // Http request options
    options = lodash.extend({
        method: "POST",
        path: "/write?db=" + (database || this.options.database) + (retentionPolicy ? "&rp=" + retentionPolicy : "")
    }, this.optionsHttp);

    // Do request and return promise
    return request(options, body);
};

// Parse data point
InfluxdbClient.prototype.parse = function parse(name, values, tags, timestamp) {
    var body;

    // Add name and tags to body
    body = [encodeURIComponent(name)];

    // Add tags to body
    body.push(lodash.map(tags || {}, function(v, k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(v);
    }).join(","));

    // comma join name and tags
    body = [body.join(",")];

    // Make sure values is an object (default to value)
    if (typeof (values) !== "object") {
        values = {value: values};
    }

    // Add values to body
    body.push(lodash.map(values || {}, function(v, k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(v);
    }).join(","));

    // Add timestamp if set
    if (timestamp) {
        body.push(timestamp);
    // Add client timestamp if options it set
    } else if (this.options.useClientTimestamp) {
        body.push(Date.now());
    }

    // Make array and remove double space
    body = body.join(" ").replace(/\s{2,}/g, " ");

    return body;
};

// Write series data point to Influxdb
InfluxdbClient.prototype.write = function write(name, values, tags, timestamp, options) {
    var body;

    // Check if timestamp/options is set
    if (typeof (timestamp) === "object") {
        options = timestamp;
        timestamp = undefined;
    }

    // Make sure options is an object
    options = options || {};

    // Parse data point
    body = this.parse(name, values, tags, timestamp);

    // Do request and return promise
    return this.writeRaw(body, options.database, options.retentionPolicy);
};

// Query influxdb
InfluxdbClient.prototype.query = function query(ql, database) {
    var options;

    // Http request options
    options = lodash.extend({
        method: "GET",
        path: "/query?db=" + (database || this.options.database) + "&q=" + encodeURIComponent(ql)
    }, this.optionsHttp);

    // Do request and return promise
    return request(options);
};

// Static method to create instance
InfluxdbClient.create = function create(options) {
    return new InfluxdbClient(options);
};

module.exports = InfluxdbClient;
