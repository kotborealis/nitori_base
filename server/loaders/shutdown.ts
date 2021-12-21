export {};

const {Sandbox} = require('../Sandbox');
const {Docker} = require('node-docker-api');

module.exports = ({config}) => {
    const terminate = async () => {
	console.log("Terminating");
        try{
            const docker = new Docker(config.docker);
            await Sandbox.destroy_all(docker);
            process.exit(0);
        }
        catch(e){
            process.exit(1);
        }
    };

    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);
};
