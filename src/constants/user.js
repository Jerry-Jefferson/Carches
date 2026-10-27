const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
};

const USER_ROLE_LIST = Object.values(USER_ROLES);

const ROLE_LEVELS = Object.freeze({
  [USER_ROLES.USER]: 1,
  [USER_ROLES.ADMIN]: 2,
});

module.exports = { USER_ROLES, USER_ROLE_LIST, ROLE_LEVELS };
