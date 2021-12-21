const defaultEditorValue = `
#include <cstdio>
int main() {
    printf("Hello, world!");
    return 0;
}
`.slice(1,-1);

const editor = { current: null };

export default editor;

require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });
require(['vs/editor/editor.main'], function () {
    editor.current = monaco.editor.create(document.querySelector('#editor-container'), {
        // automaticLayout: true,
        value: defaultEditorValue,
        language: 'cpp'
    });
    
    editor.current.layout();
});
