var Annulus = require("../lib");

var annulus = new Annulus([
    {host: "localhost", port: "6379"},
    {host: "localhost", port: "7777"}
]);

annulus.set("a", "b").
    then(function(value) {
        console.log("resolve", value);
    }, function(reason) {
        console.log("reject", reason);
    });

annulus.set("x", "y").
    then(function(value) {
        console.log("resolve", value);
    }, function(reason) {
        console.log("reject", reason);
    });

annulus.hincrby("ctr", "impressions", 1).
    then(function(value) {
        console.log("resolve", value);
    }, function(reason) {
        console.log("reject", reason);
    });