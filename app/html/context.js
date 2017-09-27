const nest = require('depnest')
const { h, computed, map, when, Dict, dictToCollection, Array: MutantArray } = require('mutant')
const pull = require('pull-stream')
const next = require('pull-next-step')
const get = require('lodash/get')

exports.gives = nest('app.html.context')

exports.needs = nest({
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'app.html.link': 'first',
  'feed.pull.private': 'first',
  'feed.pull.rollup': 'first',
  'keys.sync.id': 'first',
  'message.html.subject': 'first',
  'translations.sync.strings': 'first',
})


exports.create = (api) => {
  return nest('app.html.context', (location) => {

    const strings = api.translations.sync.strings()
    const myKey = api.keys.sync.id()

    const discover = {
      notifications: Math.floor(Math.random()*5+1),
      imageEl: h('i.fa.fa-binoculars'),
      name: strings.blogIndex.title,
      location: { page: 'blogIndex' },
      selected: ['blogIndex', 'home'].includes(location.page)
    }
    var nearby = []

    var recentPeersContacted = Dict()
    // TODO - extract as contact.obs.recentPrivate or something

    pull(
      next(api.feed.pull.private, {reverse: true, limit: 100, live: false}, ['value', 'timestamp']),
      pull.filter(msg => msg.value.content.recps),
      pull.drain(msg => {
        msg.value.content.recps
          .map(recp => typeof recp === 'object' ? recp.link : recp)
          .filter(recp => recp != myKey)
          .forEach(recp => {
            if (recentPeersContacted.has(recp)) return

            recentPeersContacted.put(recp, msg)
          })
      })
    )

    return h('Context -feed', [
      LevelOneContext(),
      LevelTwoContext()
    ])

    function LevelOneContext () {
      return h('div.level.-one', [
        Option(discover), 
        map(nearby, Option), // TODO
        map(dictToCollection(recentPeersContacted), ({ key, value })  => { 
          const feedId = key()
          const lastMsg = value()
          return Option({
            notifications: Math.random() > 0.7 ? Math.floor(Math.random()*9+1) : 0, // TODO
            imageEl: api.about.html.image(feedId), // TODO make avatar
            name: api.about.obs.name(feedId),
            location: Object.assign(lastMsg, { feed: feedId }),  // QUESION : how should we pass the context, is stapling feed on like this horrible?
            selected: location.feed === feedId
          })
        })
      ])
    }

    function LevelTwoContext () {
      const targetUser = location.feed
      if (!targetUser) return

      var threads = MutantArray()

      pull(
        next(api.feed.pull.private, {reverse: true, limit: 100, live: false}, ['value', 'timestamp']),
        pull.filter(msg => msg.value.content.recps),
        pull.filter(msg => {
          return msg.value.content.recps
            .map(recp => typeof recp === 'object' ? recp.link : recp)
            .some(recp => recp === targetUser)
        }),
        api.feed.pull.rollup(),
        pull.drain(thread => threads.push(thread))
      )

      return h('div.level.-two', [
        h('Button', 'New Message'), // TODO -translate
        map(threads, thread => {
          return h('Option', [
            api.app.html.link(
              Object.assign(thread, { feed: targetUser }),
              api.message.html.subject(thread)
            )
          ])
        })
      ])
    }

    function Option ({ notifications = 0, imageEl, name, location, selected }) {
      return h('Option', { className: selected ? '-selected' : '' }, [
        h('div.circle', [
          when(notifications, h('div.alert', notifications)),
          imageEl
        ]),
        api.app.html.link(location, name),
      ])
    }
  })
}
