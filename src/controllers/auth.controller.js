const authService = require("../services/auth.service");
const catchAsync = require("../utils/catchAsync");

const signUp = catchAsync(async (req, res) => {
  const { user, token } = await authService.signUp(req.body);
  res.status(201).json({
    message: "User successfully registered",
    data: { user, token },
  });
});

const signIn = catchAsync(async (req, res) => {
  const { user, token } = await authService.signIn(req.body);
  res.status(200).json({
    message: "Successfully signed in",
    data: { user, token },
  });
});

module.exports = {
  signUp,
  signIn,
};
