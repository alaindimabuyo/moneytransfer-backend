import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database";

export type QuoteStatus = "active" | "expired" | "consumed";

export class Quote extends Model<
  InferAttributes<Quote>,
  InferCreationAttributes<Quote>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare rateSnapshotId: string;
  declare sourceCurrency: string;
  declare targetCurrency: string;
  declare sourceAmount: string;
  declare targetAmount: string;
  declare feeAmount: string;
  declare rate: string;
  declare expiresAt: Date;
  declare status: QuoteStatus;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Quote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rateSnapshotId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sourceCurrency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
    },
    targetCurrency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
    },
    sourceAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    targetAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    feeAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    rate: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "consumed"),
      allowNull: false,
      defaultValue: "active",
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Quote",
    tableName: "quotes",
    indexes: [{ fields: ["user_id", "created_at"] }],
  }
);
