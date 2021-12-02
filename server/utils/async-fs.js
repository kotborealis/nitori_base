const {promisify} = require('util');
const fs = require('fs');

class async_fs {
    static readFile(...args) {
        return promisify(fs.readFile)(...args);
    }
}

module.exports = {fs: async_fs};