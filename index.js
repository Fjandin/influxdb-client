"use strict";

var http = require("http");
var Bluebird = require("bluebird");
var lodash = require("lodash");

// Helper method to do http requests
var request = function request(options, body) {
    // Wrap http in bluebord promise and return
    return new Bluebird(function(resolve, reject) {
        var req = http.request(options, function(res) {
            var chunks = [];

            // Add chunks on data
            res.on("data", chunks.push.bind(chunks));

            // Join chunks on end and make utf8 string
            res.on("end", function() {
                var responseBody = Buffer.concat(chunks).toString("utf8");
                // Check if response is JSON
                if (res.headers["content-type"] === "application/json") {
                    responseBody = JSON.parse(responseBody);
                }
                // Add status code and headers
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: responseBody
                });
            });
        });

        // Catch errors
        req.on("error", reject);

        // Write body (if any)
        if (body) {
            req.write(body);
        }

        // End request
        req.end();
    });
};

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
        userClientTimestamp: false
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

// Send data to influxdb
InfluxdbClient.prototype.write = function write(name, values, tags, database, retentionPolicy) {
    var options;
    var body;

    // Http request options
    options = lodash.extend({
        method: "POST",
        path: "/write?db=" + (database || this.options.database) + "&rp=" + (retentionPolicy || this.options.retentionPolicy || "")
    }, this.optionsHttp);

    // Add name and tags to body
    body = [name];

    // Add tags to body
    body.push(lodash.map(tags || {}, function(v, k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(v);
    }).join(","));

    // comma join name and tags
    body = [body.join(",")];

    // Make sure values is an object
    if (typeof (values) !== "object") {
        values = {value: values};
    }

    // Add values to body
    body.push(lodash.map(values || {}, function(v, k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(v);
    }).join(","));

    // Add timestamp if options it set
    if (this.options.userClientTimestamp) {
        body.push(Date().now);
    }

    // Make array and remove double space
    body = body.join(" ").replace(/\s{2,}/g, " ");

    // Do request and return promise
    return request(options, body);
};

// Query influxdb
InfluxdbClient.prototype.query = function query(sql, database) {
    var options;

    // Http request options
    options = lodash.extend({
        method: "GET",
        path: "/query?db=" + (database || this.options.database) + "&q=" + encodeURIComponent(sql)
    }, this.optionsHttp);

    // Do request and return promise
    return request(options);
};

// Static method to create instance
InfluxdbClient.create = function create(options) {
    return new InfluxdbClient(options);
};

module.exports = InfluxdbClient;
