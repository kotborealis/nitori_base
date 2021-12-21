import apiUrl from "./api.js";

const Sandbox = {
    id: null,
};

export default Sandbox;

(async () => {
    Sandbox.id = window.location.hash.slice(1);
    if(!Sandbox.id) {
        const res = await fetch(`${apiUrl}/sandbox/`, {method: "POST"});
        Sandbox.id = (await res.json()).id;
    }
    
    const terminal = new Terminal();
    const socket = new WebSocket(`${window.location.protocol === `https:` ? `wss` : `ws`}://${window.location.host}/sandbox/sandbox/ws/${Sandbox.id}`);
    const attachAddon = new AttachAddon.AttachAddon(socket);
    const fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(attachAddon);
    terminal.loadAddon(fitAddon);
    terminal.open(document.querySelector("#terminal"));
    new ResizeObserver(() => fitAddon.fit()).observe(document.querySelector("#terminal"));
})();
