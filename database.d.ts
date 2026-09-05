export declare function createDatabase(path: string): {
    db: any;
    getUserByAccountId: (accountId: string) => any;
    getUserById: (id: number) => any;
    createUser: (accountId: string, username: string, email: string, passwordHash: string) => any;
    updateUserLastLogin: (id: number) => any;
    getProfileByAccountId: (accountId: string) => any;
    createProfile: (accountId: string, data: string) => any;
    updateProfile: (accountId: string, data: string) => any;
    createMMTicket: (accountId: string, ticketData: string) => any;
    getMMTicket: (ticketId: string) => any;
    updateMMTicketStatus: (ticketId: string, status: string) => any;
    setShopRotation: (season: number, items: string) => any;
    getShopRotation: (season: number) => any;
    close: () => any;
};
