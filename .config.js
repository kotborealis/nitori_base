require('chen.js').env();

module.exports = {
    api: {
        port: process.env.API_PORT || 3000,
        limits: {
            fileSize: process.env.API_LIMITS_FILESIZE || (1024 * 10)
        }
    },
    docker: process.env.DOCKER ? JSON.parse(process.env.DOCKER) : {
        socketPath: '/var/run/docker.sock'
    },
    container: {
        Image: "nitori_sandbox",
        Tty: true,
        StopTimeout: 600,
        WorkingDir: "/sandbox",
        NetworkDisabled: true,
        HostConfig: {
            Memory: 1024 * 1024 * 1000,
            DiskQuota: 1024 * 1024 * 100,
            OomKillDisable: false,
        },
        imageContextPath: process.env.CONTAINER_IMAGE_CONTEXT_PATH || "./sandbox/"
    },
    sandbox: {
        container_prefix: "nitori-sandbox-",
        std_version: "c++2a",
        working_dir: "/sandbox/"
    },
    testing: {
        libs: "/opt/testing_libs",
        hijack_main: "__NITORI_HIJACK_MAIN__",
        hijack_exit: "__NITORI_HIJACK_EXIT__",
        test_archive_name: "__nitori_test.a"
    },
    timeout: {
        compilation: 1000 * 60,
        precompilation: 0,
        run: 1000 * 10
    },
    logging: {
        transports:
            (process.env.LOGGING_TRANSPORTS || 'syslog,console')
                .split(',').filter(i => i),
        syslog: {
            host: process.env.LOGGING_SYSLOG_HOST || 'vector',
            port: process.env.LOGGING_SYSLOG_PORT || 513,
            protocol: 'udp4'
        }
    }
};