"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const zod_1 = require("zod");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.flatten() });
        return;
    }
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.js.map