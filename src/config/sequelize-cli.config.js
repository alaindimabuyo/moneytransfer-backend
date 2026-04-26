require("dotenv/config");

const common = {
  url: process.env.DATABASE_URL,
  dialect: "postgres",
  define: { underscored: true, timestamps: true },
};

module.exports = {
  development: common,
  test: common,
  production: common,
};
