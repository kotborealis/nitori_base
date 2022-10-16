export const pathname = window.location.pathname.split('/').filter(id => id).slice(0,-1).join('/');
export const host = window.location.host;
export const protocolHttp = window.location.protocol;
export const protocolWs = window.location.protocol === `https:` ? `wss:` : `ws:`;

export const httpApiUrl = `${protocolHttp}//${host}${pathname}`;
export const wsApiUrl = `${protocolWs}//${host}${pathname}`;

console.log({httpApiUrl, wsApiUrl})
