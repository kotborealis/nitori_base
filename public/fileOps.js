import apiUrl from "./api.js";
import Sandbox from "./sandbox.js";
import editor from "./editor.js";

const setFileUploadDisabled = value => {
    document.querySelector("#fileUploadSubmit").disabled = value;
    document.querySelector("#fileUploadInput").disabled = value;
}

const setFileOpsDisabled = value => {
    document.querySelector("#fileOpsPath").disabled = value;
    document.querySelector("#fileOpsSave").disabled = value;
    document.querySelector("#fileOpsOpen").disabled = value;
}

document.querySelector("#fileUpload").addEventListener('submit', async e => {
    e.preventDefault();

    setFileUploadDisabled(true);

    const body = new FormData();

    for (const file of document.querySelector("#fileUploadInput").files)
        body.append('files', file, file.name);

    const user = document.querySelector("#fileUploadUser").value;

    const res = await fetch(`${apiUrl}/sandbox/${Sandbox.id}/upload/${user}`, {method: "POST", body});

    setFileUploadDisabled(false);
});

document.querySelector("#fileOps").addEventListener('submit', async e => {
    e.preventDefault();
});

document.querySelector("#fileOps").addEventListener('submit', e => e.preventDefault());

document.querySelector("#fileOpsSave").addEventListener('click', async e => {

    setFileOpsDisabled(true);

    const content = new Blob([editor.current.getValue()], {
        type: 'text/plain'
    });

    const body = new FormData();
    body.append('files', content, document.querySelector("#fileOpsPath").value);

    const user = document.querySelector("#fileUploadUser").value;

    await fetch(`${apiUrl}/sandbox/${Sandbox.id}/upload/${user}`, {method: "POST", body});

    setFileOpsDisabled(false);
});

document.querySelector("#fileOpsOpen").addEventListener('click', async e => {

    setFileOpsDisabled(true);

    const path = document.querySelector("#fileOpsPath").value;

    const res = await fetch(`${apiUrl}/sandbox/${Sandbox.id}/download`, {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path})}
    );

    const data = await res.json();
    const file = data.files[0];
    editor.current.setValue(file.content);

    setFileOpsDisabled(false);
});