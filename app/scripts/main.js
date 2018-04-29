$(document).ready(function() {
    // define sugar.js Icelandic sort order
    Array.AlphanumericSortOrder = 'абвгґдеєжзиіїйклмнопрстуфхцчшщюяь';
    Array.AlphanumericSortIgnoreCase = true;
    // see https://github.com/andrewplummer/Sugar/issues/382#issuecomment-41526957
    Array.AlphanumericSortEquivalents = {};

    $('.panel-collapsible').find('.panel-heading').on('click', function() {
        $(this)
            .parent().toggleClass('panel-collapse').end()
            .next().slideToggle(500);
    });

    $('table').tablesorter({
        dateFormat: 'ddmmyyyy',
        widgets: ['filter'],
        widgetOptions: {
            filter_placeholder: {
                search: 'пошук...'
            }
        },
        textSorter: {
            0: Array.AlphanumericSort
        }
    });
});

// Register Service Worker
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker
//     .register('./sw.js')
//     .then(() =>
//       navigator.serviceWorker.ready.then(worker => {
//         worker.sync.register('syncdata')
//       })
//     )
//     .catch(err => console.log(err))
// }

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister()
      }
    })
}
