var fs = require('fs');
var ejs = require('ejs');
var requestify = require('requestify');


var frontendDir = __dirname + '/../' + (process.argv[2] || 'dist') + '/';
var outputFilename = frontendDir + 'db.json';
var inputIndexEjs = frontendDir + 'index.ejs';
var outputIndexHtml = frontendDir + 'index.html';

requestify.get('http://www.ucrf.gov.ua/wp-admin/admin-ajax.php?action=get_wdtable&table_id=1&sEcho=1&sSearch_9=UMTS&bSearchable_9=true')
    .then(function(response) {

        var data = JSON.parse(response.getBody()).aaData;
        var mainData = {};

        data.forEach(function(item){
            if (item[0]) {
                var date = new Date(item[1].split("/").reverse().join("/"));
                var province = item[3];
                var city = item[4];
                var equipmentBrand = item[5];
                var freq = item[7];
                var operatorNameKey = /1922|1927|1932/i.test(freq)?"life":/1937|1942|1947/i.test(freq)?"triMob":/1952|1957|1962/i.test(freq)?"mts":/1967|1972|1977/i.test(freq)?"ks":freq;
                equipmentBrand = /RBS 3206|RBS6102|RBS6201|RBS6302|RBS6000|RBS6601/i.test(equipmentBrand)?"Ericsson":/Nokia|Flexi Multiradio/i.test(equipmentBrand)?"Nokia":/BTS 3803|DBS 3800|BTS3812|BTS 3900|DBS\s?3900/i.test(equipmentBrand)?"Huawei":/ZXSDR BS8700/i.test(equipmentBrand)?"ZTE":/MobileAccess GX/i.test(equipmentBrand)?"Corning":equipmentBrand;
                if (typeof(mainData[operatorNameKey]) === "undefined") {
                    mainData[operatorNameKey] = {};
                    mainData[operatorNameKey].provinces = {};
                    mainData[operatorNameKey].cities = {};
                    mainData[operatorNameKey].total = 0;
                }
                if (typeof(mainData[operatorNameKey].provinces[province]) === "undefined") {
                    mainData[operatorNameKey].provinces[province] = {};
                    mainData[operatorNameKey].provinces[province].date = date;
                    mainData[operatorNameKey].provinces[province].quantity = 0;
                    mainData[operatorNameKey].provinces[province].brand = {};
                }
                if (typeof(mainData[operatorNameKey].cities[city]) === "undefined") {
                    mainData[operatorNameKey].cities[city] = {};
                    mainData[operatorNameKey].cities[city].date = date;
                    mainData[operatorNameKey].cities[city].quantity = 0;
                    mainData[operatorNameKey].cities[city].brand = {};
                }
                mainData[operatorNameKey].total++;

                mainData[operatorNameKey].provinces[province].date = new Date(Math.max(mainData[operatorNameKey].provinces[province].date, date));
                mainData[operatorNameKey].provinces[province].quantity++;
                mainData[operatorNameKey].provinces[province].brand[equipmentBrand] = mainData[operatorNameKey].provinces[province].brand[equipmentBrand]?mainData[operatorNameKey].provinces[province].brand[equipmentBrand]+1:1;

                mainData[operatorNameKey].cities[city].date = new Date(Math.max(mainData[operatorNameKey].cities[city].date, date));
                mainData[operatorNameKey].cities[city].quantity++;
                mainData[operatorNameKey].cities[city].brand[equipmentBrand] = mainData[operatorNameKey].cities[city].brand[equipmentBrand]?mainData[operatorNameKey].cities[city].brand[equipmentBrand]+1:1;

            }
        });
        fs.readFile(inputIndexEjs, 'utf-8', function(error, template) {
            if (error) {
                throw error;
            }
            var html = ejs.render(template, mainData);
            fs.writeFile(outputIndexHtml, html);
        });

    });
