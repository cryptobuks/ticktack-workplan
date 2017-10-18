const nest = require('depnest')
const { h, computed, when } = require('mutant')
const { title: getTitle } = require('markdown-summary')
const last = require('lodash/last')
const get = require('lodash/get')

exports.gives = nest('app.page.blogShow')

exports.needs = nest({
  'about.html.avatar': 'first',
  'about.obs.name': 'first',
  'app.html.comments': 'first',
  'app.html.context': 'first',
  'message.html.channel': 'first',
  'message.html.compose': 'first',
  'message.html.markdown': 'first',
  'message.html.timeago': 'first',
})

exports.create = (api) => {
  return nest('app.page.blogShow', blogShow)

  function blogShow (blogMsg) {
    // blogMsg = a thread (message, may be decorated with replies)

    const { author, content } = blogMsg.value

    const blog = content.text
    const title = content.title || getTitle(blog)

    const comments = api.app.html.comments(blogMsg.key)

    const meta = {
      type: 'post',
      root: blogMsg.key,
      // branch: get(last(blogMsg.replies), 'key'), // TODO - change to match new comments logic
      // >> lastId? CHECK THIS LOGIC
      channel: content.channel
    }

    const { timeago, channel, markdown, compose } = api.message.html
    const composer = compose({ meta, shrink: true })

    return h('Page -blogShow', [
      api.app.html.context({ page: 'discover' }), // HACK to highlight discover
      h('div.content', [
        h('header', [
          h('div.blog', [
            h('h1', title),
            timeago(blogMsg),
            channel(blogMsg)
          ]),
          h('div.author', [
            h('div.leftCol', api.about.html.avatar(author, 'medium')),
            h('div.rightCol', [
              h('div.name', api.about.obs.name(author)),
              h('Button', 'Follow')
            ]),
          ])
        ]),
        h('div.break', h('hr')),
        h('section.blog', markdown(blog)),
        composer,
        comments,
      ]),
    ])
  }
}

