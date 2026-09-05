export interface JwtPayload {
    accountId: string;
    username: string;
    iat?: number;
    exp?: number;
}
export declare function generateToken(accountId: string, username: string): string;
export declare function verifyToken(token: string): JwtPayload;
export declare function authMiddleware(request: any, response: any, next: any): any;
export declare function optionalAuthMiddleware(request: any, response: any, next: any): any;
