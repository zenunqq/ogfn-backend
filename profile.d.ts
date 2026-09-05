import { FastifyInstance } from "fastify";
declare module "fastify" {
    interface FastifyRequest {
        user?: {
            accountId: string;
            username: string;
        };
    }
}
export declare function profileRoutes(fastify: FastifyInstance, dbInstance: any): Promise<void>;
