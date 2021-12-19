export {};

require('winston-syslog');
const {createLogger, format, transports} = require('winston');
const {combine, timestamp, json, errors, prettyPrint} = format;
const {Syslog, Console} = transports;
const {levels: SyslogLevels} = require('winston').config.syslog;

let config;
const init = (config_) => config = config_;

//noinspection JSValidateJSDoc
/**
 *
 * @param {string} service
 * @returns {winston.Logger}
 */
const logger = (service) =>
    createLogger({
        level: 'debug',
        levels: SyslogLevels,
        transports: generateTransports(config.logging.transports, config)
    });

/**
 * Map of names and supported transports
 * @type {{console: (function(): *), syslog: (function({logging?: *}): *)}}
 */
const transportMap = {
    console: (_, format) => new Console({format}),
    syslog: ({logging: {syslog}}, format) => new Syslog({...syslog, format})
};

/**
 * Map of names and transport formats
 * @type {{console: (function(): *), syslog: (function({logging?: *}): *)}}
 */
const transportFormatMap = {
    console: combine(
        format.splat(),
        timestamp({
            format: `YYYY-MM-DDTHH:mm:ss.SSSSSSSSSZ`
        }),
        errors({stack: true}),
        format.colorize(),
        format.simple(),
    ),
    syslog: combine(
        format.splat(),
        timestamp({
            format: `YYYY-MM-DDTHH:mm:ss.SSSSSSSSSZ`
        }),
        errors({stack: true}),
        json()
    )
};

/**
 * Generate transports from names and config
 * @param names
 * @param config
 * @returns {*[]}
 */
const generateTransports = (names, config) =>
    names
        .filter(name =>
            transportMap.hasOwnProperty(name)
            || console.warn(`Transport ${name} is not supported. Supported: ${Object.keys(transportMap)}`)
        )
        .map(name => transportMap[name](config, transportFormatMap[name]));

module.exports = {logger, init};