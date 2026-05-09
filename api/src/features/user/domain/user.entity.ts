export type User = {
  id: string;
  companyName: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  email: string;
  emailVerifiedAt: Date | null;
};
