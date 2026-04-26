import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../config/database";

export type TransferStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export class TransferRequest extends Model<
  InferAttributes<TransferRequest>,
  InferCreationAttributes<TransferRequest>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare quoteId: string;
  declare status: TransferStatus;
  declare submittedAt: Date;
  declare recipientName: CreationOptional<string | null>;
  declare recipientAccount: CreationOptional<string | null>;
  declare recipientCountry: CreationOptional<string | null>;
  declare recipientEmail: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TransferRequest.init(
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
    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    recipientName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    recipientAccount: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    recipientCountry: {
      type: DataTypes.CHAR(2),
      allowNull: true,
    },
    recipientEmail: {
      type: DataTypes.STRING(254),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "TransferRequest",
    tableName: "transfer_requests",
    indexes: [{ fields: ["user_id", "created_at"] }],
  }
);
