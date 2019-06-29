const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const { minify } = require('html-minifier')
const jsdom = require('jsdom')
const jquery = require('jquery')
const https = require('https')
const axios = require('axios')

const frontendDir = path.resolve(__dirname, '..', 'dist')

const { JSDOM } = jsdom
const { window } = new JSDOM()
const $ = jquery(window)

const ucrfPartialsKey = 'listRegistriesCentralized::items'
const ucrfAPI = axios.create({
  baseURL: 'https://www.ucrf.gov.ua/ua/services/centralized-registries',
  headers: {
    'X-OCTOBER-REQUEST-HANDLER': 'listRegistriesCentralized::onFilterRegistries',
    'X-OCTOBER-REQUEST-PARTIALS': ucrfPartialsKey,
    'X-Requested-With': 'XMLHttpRequest',
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
})

let prevStartDate = new Date()
const getProgress = () => {
  const currentDate = new Date()
  const result = currentDate - prevStartDate
  prevStartDate = currentDate
  return ` ${result}ms\n\n`
}

const getOperatorByFreq = freq => {
  if (/-1750|1967|1972|1977|-\s?2535/i.test(freq)) {
    return 'ks'
  }
  if (/-1770|1952|1957|1962|-2520/i.test(freq)) {
    return 'mts'
  }
  if (/-1725|1922|1927|1932|-2545/i.test(freq)) {
    return 'life'
  }
  if (/1937|1942|1947/i.test(freq)) {
    return 'triMob'
  }
  return 'unknown'
}
const getEquipmentBrandByModelName = modelName => {
  if (
    /RBS2116|RBS 3206|RBS3418|RBS3518|Radio 4415|RBS6000|RBS6101|RBS\s?6102|RBS\s?6201|RBS6301|RBS6302|RBS6601/i.test(
      modelName,
    )
  ) {
    return 'Ericsson'
  }
  if (/Nokia|Flexi Multiradio|BTS Optima|BTS Supreme/i.test(modelName)) {
    return 'Nokia'
  }
  if (/BTS 3803|BTS3812|BTS 3900|DBS 3800|DTS 3803C|DBS\s?3900/i.test(modelName)) {
    return 'Huawei'
  }
  if (/ZXSDR BS8700/i.test(modelName)) {
    return 'ZTE'
  }
  if (/MobileAccess GX/i.test(modelName)) {
    return 'Corning'
  }
  return modelName
}

const provinceCorrector = province => {
  switch (province) {
    case '??Р Крим':
      return 'АР Крим'
    case 'Вінни??ька':
    case 'Вінниц??ка':
    case 'Вінницьк??':
      return 'Вінницька'
    case '??ніпропетровська':
    case 'Дн??пропетровська':
    case 'Дні??ропетровська':
    case 'Дніп??опетровська':
    case 'Дніпроп??тровська':
    case 'Дніпропе??ровська':
    case 'Дніпропетр??вська':
    case 'Дніпропетров??ька':
    case 'Дніпропетровсь??а':
    case 'Дніпропетровськ??':
      return 'Дніпропетровська'
    case 'Дон??цька':
    case 'Доне??ька':
    case 'Донець??а':
      return 'Донецька'
    case '??итомирська':
    case 'Ж??томирська':
    case 'Жито??ирська':
      return 'Житомирська'
    case 'За??арпатська':
    case 'Закарпа??ська':
    case 'Закарпатс??ка':
      return 'Закарпатська'
    case 'Зап??різька':
    case 'Запоріз??ка':
    case 'Запорізьк??':
      return 'Запорізька'
    case 'Івано-Франкі??ська':
      return 'Івано-Франківська'
    case '??иїв':
    case 'Киї??':
      return 'Київ'
    case 'К??ївська':
    case 'Київсь??а':
      return 'Київська'
    case 'Кіров??градська':
    case 'Кіровогр??дська':
    case 'Кіровогра??ська':
    case 'Кіровоградськ??':
      return 'Кіровоградська'
    case 'Луг??нська':
      return 'Луганська'
    case 'Льві??ська':
    case 'Львівськ??':
      return 'Львівська'
    case '??иколаївська':
    case 'Миколаї??ська':
    case 'Миколаїв??ька':
    case 'Миколаївс??ка':
      return 'Миколаївська'
    case '??деська':
    case 'О??еська':
      return 'Одеська'
    case 'Пол??авська':
    case 'Полт??вська':
    case 'Полтав??ька':
      return 'Полтавська'
    case 'Рі??ненська':
    case 'Р??вненська':
    case 'Рівнен??ька':
    case 'Рівненсь??а':
    case 'Рівненськ??':
      return 'Рівненська'
    case 'Сумсь??а':
      return 'Сумська'
    case 'Тернопі??ьська':
    case 'Тернопільськ??':
      return 'Тернопільська'
    case '??арківська':
    case 'Хар??івська':
    case 'Харк??вська':
    case 'Харкі??ська':
    case 'Харківсь??а':
    case 'Харківськ??':
      return 'Харківська'
    case 'Хе??сонська':
    case 'Хер??онська':
    case 'Херс??нська':
    case 'Херсон??ька':
    case 'Херсонсь??а':
      return 'Херсонська'
    case '??мельницька':
    case 'Хме??ьницька':
    case 'Хмель??ицька':
    case 'Хмельни??ька':
    case 'Хмельниць??а':
      return 'Хмельницька'
    case '??еркаська':
    case 'Черк??ська':
      return 'Черкаська'
    case 'Ч??рнівецька':
      return 'Чернівецька'
    case 'Ч??рнігівська':
    case 'Черн??гівська':
    case 'Чернігі??ська':
      return 'Чернігівська'
    default:
      return province
  }
}

const cityCorrector = city => {
  switch (city) {
    case 'А??ушта':
      return 'Алушта'
    case 'Б??лики':
      return 'Білики'
    case 'Бал??вне':
      return 'Баловне'
    case 'Ба??вінок':
      return 'Барвінок'
    case 'Борщі??':
      return 'Борщів'
    case '??ровари':
      return 'Бровари'
    case 'Бр??силів':
      return 'Брусилів'
    case 'Ве??ика Северинка':
      return 'Велика Северинка'
    case 'Великосілк??':
      return 'Великосілки'
    case 'Воскрес??нське':
      return 'Воскресенське'
    case 'Г??ушово':
      return 'Грушово'
    case '??ніпро':
    case 'Д??іпро':
    case 'Дні??ро':
      return 'Дніпро'
    case 'До??ецьк':
      return 'Донецьк'
    case '??олинівка':
      return 'Долинівка'
    case 'Д??лятин':
      return 'Делятин'
    case 'Дубровиц??':
      return 'Дубровиця'
    case 'З??іїв':
      return 'Зміїв'
    case 'З??лізний Порт':
      return 'Залізний Порт'
    case 'Запор??жжя':
      return 'Запоріжжя'
    case 'Іллінц??':
      return 'Іллінці'
    case 'Ірп??нь':
      return 'Ірпінь'
    case "К??м'яне":
      return "Кам'яне"
    case "Кам'янець-Поділ??ський":
      return "Кам'янець-Подільський"
    case 'Ки??в':
      return 'Київ'
    case 'Кіц??ань':
      return 'Кіцмань'
    case 'Конопн??ця':
      return 'Конопниця'
    case 'Кос??янтинівка':
    case 'Костянт??нівка':
      return 'Костянтинівка'
    case '??ривий Ріг':
    case 'К??ивий Ріг':
    case 'Криви?? Ріг':
      return 'Кривий Ріг'
    case 'Кропив??ицький':
      return 'Кропивницький'
    case 'Лісов?? Гринівці':
      return 'Лісові Гринівці'
    case 'Лу??ьк':
      return 'Луцьк'
    case 'Ль??ів':
    case 'Льв??в':
      return 'Львів'
    case 'М??ріуполь':
    case 'Марі??поль':
    case 'Маріуп??ль':
      return 'Маріуполь'
    case 'Межирі??ка':
      return 'Межирічка'
    case 'Мико??аїв':
      return 'Миколаїв'
    case 'О??еса':
    case 'Од??са':
      return 'Одеса'
    case 'Переход??':
      return 'Переходи'
    case 'Підг??йці':
      return 'Підгайці'
    case 'Поча??в':
      return 'Почаїв'
    case 'При??ипче':
      return 'Прилипче'
    case 'Рожняті??':
      return 'Рожнятів'
    case 'Рок??тне':
      return 'Рокитне'
    case 'Ружи??':
      return 'Ружин'
    case 'Свято??етрівське':
      return 'Святопетрівське'
    case 'С??вєродонецьк':
      return 'Сєвєродонецьк'
    case 'Старос??лля':
      return 'Старосілля'
    case 'Стар??й Олексинець':
      return 'Старий Олексинець'
    case 'Стр??мівка':
      return 'Струмівка'
    case 'Су??и':
    case '??уми':
      return 'Суми'
    case 'Ужг??род':
      return 'Ужгород'
    case 'Х??рол':
      return 'Хорол'
    case 'Цюрупинс??к':
      return 'Цюрупинськ'
    case 'Цуман??':
      return 'Цумань'
    case '??еркаси':
      return 'Черкаси'
    case 'Чернів??і':
      return 'Чернівці'
    case '??асливцеве':
      return 'Щасливцеве'
    case '??жне':
      return 'Южне'
    default:
      return city
  }
}

const getUCRFStatistic = async (technology, page = 1, prevStatistic = {}) => {
  try {
    const res = await ucrfAPI.post('', null, {
      params: {
        technology,
        page,
        per_page: 200,
      },
    })
    const $html = $(res.data[ucrfPartialsKey])
    const statistic = Array.from(
      $html
        .siblings('table')
        .find('tbody')
        .find('tr'),
    ).map(tr => Array.from($(tr).find('td')).map(td => td.innerHTML))
    const lastPageText = $html
      .siblings('.row')
      .find('.pagination')
      .find('li')
      .last()
      .prev()
      .text()
    const lastPage = parseInt(lastPageText, 10)
    const result = { ...prevStatistic, ...statistic.reduce((acc, s) => ({ ...acc, [s[0]]: s }), {}) }
    console.log(`     ${technology} page: ${page}/${lastPage}`)
    return page === lastPage ? Object.values(result) : getUCRFStatistic(technology, page + 1, result)
  } catch (e) {
    console.log(`UCRF ${technology} Statistic Request Error.`)
    return prevStatistic
  }
}
const getMergedUCRFStatistic = async () => {
  console.log(getProgress(), 'Requesting UCRF Statistic...')
  const statistic = await Promise.all([
    getUCRFStatistic('UMTS'),
    getUCRFStatistic('LTE-1800'),
    getUCRFStatistic('LTE-2600'),
  ])
  return statistic.flat()
}

const processUCRFStatistic = async () => {
  const data = await getMergedUCRFStatistic()

  if (!data || !data.length) {
    console.warn(getProgress(), 'No Statistic from UCRF.')
    return null
  }
  const updateDate = new Date()
  const mainData = {}

  console.log(getProgress(), 'Parsing UCRF Statistic...')

  data.forEach(item => {
    const date = new Date(item[1])
    const province = provinceCorrector(item[3])
    const city = cityCorrector(item[4])
    const equipmentModelName = item[5]
    const freq = item[7]
    const technology = item[9]

    const cityKey = `${city}_${province}`
    const operatorNameKey = getOperatorByFreq(freq)
    const equipmentBrand = getEquipmentBrandByModelName(equipmentModelName)
    const technologyKey = technology === 'UMTS' ? '3g' : '4g'

    if (typeof mainData[`provinces${technologyKey}`] === 'undefined') {
      mainData[`provinces${technologyKey}`] = {
        operators: {},
        updateDate,
      }
    }
    if (typeof mainData[`provinces${technologyKey}`].operators[operatorNameKey] === 'undefined') {
      mainData[`provinces${technologyKey}`].operators[operatorNameKey] = { total: 0, values: {} }
    }
    if (typeof mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province] === 'undefined') {
      mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province] = {
        province,
        date,
        quantity: 0,
        brands: {},
      }
    }

    if (typeof mainData[`cities${technologyKey}`] === 'undefined') {
      mainData[`cities${technologyKey}`] = {
        operators: {},
        updateDate,
      }
    }
    if (typeof mainData[`cities${technologyKey}`].operators[operatorNameKey] === 'undefined') {
      mainData[`cities${technologyKey}`].operators[operatorNameKey] = { total: 0, values: {} }
    }
    if (typeof mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey] === 'undefined') {
      mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey] = {
        city,
        province,
        date,
        quantity: 0,
        brands: {},
      }
    }

    mainData[`provinces${technologyKey}`].operators[operatorNameKey].total += 1
    mainData[`cities${technologyKey}`].operators[operatorNameKey].total += 1

    mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province].date = new Date(
      Math.max(mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province].date, date),
    )
    mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province].quantity += 1
    mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province].brands[equipmentBrand] = mainData[
      `provinces${technologyKey}`
    ].operators[operatorNameKey].values[province].brands[equipmentBrand]
      ? mainData[`provinces${technologyKey}`].operators[operatorNameKey].values[province].brands[equipmentBrand] + 1
      : 1

    mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey].date = new Date(
      Math.max(mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey].date, date),
    )
    mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey].quantity += 1
    mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey].brands[equipmentBrand] = mainData[
      `cities${technologyKey}`
    ].operators[operatorNameKey].values[cityKey].brands[equipmentBrand]
      ? mainData[`cities${technologyKey}`].operators[operatorNameKey].values[cityKey].brands[equipmentBrand] + 1
      : 1
  })

  console.log(getProgress(), 'Transforming UCRF Statistic for frontend...')

  Object.values(mainData).forEach(type => {
    Object.values(type.operators).forEach(operator => {
      const values = Object.values(operator.values)
        .map(value => ({
          ...value,
          brands: Object.keys(value.brands)
            .sort((a, b) => a.localeCompare(b))
            .map(name => `${name}(${value.brands[name]})`)
            .join(', '),
        }))
        .sort((a, b) => a.province.localeCompare(b.province))
      if ('city' in values[0]) {
        values.sort((a, b) => a.city.localeCompare(b.city))
      }
      // eslint-disable-next-line no-param-reassign
      operator.values = values
    })
  })

  return mainData
}

