import editor from "./editor.js";
import "./fileOps.js";
import "./sandbox.js";

window.onresize = () => editor.current?.layout();