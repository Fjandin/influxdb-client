# influxdb-client
A very simple NodeJS connector for influxdb 0.9

For more information on influxdb please visit https://influxdb.com/

## Usage
### Create a client
```
var InfluxdbClient = require("influxdb-client");

var client = InfluxdbClient.create({
    host: "127.0.0.1",  
    port: 8086,
    protocol: "http",           // Currently only http is supported
    database: null,             // Default database
    user: null,
    password: null,
    retentionPolicy: null,      // Default retention policy
    userClientTimestamp: false
});
```
### Run a query
```
client.query("SHOW SERIES;")
    .then(function(response) {
        console.log(response.statusCode, response.headers, response.body);
    })
    .catch(function(err) {
        console.warn(err);
    });
```
### Write data

client.write(name, values*[, tags, database, retentionPolicy]*)

**values** can be an object `{columnname: value ...}` or other then `{value: values}` is assumed.
```
client.write("name", {value: 10, someothervalue:5}, {tag: "one", someothertag, "two"}, "database", "retentionPolicy")
    .then(function(response) {
        console.log(response.statusCode);
    })
    .catch(function(err) {
        console.warn(err);
    });
```
