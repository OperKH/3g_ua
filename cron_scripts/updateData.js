const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const { minify } = require('html-minifier')
const axios = require('axios')

const frontendDir = path.resolve(__dirname, '..', 'dist')

let prevStartDate = new Date()
const getProgress = () => {
  const currentDate = new Date()
  const result = currentDate - prevStartDate
  prevStartDate = currentDate
  return ` ${result}ms\n\n`
}

const getOperatorByFreq = freq => {
  if (/1967|1972|1977|-\s?2535/i.test(freq)) {
    return 'ks'
  } else if (/1952|1957|1962|-2520/i.test(freq)) {
    return 'mts'
  } else if (/1922|1927|1932|-2545/i.test(freq)) {
    return 'life'
  } else if (/1937|1942|1947/i.test(freq)) {
    return 'triMob'
  }
  return 'unknown'
}
const getEquipmentBrandByModelName = modelName => {
  if (
    /RBS2116|RBS 3206|RBS3418|RBS3518|Radio 4415|RBS6000|RBS6101|RBS6102|RBS6201|RBS6301|RBS6302|RBS6601/i.test(
      modelName,
    )
  ) {
    return 'Ericsson'
  } else if (/Nokia|Flexi Multiradio/i.test(modelName)) {
    return 'Nokia'
  } else if (/BTS 3803|BTS3812|BTS 3900|DBS 3800|DTS 3803C|DBS\s?3900/i.test(modelName)) {
    return 'Huawei'
  } else if (/ZXSDR BS8700/i.test(modelName)) {
    return 'ZTE'
  } else if (/MobileAccess GX/i.test(modelName)) {
    return 'Corning'
  }
  return modelName
}

const getUCRFStatistic = async techology => {
  try {
    const res = await axios.get('http://www.ucrf.gov.ua/wp-admin/admin-ajax.php', {
      params: {
        action: 'get_wdtable',
        table_id: 1,
        sEcho: 1,
        sSearch_9: techology,
        bSearchable_9: true,
      },
    })
    return res.data.aaData
  } catch (e) {
    console.log(`UCRF ${techology} Statistic Request Error.`)
    return []
  }
}
const getMergedUCRFStatistic = async () => {
  console.log(getProgress(), 'Requesting UCRF Statistic...')
  const statistic = await Promise.all([getUCRFStatistic('UMTS'), getUCRFStatistic('LTE-2600')])
  return [].concat(...statistic)
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
    const date = new Date(
      item[1]
        .split('/')
        .reverse()
        .join('/'),
    )
    const province = item[3]
    const city = item[4]
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

  console.log('Transforming UCRF Statistic for frontend...')

  Object.values(mainData).forEach(type => {
    Object.values(type.operators).forEach(operator => {
      // eslint-disable-next-line no-param-reassign
      operator.values = Object.values(operator.values).map(value => ({
        ...value,
        brands: Object.keys(value.brands)
          .sort((a, b) => a.localeCompare(b))
          .map(name => `${name}(${value.brands[name]})`)
          .join(', '),
      }))
    })
  })

  return mainData
}

const renderTeplate = (teplateName, data, operatorsConfig) => {
  const inputFile = path.resolve(frontendDir, `${teplateName}.ejs`)
  const outputFile = path.resolve(frontendDir, `${teplateName}.html`)
  fs.readFile(inputFile, 'utf-8', (error, template) => {
    if (error) {
      throw error
    }
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
        console.log(`${teplateName}.html NOT created :(`)
      } else {
        console.log(`${teplateName}.html created :)`)
      }
    })
  })
}
;(async () => {
  let statistic
  try {
    statistic = await processUCRFStatistic()
  } catch (e) {
    console.log(e)
  }

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
      type: '4g'
    },
    {
      name: '4g-cities',
      key: 'cities4g',
      type: '4g'
    },
  ]

  templateList.forEach(({ name, type, key }) => {
    renderTeplate(name, statistic[key], operatorsConfig[type])
  })

  // fs.writeFile(path.resolve(frontendDir, 'db.json'), JSON.stringify(statistic), () => {})
})()
