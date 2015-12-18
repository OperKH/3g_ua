$(document).ready(function(){
    // define sugar.js Icelandic sort order
    Array.AlphanumericSortOrder = 'абвгґдеєжзиіїйклмнопрстуфхцчшщюяь';
    Array.AlphanumericSortIgnoreCase = true;
    // see https://github.com/andrewplummer/Sugar/issues/382#issuecomment-41526957
    Array.AlphanumericSortEquivalents = {};


    $('.panel-collapsible').find('.panel-heading').on('click',function(){
        $(this).parent().toggleClass('panel-collapse');
        $(this).next().slideToggle(500);
    });

    getData();

    function getData() {
        $.getJSON("db.json", function(response) {
            fillData(response);
        });
    }

    function fillData(mainData){
        var translate = {
            provinces: "Область",
            cities: "Місто"
        };
        for (var operator in mainData) {
            for (var place in mainData[operator]) {
                if (place === "total") {
                    $('.'+operator).find('.bs-amount').text(mainData[operator][place]);
                } else {
                    var mainDataOperatorPlace = mainData[operator][place];
                    var placeLength = 0;
                    var tableTemplate = '<table class="table table-bordered table-striped"><thead><tr><th>'+translate[place]+'</th><th>К-ть<br/>БС</th><th>Постачальник<br/>обладнання</th><th>Останнє<br/>додавання</th></tr></thead><tbody></tbody></table>';
                    var $tableFragment = $(document.createDocumentFragment());
                    $tableFragment.append(tableTemplate);
                    var $tbody = $tableFragment.find('tbody');
                    for (var name in mainDataOperatorPlace) {
                        placeLength++;
                        var quantity = mainDataOperatorPlace[name].quantity;
                        var date = new Date(mainDataOperatorPlace[name].date).toLocaleString("ru", {year: 'numeric', month: 'numeric', day: 'numeric'});
                        var brandArr = [];
                        for (var brandKey in mainDataOperatorPlace[name].brand) {
                            brandArr.push(brandKey+'('+mainDataOperatorPlace[name].brand[brandKey]+')');
                        }
                        var brands = brandArr.join(", ");
                        var tbodyRowTemplate = '<tr><td>'+name+'</td><td>'+quantity+'</td><td>'+brands+'</td><td>'+date+'</td></tr>';
                        $tbody.append(tbodyRowTemplate);
                    }
                    var $placeOperator = $('.'+place).find('.'+operator);
                    $placeOperator.find('.panel-body').html($tableFragment).end().find('.place-amount').html(placeLength);
                    $placeOperator.find('table').tablesorter({
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