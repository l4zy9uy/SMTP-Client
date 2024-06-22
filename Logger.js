const colorRef = require("./colorReference");
module.exports.info = function (message) {
    console.log(colorRef.FgGreen + message + colorRef.Reset);
};