import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    mobile: string;
    role: string;
    avatar?: string;
    isActive: boolean;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
export declare function signToken(userId: string): string;
//# sourceMappingURL=auth.d.ts.map