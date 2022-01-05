const loadFromHash = () => {
    try {
        return JSON.parse(decodeURI(window.location.hash).slice(1));
    } catch(e) {
        return {};
    }
}

const storeInHash = (data) => 
    window.location.hash = JSON.stringify({
        ...loadFromHash(),
        ...data
    });

export {storeInHash, loadFromHash};