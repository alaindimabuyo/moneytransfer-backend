import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database";

export type RateRange = "1W" | "1M" | "6M";

export interface RateSeriesPoint {
  date: string; // YYYY-MM-DD
  rate: number;
}

export interface RateSeriesData {
  points: RateSeriesPoint[];
  raw: Record<string, unknown>;
}

export class HistoricalRateSeries extends Model<
  InferAttributes<HistoricalRateSeries>,
  InferCreationAttributes<HistoricalRateSeries>
> {
  declare id: CreationOptional<string>;
  declare sourceCurrency: string;
  declare targetCurrency: string;
  declare range: RateRange;
  declare provider: string;
  declare data: RateSeriesData;
  declare fetchedAt: Date;
  declare expiresAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

HistoricalRateSeries.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sourceCurrency: { type: DataTypes.CHAR(3), allowNull: false },
    targetCurrency: { type: DataTypes.CHAR(3), allowNull: false },
    range: { type: DataTypes.STRING(8), allowNull: false },
    provider: { type: DataTypes.STRING(64), allowNull: false },
    data: { type: DataTypes.JSONB, allowNull: false },
    fetchedAt: { type: DataTypes.DATE, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "HistoricalRateSeries",
    tableName: "historical_rate_series",
    indexes: [
      {
        name: "historical_rate_series_lookup_idx",
        fields: ["source_currency", "target_currency", "range", "expires_at"],
      },
    ],
  }
);
