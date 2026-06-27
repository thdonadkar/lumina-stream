// PM2 ecosystem for running the Nitro Node server produced by `bun run build`
// (with NITRO_PRESET=node-server). Output lives at .output/server/index.mjs.
//
//   pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup       # survives reboots
//
module.exports = {
  apps: [
    {
      name: "atomspot",
      script: ".output/server/index.mjs",
      cwd: __dirname,
      exec_mode: "cluster",
      instances: "max",            // one worker per vCPU
      node_args: "--enable-source-maps",
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 3000,
      },
      out_file: "/var/log/atomspot/out.log",
      error_file: "/var/log/atomspot/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
