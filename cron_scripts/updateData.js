var fs = require('fs');
var ejs = require('ejs');
var minify = require('html-minifier').minify;
var requestify = require('requestify');


var frontendDir = __dirname + '/../' + (process.argv[2] || 'dist') + '/';
var outputFilename = frontendDir + 'db.json';
var inputIndexEjs = frontendDir + 'index.ejs';
var outputIndexHtml = frontendDir + 'index.html';

console.log('before responce');

requestify.get('http://www.ucrf.gov.ua/wp-admin/admin-ajax.php?action=get_wdtable&table_id=1&sEcho=1&sSearch_0=БС2100&bSearchable_0=true').then(function(response) {
    console.log('get responce');
    var data = JSON.parse(response.getBody()).aaData;
    if (!data.length) {
        console.warn('No data from UCRF');
        return;
    }
    var mainData = {};
    data.forEach(function(item){
        var date = new Date(item[1].split("/").reverse().join("/"));
        var province = item[3];
        var city = item[4];
        var cityKey = city + '_' + province;
        var equipmentBrand = item[5];
        var freq = item[7];
        var operatorNameKey = /1922|1927|1932/i.test(freq)?"life":/1937|1942|1947/i.test(freq)?"triMob":/1952|1957|1962/i.test(freq)?"mts":/1967|1972|1977/i.test(freq)?"ks":freq;
        equipmentBrand = /RBS2116|RBS 3206|RBS3418|RBS3518|RBS6000|RBS6101|RBS6102|RBS6201|RBS6301|RBS6302|RBS6601/i.test(equipmentBrand)?"Ericsson":/Nokia|Flexi Multiradio/i.test(equipmentBrand)?"Nokia":/BTS 3803|DBS 3800|BTS3812|BTS 3900|DBS\s?3900/i.test(equipmentBrand)?"Huawei":/ZXSDR BS8700/i.test(equipmentBrand)?"ZTE":/MobileAccess GX/i.test(equipmentBrand)?"Corning":equipmentBrand;
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
        if (typeof(mainData[operatorNameKey].cities[cityKey]) === "undefined") {
            mainData[operatorNameKey].cities[cityKey] = {};
            mainData[operatorNameKey].cities[cityKey].city = city;
            mainData[operatorNameKey].cities[cityKey].province = province;
            mainData[operatorNameKey].cities[cityKey].date = date;
            mainData[operatorNameKey].cities[cityKey].quantity = 0;
            mainData[operatorNameKey].cities[cityKey].brand = {};
        }
        mainData[operatorNameKey].total++;

        mainData[operatorNameKey].provinces[province].date = new Date(Math.max(mainData[operatorNameKey].provinces[province].date, date));
        mainData[operatorNameKey].provinces[province].quantity++;
        mainData[operatorNameKey].provinces[province].brand[equipmentBrand] = mainData[operatorNameKey].provinces[province].brand[equipmentBrand]?mainData[operatorNameKey].provinces[province].brand[equipmentBrand]+1:1;

        mainData[operatorNameKey].cities[cityKey].date = new Date(Math.max(mainData[operatorNameKey].cities[cityKey].date, date));
        mainData[operatorNameKey].cities[cityKey].quantity++;
        mainData[operatorNameKey].cities[cityKey].brand[equipmentBrand] = mainData[operatorNameKey].cities[cityKey].brand[equipmentBrand]?mainData[operatorNameKey].cities[cityKey].brand[equipmentBrand]+1:1;

    });

    for (var operatorNameKey in mainData) {
        mainData[operatorNameKey].provinces = sortObject(mainData[operatorNameKey].provinces);
        mainData[operatorNameKey].cities = sortObject(mainData[operatorNameKey].cities);
    }

    console.log('mainData ready');
    fs.readFile(inputIndexEjs, 'utf-8', function(error, template) {
        if (error) {
            throw error;
        }
        var html = minify(ejs.render(template, mainData), {
            removeComments: true,
            removeCommentsFromCDATA: true,
            removeCDATASectionsFromCDATA: true,
            collapseWhitespace: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            caseSensitive: true,
            removeAttributeQuotes: true,
        });
        fs.writeFile(outputIndexHtml, html, function(error) {
            if (error) {
                console.log('HTML NOT created :(');
            } else {
                console.log('HTML created :)');
            }
        });
    });

    // fs.writeFile(outputFilename, JSON.stringify(mainData));

});


function sortObject(object){
    var sortedObj = {},
        keys = Object.keys(object);

    keys.sort(function(key1, key2){
        return key1.localeCompare(key2);
    });

    var keysLength = keys.length;
    for(var i = 0; i < keysLength; i++){
        var key = keys[i];
        sortedObj[key] = object[key];
    }

    return sortedObj;
}
