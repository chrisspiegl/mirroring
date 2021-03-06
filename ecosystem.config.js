module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: "mir-stream",
      append_env_to_name: true,
      script: "./server/index.js",
      watch: false,
      exec_mode: "fork",
      // instances: (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "development") ? "max" : 1,
      instances: 1,
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env: {
        NODE_PATH: ".",
        NODE_ENV: "local",
        DEBUG: "simir:*",
      },
      env_production: {
        NODE_PATH: ".",
        NODE_ENV: "production",
        DEBUG: "simir:*",
      },
      env_development: {
        NODE_PATH: ".",
        NODE_ENV: "development",
        DEBUG: "simir:*",
      },
    },
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy: {
    production: {
      user: "deploy",
      host: "swMain",
      ref: "origin/master",
      repo: "git@github.com:chrisspiegl/mirroring.git",
      path: "/home/deploy/mirroring-stream-production",
      "post-deploy": "npm run nsinstall && npm run nsupdate && NODE_ENV=production pm2 reload ecosystem.config.js --only mirroring-main --env production",
      // env: {},
    },
    // dev : {
    //   user: "node",
    //   host: "doSpieglCO-node",
    //   // ref: "origin/development",
    //   ref: "origin/master",
    //   repo: "git@github.com:chrisspiegl/mirroring.git",
    //   path: "/home/node/network.chrisspiegl.com/development",
    //   "post-deploy": "npm run nsinstall && npm run nsupdate && NODE_ENV=development pm2 reload ecosystem.config.js --env development --source-map-support",
    //   env: {}
    // }
  },
};