const renderTemplate = (templateName, data, operatorsConfig) =>
  new Promise((res, rej) => {
    const inputFile = path.resolve(frontendDir, `${templateName}.ejs`)
    const outputFile = path.resolve(frontendDir, `${templateName}.html`)
    fs.readFile(inputFile, 'utf-8', (error, template) => {
      if (error) rej()
      const html = minify(ejs.render(template, { data, operatorsConfig }), {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true,
        removeEmptyAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        caseSensitive: true,
        removeAttributeQuotes: true,
      })
      fs.writeFile(outputFile, html, err => {
        if (err) {
          console.log(`  ${templateName}.html NOT created :(`)
          rej()
        } else {
          console.log(`  ${templateName}.html created :)`)
          res()
        }
      })
    })
  })
;(async () => {
  console.log(' START')
  let statistic
  try {
    statistic = await processUCRFStatistic()
  } catch (e) {
    console.log(e)
  }

  if (!statistic) return

  console.log(getProgress(), 'Generating HTMLs...')

  const operatorsConfig = {
    '3g': [
      [
        {
          name: 'Київстар',
          key: 'ks',
        },
        {
          name: 'Vodafone',
          key: 'mts',
        },
      ],
      [
        {
          name: 'lifecell',
          key: 'life',
        },
        {
          name: '3Mob',
          key: 'triMob',
        },
      ],
    ],
    '4g': [
      [
        {
          name: 'Київстар',
          key: 'ks',
        },
        {
          name: 'Vodafone',
          key: 'mts',
        },
      ],
      [
        {
          name: 'lifecell',
          key: 'life',
        },
      ],
    ],
  }

  const templateList = [
    {
      name: '3g-provinces',
      key: 'provinces3g',
      type: '3g',
    },
    {
      name: '3g-cities',
      key: 'cities3g',
      type: '3g',
    },
    {
      name: 'index',
      key: 'provinces4g',
      type: '4g',
    },
    {
      name: '4g-cities',
      key: 'cities4g',
      type: '4g',
    },
  ]

  await Promise.all(
    templateList.map(({ name, type, key }) => renderTemplate(name, statistic[key], operatorsConfig[type])),
  )

  console.log(getProgress(), 'Done!\n')

  // fs.writeFile(path.resolve(frontendDir, 'db.json'), JSON.stringify(statistic), () => {})
})()
