"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "google_sub", {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addIndex("users", ["google_sub"], {
      unique: true,
      name: "users_google_sub_unique",
      where: { google_sub: { [Sequelize.Op.ne]: null } },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("users", "users_google_sub_unique");
    await queryInterface.removeColumn("users", "google_sub");
    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
