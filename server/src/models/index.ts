import { Request } from "express";

export interface UserContext {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface User extends UserContext {}
  }
}

export interface AuthenticatedRequest extends Request {
  user?: UserContext;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: any;
}
