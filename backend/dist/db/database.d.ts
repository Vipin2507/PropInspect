export interface SnagDeskDatabase {
    exec(sql: string): void;
    prepare(sql: string): {
        run: (...params: unknown[]) => void;
        get: (...params: unknown[]) => Record<string, unknown> | undefined;
        all: (...params: unknown[]) => Record<string, unknown>[];
    };
}
/** SQLite via Node built-in module (no native addon; works on Node 22.5+ / 24). */
export declare function getDB(): SnagDeskDatabase;
export declare function runMigrations(database: SnagDeskDatabase): void;
export declare function rowToUser(row: Record<string, unknown>): {
    id: unknown;
    name: unknown;
    email: unknown;
    mobile: unknown;
    role: unknown;
    avatar: {} | undefined;
    isActive: boolean;
    createdAt: unknown;
};
export declare function rowToProject(row: Record<string, unknown>): {
    id: unknown;
    name: unknown;
    location: unknown;
    developerName: unknown;
    totalTowers: number;
    status: unknown;
    createdBy: unknown;
    createdAt: unknown;
    updatedAt: unknown;
};
//# sourceMappingURL=database.d.ts.map