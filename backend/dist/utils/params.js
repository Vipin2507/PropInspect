"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.param = param;
function param(req, key) {
    const value = req.params[key];
    if (Array.isArray(value))
        return value[0];
    return value;
}
//# sourceMappingURL=params.js.map