$(document).ready(function(){
    // define sugar.js Icelandic sort order
    Array.AlphanumericSortOrder = 'абвгґдеєжзиіїйклмнопрстуфхцчшщюяь';
    Array.AlphanumericSortIgnoreCase = true;
    // see https://github.com/andrewplummer/Sugar/issues/382#issuecomment-41526957
    Array.AlphanumericSortEquivalents = {};

    getData();

    function getData() {
        $.getJSON("db.json", function(response) {
            fillData(response);
        });
    }

    function fillData(mainData){
        for (var operator in mainData) {
            for (var place in mainData[operator]) {
                if (place === "total") {
                    $('.'+operator).find('.total-amount').text(mainData[operator][place]);
                } else {
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
                        var date = new Date(mainData[operator][place][name].date).toLocaleString("ru", {year: 'numeric', month: 'numeric', day: 'numeric'});
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
        }
    }
});