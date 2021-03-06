const combine = require('depject')
const entry = require('depject/entry')
const nest = require('depnest')

// polyfills
require('setimmediate')

// add inspect right click menu
require('./context-menu')

// from more specialized to more general
const sockets = combine(
  // need some modules first
  {
    settings: require('patch-settings'),
    translations: require('./translations/sync'),
    suggestions: require('patch-suggest') // so that styles can be over-ridden
  },
  {
    about: require('./about'),
    app: require('./app'),
    blob: require('./blob'),
    blog: require('./blog'),
    contact: require('./contact'),
    // config: require('./ssb-config'),
    config: require('./config'),
    // group: require('./group'),
    message: require('./message'),
    router: require('./router'),
    styles: require('./styles'),
    state: require('./state/obs'),
    unread: require('./unread'),
    channel: require('./channel')
  },
  {
    profile: require('patch-profile'),
    drafts: require('patch-drafts'),
    history: require('patch-history'),
    core: require('patchcore')
  }
)

const api = entry(sockets, nest({
  'app.html.app': 'first'
}))

document.body.appendChild(api.app.html.app())
// console.log(api.config.sync.load())
