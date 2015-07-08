"use strict";

var lodash = require("lodash");
var request = require("./lib/request.js");

// Check if var is numeric
var stringIsNumeric = function stringIsNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

// Check if var is boolean
var stringIsBoolean = function stringIsBoolean(b) {
    return !!b.match(/^(?:t|T|true|True|TRUE|f|F|false|False|FALSE)$/);
};

// Helper to parse response from influxdb
var influxdbResponseParse = function influxdbResponseParse(response) {
    var series = (((response.body || {}).results || [])[0] || {}).series || [];
    return series.map(function(serie) {
        return {
            name: serie.name,
            tags: serie.tags || {},
            columns: serie.columns || [],
            values: (serie.values || []).map(function(value) {
                var row = {};
                (serie.columns || []).forEach(function(column, index) {
                    row[column] = value[index];
                });
                // time to timestamp
                if (row.time) {
                    row.time = (new Date(row.time)).getTime();
                }
                return row;
            })
        };
    });
};

// Helper to escape/wrap names, tags and values
var influxdbValueEscape = function influxdbValueEscape(val, isValue) {
    // Stringify
    val = (val || "").toString();
    // Wrap in quotes
    val = val.replace(/(,|\s)/g, "\\$1");
    // wrap strings in double quotes
    if (isValue && !stringIsNumeric(val) && !stringIsBoolean(val)) {
        val = "\"" + val + "\"";
    }
    return val;
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

// Parse data point to influxdb line protocol
InfluxdbClient.prototype.parse = function parse(name, values, tags, time) {
    var body;

    // Validate
    if (!name || typeof name !== "string") {
        throw new Error("[influxdb-client] name must be a string");
    } else if (tags && !lodash.isObject(tags)) {
        throw new Error("[influxdb-client] tags must be an object");
    } else if (time && typeof time !== "number") {
        throw new Error("[influxdb-client] time must be a number");
    }
    // TODO! Add more validation

    // Add name and tags to body
    body = [influxdbValueEscape(name)];

    // Add tags to body
    body.push(lodash.map(tags || {}, function(v, k) {
        return influxdbValueEscape(k) + "=" + influxdbValueEscape(v);
    }).join(","));

    // comma join name and tags
    body = [body.join(",")];

    // Make sure values is an object. If plain object treat as field "value"
    if (typeof (values) !== "object") {
        values = {value: values};
    }

    // Add values to body
    body.push(lodash.map(values || {}, function(v, k) {
        return influxdbValueEscape(k) + "=" + influxdbValueEscape(v, true);
    }).join(","));

    // Add timestamp if set (We expect a js timestamp (ms))
    if (time) {
        body.push(time * 1000000);
    // Add client timestamp if options it set
    } else if (this.options.useClientTimestamp) {
        body.push(Date.now() * 1000000);
    }

    // Make array and remove possible double spaces
    body = body.join(" ").replace(/\s{2,}/g, " ");

    return body;
};

// Write series data point to Influxdb
InfluxdbClient.prototype.write = function write(name, values, tags, time, options) {
    var body;

    // Check if timestamp/options is set
    if (typeof (time) === "object") {
        options = time;
        time = undefined;
    }

    // Make sure options is an object
    options = options || {};

    // Parse data point
    body = this.parse(name, values, tags, time);

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
    return request(options).then(influxdbResponseParse);
};

// Static method to create instance
InfluxdbClient.create = function create(options) {
    return new InfluxdbClient(options);
};

module.exports = InfluxdbClient;
