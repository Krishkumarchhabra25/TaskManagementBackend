export interface Invitation {
    id: string;
    organizationId: string;
    inviterId: string;
    email: string;
    token: string;
    status: "pending" | "accepted" | "declined";
    createdAt: Date;
    expiresAt: Date;
}
