const nest = require('depnest')
const { h } = require('mutant')
const pull = require('pull-stream')

exports.gives = nest('app.page.blogIndex')

exports.needs = nest({
  'app.html.sideNav': 'first',
  'app.html.blogCard': 'first',
  'app.html.blogNav': 'first',
  'app.html.scroller': 'first',
  // 'feed.pull.public': 'first',
  'feed.pull.type': 'first',
  'history.sync.push': 'first',
  'keys.sync.id': 'first',
  'message.sync.isBlocked': 'first',
  'translations.sync.strings': 'first',
  'unread.sync.isUnread': 'first'
})

exports.create = (api) => {
  return nest('app.page.blogIndex', function (location) {
    // location here can expected to be: { page: 'blogIndex'}
 
    var strings = api.translations.sync.strings()

    var blogs = api.app.html.scroller({
      classList: ['content'],
      prepend: api.app.html.blogNav(location),
      // stream: api.feed.pull.public,
      stream: api.feed.pull.type('blog'),
      filter: () => pull(
        // pull.filter(msg => {
        //   const type = msg.value.content.type
        //   return type === 'post' || type === 'blog'
        // }),
        pull.filter(msg => !msg.value.content.root), // show only root messages
        pull.filter(msg => !api.message.sync.isBlocked(msg))
      ),
      // FUTURE : if we need better perf, we can add a persistent cache. At the moment this page is fast enough though.
      // See implementation of app.html.sideNav for example
      // store: recentMsgCache,
      // updateTop: updateRecentMsgCache,
      // updateBottom: updateRecentMsgCache,
      render
    })

    return h('Page -blogIndex', {title: strings.home}, [
      api.app.html.sideNav(location),
      blogs
    ])
  })



  function render (blog) {
    const { recps, channel } = blog.value.content
    var onClick
    if (channel && !recps)
      onClick = (ev) => api.history.sync.push(Object.assign({}, blog, { page: 'blogShow' }))
    return api.app.html.blogCard(blog, { onClick })
  }
}




