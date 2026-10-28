const User = require("../models/user.model");
const CreditCard = require("../models/creditCard.model");
const AppError = require("../utils/AppError");

// Fields that must never be set through the user endpoints:
// credentials and role are managed by the auth flow only.
const PROTECTED_UPDATE_FIELDS = ["password", "role"];

const notFound = () => new AppError("User not found", 404);

const omit = (data, keys) =>
  Object.fromEntries(Object.entries(data ?? {}).filter(([key]) => !keys.includes(key)));

const getAll = async () => {
  return await User.find({ isDeleted: false });
};

const getById = async (id) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) {
    throw notFound();
  }
  return user;
};

const update = async (id, updateData) => {
  const user = await User.findOneAndUpdate(
    { _id: id, isDeleted: false },
    omit(updateData, PROTECTED_UPDATE_FIELDS),
    { new: true, runValidators: true }
  );
  if (!user) {
    throw notFound();
  }
  return user;
};

const deleteById = async (id) => {
  const user = await User.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!user) {
    throw notFound();
  }

  await CreditCard.updateMany(
    { userId: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() }
  );

  return user;
};

module.exports = {
  getAll,
  getById,
  update,
  deleteById,
};
