"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("historical_rate_series", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      source_currency: { type: Sequelize.CHAR(3), allowNull: false },
      target_currency: { type: Sequelize.CHAR(3), allowNull: false },
      range: { type: Sequelize.STRING(8), allowNull: false }, // '1W' | '1M' | '6M'
      provider: { type: Sequelize.STRING(64), allowNull: false },
      data: { type: Sequelize.JSONB, allowNull: false }, // { points: [{date, rate}, ...], raw: <api response> }
      fetched_at: { type: Sequelize.DATE, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("historical_rate_series", {
      name: "historical_rate_series_lookup_idx",
      fields: ["source_currency", "target_currency", "range", "expires_at"],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("historical_rate_series");
  },
};
