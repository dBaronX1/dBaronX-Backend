import { Request, Response, NextFunction } from 'express';

export class RequestLoggerMiddleware {
    public static logRequest(req: Request, res: Response, next: NextFunction): void {
        console.log(`${req.method} ${req.originalUrl}`);
        next();
    }
}