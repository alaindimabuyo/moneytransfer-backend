import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database";

export class RateSnapshot extends Model<
  InferAttributes<RateSnapshot>,
  InferCreationAttributes<RateSnapshot>
> {
  declare id: CreationOptional<string>;
  declare sourceCurrency: string;
  declare targetCurrency: string;
  declare rate: string; // decimal stored as string to preserve precision
  declare provider: string;
  declare rawResponse: Record<string, unknown>;
  declare fetchedAt: Date;
  declare expiresAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RateSnapshot.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sourceCurrency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
    },
    targetCurrency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
    },
    rate: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    rawResponse: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    fetchedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "RateSnapshot",
    tableName: "rate_snapshots",
    indexes: [
      {
        name: "rate_snapshots_lookup_idx",
        fields: ["source_currency", "target_currency", "expires_at"],
      },
    ],
  }
);
