const nest = require('depnest')
const { h, computed, when } = require('mutant')
const get = require('lodash/get')
const path = require('path')

exports.gives = nest('app.html.header')

exports.needs = nest('keys.sync.id', 'first')

const SETTINGS_PAGES = [
  'settings',
  'userEdit',
]

exports.create = (api) => {
  return nest('app.html.header', (nav) => {
    const { location, push } = nav
    const myKey = api.keys.sync.id()

    const loc = computed(location, location => {
      if (typeof location != 'object') return {}
      return location
    })

    if (loc().page === 'splash') return

    const isProfile = computed(loc, loc => loc.feed == myKey)
    const isSettings = computed(loc, loc => SETTINGS_PAGES.includes(loc.page))

    const isFeed = computed([isProfile, isSettings], (p, s) => !p && !s)

    return h('Header', [
      h('nav', [
        h('img.feed', { 
          src: when(isFeed, assetPath('feed_on.png'), assetPath('feed.png')),
          'ev-click': () => push({page: 'blogIndex'}),
        }),
        h('img.profile', { 
          src: when(isProfile, assetPath('address_bk_on.png'), assetPath('address_bk.png')),
          'ev-click': () => push({page: 'userShow', feed: myKey})
        }),
        h('img.settings', { 
          src: when(isSettings, assetPath('settings_on.png'), assetPath('settings.png')),
          'ev-click': () => push({page: 'settings'})
        }),
      ]),
    ])
  })
}

function assetPath (name) {
  return path.join(__dirname, '../../assets', name)
}

