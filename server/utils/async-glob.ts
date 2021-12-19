const glob = require('glob');

module.exports = (...args) => new Promise((resolve, reject) =>
    glob(...args, (err, files) => err ? reject(err) : resolve(files))
);