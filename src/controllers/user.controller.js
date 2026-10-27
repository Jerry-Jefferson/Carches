const userService = require("../services/user.service");
const catchAsync = require("../utils/catchAsync");

const getAll = catchAsync(async (req, res) => {
  const users = await userService.getAll();
  res.status(200).json({
    message: "Successfully retrieved all users",
    data: users,
  });
});

const getMe = (req, res) => {
  res.status(200).json({
    message: "Successfully retrieved profile",
    data: req.user,
  });
};

const getById = catchAsync(async (req, res) => {
  const user = await userService.getById(req.params.id);
  res.status(200).json({
    message: "Successfully retrieved user",
    data: user,
  });
});

const update = catchAsync(async (req, res) => {
  const updatedUser = await userService.update(req.params.id, req.body);
  res.status(200).json({
    message: "User successfully updated",
    data: updatedUser,
  });
});

const deleteById = catchAsync(async (req, res) => {
  await userService.deleteById(req.params.id);
  res.sendStatus(204);
});

module.exports = {
  getAll,
  getMe,
  getById,
  update,
  deleteById,
};
