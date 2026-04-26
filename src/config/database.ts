import { Sequelize } from "sequelize";
import { env, isProd } from "./env";

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: isProd ? false : (msg) => console.log(`[sql] ${msg}`),
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: { max: 10, min: 0, idle: 10000 },
});
