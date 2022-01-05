import { httpApiUrl, wsApiUrl } from "./api.js";
import { storeInHash, loadFromHash } from "./hashStorage.js";

const Sandbox = {
    id: null,
};

export default Sandbox;

(async () => {
    let {sandboxId = null} = loadFromHash();
    if(!sandboxId) {
        const res = await fetch(`${httpApiUrl}/sandbox/`, {method: "POST"});
        sandboxId = (await res.json()).id;
        storeInHash({sandboxId});
    }
    Sandbox.id = sandboxId;
    
    const terminal = new Terminal();
    const socket = new WebSocket(`${wsApiUrl}/sandbox/ws/${Sandbox.id}`);
    const attachAddon = new AttachAddon.AttachAddon(socket);
    const fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(attachAddon);
    terminal.loadAddon(fitAddon);
    terminal.open(document.querySelector("#terminal"));
    new ResizeObserver(() => fitAddon.fit()).observe(document.querySelector("#terminal"));
})();
