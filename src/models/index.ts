import { sequelize } from "../config/database";
import { User } from "./User";
import { RateSnapshot } from "./RateSnapshot";
import { Quote } from "./Quote";
import { TransferRequest } from "./TransferRequest";

User.hasMany(Quote, { foreignKey: "userId", as: "quotes" });
Quote.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(TransferRequest, {
  foreignKey: "userId",
  as: "transferRequests",
});
TransferRequest.belongsTo(User, { foreignKey: "userId", as: "user" });

RateSnapshot.hasMany(Quote, {
  foreignKey: "rateSnapshotId",
  as: "quotes",
});
Quote.belongsTo(RateSnapshot, {
  foreignKey: "rateSnapshotId",
  as: "rateSnapshot",
});

Quote.hasOne(TransferRequest, {
  foreignKey: "quoteId",
  as: "transferRequest",
});
TransferRequest.belongsTo(Quote, { foreignKey: "quoteId", as: "quote" });

export { sequelize, User, RateSnapshot, Quote, TransferRequest };
