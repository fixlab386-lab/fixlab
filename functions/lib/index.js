"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveClientToStudio = exports.onMembershipClaimsSync = exports.syncStudioClaims = exports.revertStockMovement = exports.commitStockMovement = exports.commitDocument = void 0;
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var commitDocument_1 = require("./commitDocument");
Object.defineProperty(exports, "commitDocument", { enumerable: true, get: function () { return commitDocument_1.commitDocument; } });
var commitStockMovement_1 = require("./commitStockMovement");
Object.defineProperty(exports, "commitStockMovement", { enumerable: true, get: function () { return commitStockMovement_1.commitStockMovement; } });
Object.defineProperty(exports, "revertStockMovement", { enumerable: true, get: function () { return commitStockMovement_1.revertStockMovement; } });
var syncStudioClaims_1 = require("./syncStudioClaims");
Object.defineProperty(exports, "syncStudioClaims", { enumerable: true, get: function () { return syncStudioClaims_1.syncStudioClaims; } });
Object.defineProperty(exports, "onMembershipClaimsSync", { enumerable: true, get: function () { return syncStudioClaims_1.onMembershipClaimsSync; } });
var moveClientToStudio_1 = require("./moveClientToStudio");
Object.defineProperty(exports, "moveClientToStudio", { enumerable: true, get: function () { return moveClientToStudio_1.moveClientToStudio; } });
//# sourceMappingURL=index.js.map