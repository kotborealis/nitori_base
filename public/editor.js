import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { storeInHash, loadFromHash } from "./hashStorage.js";
import {wsApiUrl, httpApiUrl} from './api.js';

const editor = { current: null, id: null };

export default editor;

require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs', lib0: '../node_modules/lib0/dist' } });

require(['vs/editor/editor.main'], function () {
    (async () => {
        let {editorId = null} = loadFromHash();
        if(!editorId) {
            const res = await fetch(`${httpApiUrl}/editor/`, {method: "POST"});
            editorId = (await res.json()).id;
            storeInHash({editorId});
        }
        editor.id = editorId;
    
        const ydocument = new Y.Doc();
        const provider = new WebsocketProvider(`${wsApiUrl}/editor/ws`, editor.id, ydocument);
        const type = ydocument.getText('monaco');

        editor.current = monaco.editor.create(document.querySelector('#editor-container'), {
            // automaticLayout: true,
            value: ``,
            language: 'cpp'
        });
        
        editor.current.layout();    

        const monacoBinding = new MonacoBinding(type, editor.current.getModel(), new Set([editor.current]), provider.awareness);
        provider.connect();

    })();    
});
