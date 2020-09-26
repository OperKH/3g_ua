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
  if (/-895|-1750|1967|1972|1977|-\s?2535/i.test(freq)) {
    return 'ks'
  }
  if (/-905|-1770|1952|1957|1962|-2520/i.test(freq)) {
    return 'mts'
  }
  if (/-900|-1725|1922|1927|1932|-2545/i.test(freq)) {
    return 'life'
  }
  if (/1937|1942|1947/i.test(freq)) {
    return 'triMob'
  }
  return 'unknown'
}

const getTechnologyKey = technology => {
  switch (technology) {
    case 'UMTS':
      return '3g'
    case 'LTE-900':
    case 'LTE-1800':
    case 'LTE-2600':
      return '4g'
    default:
      return 'unknown'
  }
}

const getEquipmentBrandByModelName = modelName => {
  if (
    /RBS2116|RADIO 2212|RADIO 2219|RBS 3206|RBS3418|RBS3518|Radio 4415|RBS6000|RBS6101|RBS\s?6102|RBS\s?6201|RBS6301|RBS6302|RBS6501|RBS6601/i.test(
      modelName,
    )
  ) {
    return 'Ericsson'
  }
  if (/Nokia|Flexi Multiradio|BTS Optima|BTS Supreme/i.test(modelName)) {
    return 'Nokia'
  }
  if (/BTS 3803|BTS3812|BTS\s?3900|DBS 3800|DTS 3803C|DBS\s?3900/i.test(modelName)) {
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
    const lastPageText = $html.siblings('.row').find('.pagination').find('li').last().prev().text()
    const lastPage = parseInt(lastPageText, 10) || 1

    if (lastPage < page) {
      return []
    }

    const statistic = Array.from($html.siblings('table').find('tbody').find('tr')).map(tr =>
      Array.from($(tr).find('td')).map(td => td.innerHTML),
    )
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
  const technologies = ['UMTS', 'LTE-900', 'LTE-1800', 'LTE-2600']
  const statistic = await Promise.all(technologies.map(technology => getUCRFStatistic(technology)))
  return statistic.flat()
}

const processUCRFStatistic = async () => {
  const dateToday = new Date()
  const data = await getMergedUCRFStatistic()

  if (!data || !data.length) {
    console.warn(getProgress(), 'No Statistic from UCRF.')
    return null
  }
  const updateDate = new Date()
  const mainData = {}

  console.log(getProgress(), 'Parsing UCRF Statistic...')

  data.forEach(item => {
    const [startDay = '1', startMonth = '1', startYear = '1970'] = item[1].split('.')
    const [endDay = '1', endMonth = '1', endYear = '1970'] = item[2].split('.')

    const date = new Date(
      parseInt(startYear, 10) || 1970,
      parseInt(startMonth, 10) - 1 || 0,
      parseInt(startDay, 10) || 1,
    )
    const dateEnd = new Date(parseInt(endYear, 10) || 1970, parseInt(endMonth, 10) - 1 || 0, parseInt(endDay, 10) || 1)
    const province = item[3]
    const city = item[4]
    const equipmentModelName = item[5]
    const freq = item[7]
    const technology = item[9]

    const cityKey = `${city}_${province}`
    const operatorNameKey = getOperatorByFreq(freq)
    const equipmentBrand = getEquipmentBrandByModelName(equipmentModelName)
    const technologyKey = getTechnologyKey(technology)

    // Skip Item if it outdated
    if (dateEnd < dateToday) return

    // Skip Item if UCRF returns corrupted province
    // 'Київ' - the shortest province
    if (province.length < 4) return

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
