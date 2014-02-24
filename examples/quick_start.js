var RedisHashring = require("../lib/redis_hashring");

var redisHashring = new RedisHashring();

redisHashring.initialize(["localhost", "localhost:7777"]);

redisHashring.ready(function() {
    var key = "somekey",
        key2 = "otherkey";

    redisHashring.set(key, "Value", function(err, val) {
        redisHashring.get(key, function(err, val) {
            console.log(err, val);
        })
    });

    redisHashring.set(key2, "Value2", function(err, val) {
        redisHashring.get(key2, function(err, val) {
            console.log(err, val);
        })
    });

});
