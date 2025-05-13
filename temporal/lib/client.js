"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemporalClient = getTemporalClient;
const client_1 = require("@temporalio/client");
const client = makeClient();
function makeClient() {
    const connection = client_1.Connection.lazy({
        address: 'localhost:7233',
        // In production, pass options to configure TLS and other settings.
    });
    return new client_1.Client({ connection });
}
function getTemporalClient() {
    return client;
}
//# sourceMappingURL=client.js.map