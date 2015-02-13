var crypto = require("crypto");

var md5 = function(k) {
    var hash = crypto.createHash('md5');
    hash.update(k);
    return hash.digest("hex");
};

module.exports = md5;