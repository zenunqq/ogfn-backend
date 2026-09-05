"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
function generateToken(accountId, username) {
    return jsonwebtoken_1.default.sign({ accountId, username }, config_1.config.JWT_SECRET, {
        expiresIn: config_1.config.JWT_EXPIRES_IN
    });
}
function verifyToken(token) {
    if (!token.startsWith("bearer eg1~")) {
        const error = new Error("Invalid token format");
        error.name = "TokenFormatError";
        throw error;
    }
    const actualToken = token.replace("bearer eg1~", "");
    const decoded = jsonwebtoken_1.default.verify(actualToken, config_1.config.JWT_SECRET);
    if (!decoded.accountId) {
        const error = new Error("Invalid token payload: missing accountId");
        error.name = "TokenPayloadError";
        throw error;
    }
    return decoded;
}
function authMiddleware(request, response, next) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            response.code(401).send({ error: "Authorization header missing" });
            return;
        }
        const decoded = verifyToken(authHeader);
        request.user = decoded;
        next();
    }
    catch (error) {
        if (error.name === "TokenFormatError") {
            response.code(401).send({ error: "Invalid token format" });
        }
        else if (error.name === "TokenPayloadError") {
            response.code(401).send({ error: "Invalid token payload" });
        }
        else {
            response.code(401).send({ error: "Invalid or expired token" });
        }
    }
}
function optionalAuthMiddleware(request, response, next) {
    try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("bearer eg1~")) {
            const decoded = verifyToken(authHeader);
            request.user = decoded;
        }
        next();
    }
    catch (error) {
        // Continue without auth - optional
        next();
    }
}
