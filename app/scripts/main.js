$(document).ready(function(){
    // define sugar.js Icelandic sort order
    Array.AlphanumericSortOrder = 'абвгґдеєжзиіїйклмнопрстуфхцчшщюяь';
    Array.AlphanumericSortIgnoreCase = true;
    // see https://github.com/andrewplummer/Sugar/issues/382#issuecomment-41526957
    Array.AlphanumericSortEquivalents = {};
    var operators = {
        life: 1922.8,
        triMob: 1942.4,
        mts: 1952.4,
        ks: 1967.4
    };
    var mainData = {};

    for (var key in operators) {
        mainData[key] = {};
        mainData[key].provinces = {};
        mainData[key].cities = {};
        mainData[key].total = 0;
        getData(key);
    }

    // console.log(mainData);

    function getData(operatorNameKey) {
        var request = "http://www.ucrf.gov.ua/wp-admin/admin-ajax.php?action=get_wdtable&table_id=1&sEcho=1&sSearch=" + operators[operatorNameKey] + "&sSearch_9=UMTS&bSearchable_9=true";
        var url = "http://query.yahooapis.com/v1/public/yql";
        var data = {};
        data.format = "json";
        data.q = "select * from json where url='" + request + "'";
        $.getJSON(url, data, function(response) {
            if (response.query.results === null) {
                $('.'+operatorNameKey).find('.panel-body').text('Помилка при отриманні даних');
                return;
            }
            var data = response.query.results.json.aaData;
            data.forEach(function(item){
                var date = new Date(item.json[1].split("/").reverse().join("/"));
                var province = item.json[3];
                var city = item.json[4];
                var equipmentBrand = item.json[5];
                equipmentBrand = /RBS 3206|RBS6102|RBS6201|RBS6302|RBS6000|RBS6601/i.test(equipmentBrand)?"Ericsson":/Nokia|Flexi Multiradio/i.test(equipmentBrand)?"Nokia":/BTS 3803|DBS 3800|BTS3812|BTS 3900|DBS 3900/i.test(equipmentBrand)?"Huawei":/MobileAccess GX/i.test(equipmentBrand)?"Corning":equipmentBrand;
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

            });
        //Fill table
        fillData(operatorNameKey);
        });
    }

    function fillData(operator){
        for (var place in mainData[operator]) {
            if (place === "total") {
                $('.'+operator).find('.total-amount').text(mainData[operator][place]);
                return;
            }
            var translate = {
                provinces: "Область",
                cities: "Місто"
            };
            var tableTemplate = '<table class="table table-bordered table-striped"><thead><tr><th>'+translate[place]+'</th><th>К-ть<br/>БС</th><th>Постачальник<br/>обладнання</th><th>Останнє<br/>додавання</th></tr></thead><tbody></tbody></table>';
            var $tableFragment = $(document.createDocumentFragment());
            $tableFragment.append(tableTemplate);
            var $tbody = $tableFragment.find('tbody');
            for (var name in mainData[operator][place]) {
                var quantity = mainData[operator][place][name].quantity;
                var date = mainData[operator][place][name].date.toLocaleString("ru", {year: 'numeric', month: 'numeric', day: 'numeric'});
                var brandArr = [];
                for (var brandKey in mainData[operator][place][name].brand) {
                    brandArr.push(brandKey+'('+mainData[operator][place][name].brand[brandKey]+')');
                }
                var brands = brandArr.join(", ");
                var tbodyRowTemplate = '<tr><td>'+name+'</td><td>'+quantity+'</td><td>'+brands+'</td><td>'+date+'</td></tr>';
                $tbody.append(tbodyRowTemplate);
            }
            $('.'+place).find('.'+operator).find('.panel-body').html($tableFragment);
            $('.'+place).find('.'+operator).find('table').tablesorter({
                sortList: [[0, 0]],
                dateFormat: "ddmmyyyy",
                widgets: ["filter"],
                widgetOptions : {
                    filter_placeholder: {
                        search: 'пошук...'
                    }
                },
                textSorter : {
                    0 : Array.AlphanumericSort
                }

            });

        }

    }

});