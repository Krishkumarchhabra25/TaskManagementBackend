export type UserRole = "admin" | "user";

export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    provider: "google" | "github" | "local";
    providerId?: string | null;
    role: UserRole;
    setupComplete: boolean;
    createdAt: Date;
    updatedAt: Date;
}
