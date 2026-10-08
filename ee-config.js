window.EE_TESTNET = new URLSearchParams(location.search).has("testnet");
const EE_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
window.EE_RELAY = window.EE_TESTNET ? "http://127.0.0.1:8789" : EE_LOCAL ? "http://127.0.0.1:8788" : "https://relay.remi.gg";
