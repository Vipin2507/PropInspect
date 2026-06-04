"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./db/database");
const seed_1 = require("./db/seed");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const projects_1 = __importDefault(require("./routes/projects"));
const towers_1 = __importDefault(require("./routes/towers"));
const floors_1 = __importDefault(require("./routes/floors"));
const flats_1 = __importDefault(require("./routes/flats"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const checklists_1 = __importDefault(require("./routes/checklists"));
const inspections_1 = __importDefault(require("./routes/inspections"));
const responses_1 = __importDefault(require("./routes/responses"));
const snags_1 = __importDefault(require("./routes/snags"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const images_1 = __importDefault(require("./routes/images"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const reports_1 = __importDefault(require("./routes/reports"));
const sync_1 = __importDefault(require("./routes/sync"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4000', 10);
const UPLOADS_DIR = process.env.UPLOADS_DIR || path_1.default.join(__dirname, '../uploads');
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
(0, database_1.getDB)();
(0, seed_1.seedDatabase)();
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({ origin: CORS_ORIGIN, credentials: true }));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 500,
}));
app.use('/uploads', express_1.default.static(UPLOADS_DIR));
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'SnagDesk API' });
});
app.use('/api/auth', auth_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/towers', towers_1.default);
app.use('/api/floors', floors_1.default);
app.use('/api/flats', flats_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/templates', checklists_1.default);
app.use('/api/inspections', inspections_1.default);
app.use('/api/responses', responses_1.default);
app.use('/api/snags', snags_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/images', images_1.default);
app.use('/api/users', users_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/sync', sync_1.default);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`SnagDesk API running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map