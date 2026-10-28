const VEHICLE_STATUS = Object.freeze({
  FREE: "free",
  RESERVED: "reserved",
  IN_USE: "in_use",
  UNAVAILABLE: "unavailable",
  IN_SERVICE: "in_service",
});

const VEHICLE_STATUS_LIST = Object.values(VEHICLE_STATUS);

module.exports = { VEHICLE_STATUS, VEHICLE_STATUS_LIST };
