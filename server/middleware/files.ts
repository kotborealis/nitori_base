export {};

function fileSizesValid(files) {
    return files.map(({truncated}) => truncated).every(i => !i);
}

const files = (limits, minFiles = -Infinity, maxFiles = Infinity) => function(req, res, next) {
    if(!fileSizesValid(req.files)){
        const err = new Error(`All files must be smaller than ${limits.fileSize} bytes`);
        (err as any).status = 400;
        next(err);
        return;
    }

    if(
        (minFiles !== -Infinity && req.files.length < minFiles)
        ||
        (maxFiles !== Infinity && req.files.length > maxFiles)
    ){
        const err = new Error(`${minFiles}--${maxFiles} files must be specified, got ${req.files.length}`);
        (err as any).status = 400;
        next(err);
        return;
    }

    if(!req.files){
        const err = new Error(`No files specified, but ${minFiles}--${maxFiles} files required`);
        (err as any).status = 400;
        next(err);
        return;
    }

    req.files = req.files
        .map(({
                  originalname: name,
                  buffer: content,
                  mimetype: content_type
              }) => ({
            name, content, content_type
        }));

    next();
};

module.exports = {filesMiddleware: files};