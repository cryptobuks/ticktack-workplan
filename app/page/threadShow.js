const nest = require('depnest')
const { h, computed, when } = require('mutant')
const last = require('lodash/last')
const get = require('lodash/get')

exports.gives = nest('app.page.threadShow')

exports.needs = nest({
  'app.html.context': 'first',
  'app.html.thread': 'first',
  'message.html.compose': 'first',
  'unread.sync.markRead': 'first',
  'feed.obs.thread': 'first'
})

exports.create = (api) => {
  return nest('app.page.threadShow', threadShow)

  function threadShow (location) {
    // location = a thread (message, may be decorated with replies)
    const { key, value } = location
    const root = get(value, 'content.root', key)
    const channel = get(value, 'content.channel')

    //unread state is set in here...
    const thread = api.feed.obs.thread(root)

    const meta = {
      type: 'post',
      root,
      branch: thread.lastId,
      channel,
      recps: get(location, 'value.content.recps')
    }
    const composer = api.message.html.compose({ meta, shrink: false })

    return h('Page -threadShow', [
      api.app.html.context(location),
      h('div.content', [
        when(thread.subject, h('h1', thread.subject)),
        api.app.html.thread(thread),
        composer
      ]),
    ])
  }
}










