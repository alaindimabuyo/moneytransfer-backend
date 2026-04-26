"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING(254),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("rate_snapshots", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      source_currency: { type: Sequelize.CHAR(3), allowNull: false },
      target_currency: { type: Sequelize.CHAR(3), allowNull: false },
      rate: { type: Sequelize.DECIMAL(18, 8), allowNull: false },
      provider: { type: Sequelize.STRING(64), allowNull: false },
      raw_response: { type: Sequelize.JSONB, allowNull: false },
      fetched_at: { type: Sequelize.DATE, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("rate_snapshots", {
      name: "rate_snapshots_lookup_idx",
      fields: ["source_currency", "target_currency", "expires_at"],
    });

    await queryInterface.createTable("quotes", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      rate_snapshot_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "rate_snapshots", key: "id" },
        onDelete: "RESTRICT",
      },
      source_currency: { type: Sequelize.CHAR(3), allowNull: false },
      target_currency: { type: Sequelize.CHAR(3), allowNull: false },
      source_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      target_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      fee_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      rate: { type: Sequelize.DECIMAL(18, 8), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM("active", "expired", "consumed"),
        allowNull: false,
        defaultValue: "active",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("quotes", {
      fields: ["user_id", "created_at"],
    });

    await queryInterface.createTable("transfer_requests", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      quote_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "quotes", key: "id" },
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.ENUM("pending", "processing", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      submitted_at: { type: Sequelize.DATE, allowNull: false },
      recipient_name: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("transfer_requests", {
      fields: ["user_id", "created_at"],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("transfer_requests");
    await queryInterface.dropTable("quotes");
    await queryInterface.dropTable("rate_snapshots");
    await queryInterface.dropTable("users");
    // drop enums explicitly (Postgres)
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_quotes_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_transfer_requests_status";'
    );
  },
};
