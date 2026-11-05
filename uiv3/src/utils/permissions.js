// src/utils/permissions.js
// The server decides what an account may do. The screens only hide what the account cannot use.
export const can = (user, permission) => Boolean(user?.permissions?.includes(permission));
export const isAdmin = (user) => user?.role === "admin";
