"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("transfer_requests", "recipient_account", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn("transfer_requests", "recipient_country", {
      type: Sequelize.CHAR(2),
      allowNull: true,
    });
    await queryInterface.addColumn("transfer_requests", "recipient_email", {
      type: Sequelize.STRING(254),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("transfer_requests", "recipient_email");
    await queryInterface.removeColumn("transfer_requests", "recipient_country");
    await queryInterface.removeColumn("transfer_requests", "recipient_account");
  },
};
