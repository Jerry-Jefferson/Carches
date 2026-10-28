const AppError = require("../utils/AppError");
const { USER_ROLES, ROLE_LEVELS } = require("../constants/user");

const requireRole = (minimumRole) => {
  const requiredLevel = ROLE_LEVELS[minimumRole];

  if (!requiredLevel) {
    throw new Error(`requireRole: unknown role "${minimumRole}"`);
  }

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const userLevel = ROLE_LEVELS[req.user.role] ?? 0;

    if (userLevel < requiredLevel) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    return next();
  };
};

const requireUser = requireRole(USER_ROLES.USER);
const requireAdmin = requireRole(USER_ROLES.ADMIN);

module.exports = { requireRole, requireUser, requireAdmin };
