"use strict";

var http = require("http");
var Bluebird = require("bluebird");

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

                // Reject if statusCode is not 2XX
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    // Add status code and headers
                    reject(new Error(res.statusCode + ": " + (responseBody || "undefined")));
                } else {
                    // Add status code and headers
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseBody
                    });
                }
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

module.exports = request;
