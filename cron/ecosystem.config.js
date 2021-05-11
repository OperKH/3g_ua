module.exports = {
  apps: [
    {
      name: '3G UA Cron',
      script: 'npm',
      args: 'run cron',
      watch: true,
      ignore_watch: ['node_modules'],
    },
  ],
}
