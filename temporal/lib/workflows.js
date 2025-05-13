"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oneClickBuy = oneClickBuy;
const workflow_1 = require("@temporalio/workflow");
const { purchase } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '1 minute',
});
async function oneClickBuy(id) {
    const result = await purchase(id); // calling the activity
    await (0, workflow_1.sleep)('10 seconds'); // sleep to simulate a longer response.
    console.log(`Activity ID: ${result} executed!`);
    return result;
}
//# sourceMappingURL=workflows.js.map