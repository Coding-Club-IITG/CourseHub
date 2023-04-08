import jwt from "jsonwebtoken";
export class JWT {
  static generateJWT(userId: string, userEmail: string): string {
    const signed = jwt.sign({ id: userId, email: userEmail }, process.env.JWT_SECRET!);
    return signed;
  }
  static verifyJWT(token: string): { id: string; email: string } {
    const verified = jwt.verify(token, process.env.JWT_SECRET!);
    return verified as { id: string; email: string };
  }
}
