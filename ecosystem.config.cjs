/** PM2 process file — used on the VPS for the PropInspect API. */
module.exports = {
  apps: [
    {
      name: 'propinspect-api',
      cwd: './backend',
      script: 'dist/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-sqlite',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
}
