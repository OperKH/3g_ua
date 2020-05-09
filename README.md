## Installation


### Install NodeJS
For Linux:
``` bash
sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```
For Windows or MacOS:
[Download NodeJS Install package](https://nodejs.org/en/download)


### After node installation
Install project packages:
``` bash
npm install
bower install
```
Build the project:
``` bash
npm run build
```
Genereate html file:
``` bash
node <full_path>/cron_scripts/updateData.js
```
Add updater to crontab:
``` bash
00 6,9,11-14,16,18,20 * * * <user> node <full_path>/cron_scripts/updateData.js
```

### [Website](https://3g.operkh.com/)
