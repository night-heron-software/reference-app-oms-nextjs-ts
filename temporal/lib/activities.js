"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchase = purchase;
const activity_1 = require("@temporalio/activity");
async function purchase(id) {
    console.log(`Purchased ${id}!`);
    return (0, activity_1.activityInfo)().activityId;
}
//# sourceMappingURL=activities.js.map