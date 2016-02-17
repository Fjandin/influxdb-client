"use strict";

const _http = require("http");
const _https = require("https");

// Helper method to do http requests
const request = function request(options, body) {
    // Wrap http in bluebord promise and return
    return new Promise((resolve, reject) => {
        let httpLib = options.protocol === "https:" ? _https : _http;
        let req = httpLib.request(options, (res) => {
            let chunks = [];

            // Add chunks on data
            res.on("data", (chunk) => {
                chunks.push((chunk || "").toString("utf8"));
            });

            // Join chunks on end and make utf8 string
            res.on("end", () => {
                let responseBody = chunks.join("");

                // Reject if statusCode is not 2XX
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    // Add status code and headers
                    reject(new Error(res.statusCode + ": " + (responseBody || "undefined")));
                } else {
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
