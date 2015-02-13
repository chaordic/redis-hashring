var RedisRing = require("../lib");

var redisRing = new RedisRing([
    {host: "localhost", port: "6379"},
    {host: "localhost", port: "7777"}
]);

redisRing.set("a", "b").
    then(function(value) {
        console.log("resolve", value);
    }, function(reason) {
        console.log("reject", reason);
    });

redisRing.set("x", "y").
    then(function(value) {
        console.log("resolve", value);
    }, function(reason) {
        console.log("reject", reason);
    });

redisRing.hincrby("ctr", "impressions", 1).
    then(function(value) {
        console.log("resolve", value);
    }, function(reason) {
        console.log("reject", reason);
    });