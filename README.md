## Installation


### On Linux systems:
Before compile node:
```
apt-get install libicu-dev
```
or
```
yum install libicu-dev
```
Compile node:
```
./configure --with-intl=system-icu
make
make install
```

### After node installation
Install dependencies:
````
npm install -g yo gulp bower
````
Install the generator:
```
npm install -g generator-gulp-webapp
```

Install project packages:
```
npm install
bower install
```

### [Website](http://3g.19min.com/)
