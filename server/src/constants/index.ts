export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  CUSTOMER: "customer"
};

export const BOOTH_STATUS = {
  AVAILABLE: "available",
  RENTED: "rented",
  MAINTENANCE: "maintenance"
};

export const CONTRACT_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  TERMINATED: "terminated"
};

export const INVOICE_STATUS = {
  UNPAID: "unpaid",
  PAID: "paid",
  OVERDUE: "overdue"
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed"
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
  VNPAY: "vnpay",
  MOMO: "momo",
  QR_CODE: "qr_code"
};
