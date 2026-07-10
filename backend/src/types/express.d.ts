declare global {
  namespace Express {
    interface Request {
      plannerId: string;
    }
  }
}

export {};
