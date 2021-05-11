## Installation

### Install NodeJS

For Linux:

```bash
sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```

For Windows or MacOS:
[Download NodeJS Install package](https://nodejs.org/en/download)

### Install project packages:

```bash
npm ci
bower install
```

### Build the project:

```bash
npm run build
```

### Genereate html file:

```bash
node <full_path>/cron/crawlerRunner.js
```

### Node cron service

#### Install PM2 globally

```bash
npm i -g pm2
```

#### Install local packages for server

```bash
npm ci
```

#### Init start-up service

```bash
pm2 start ecosystem.config.js
pm2 save
```

### As alternative - linux crontab:

```bash
00 6,9,11-14,16,18,20 * * * <user> node <full_path>/cron/crawlerRunner.js
```

### [Website](https://3g.operkh.com/)
