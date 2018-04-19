const nest = require('depnest')
const { h, Value, Struct, Array: MutantArray, Dict, onceTrue, map, computed, dictToCollection, throttle } = require('mutant')
const pull = require('pull-stream')
const marksum = require('markdown-summary')
const Chart = require('chart.js')
const groupBy = require('lodash/groupBy')

exports.gives = nest('app.page.statsShow')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'history.sync.push': 'first'
})

exports.create = (api) => {
  return nest('app.page.statsShow', statsShow)

  function statsShow (location) {
    var store = Struct({
      blogs: MutantArray([]),
      comments: Dict(),
      likes: Dict()
    })

    var howFarBack = Value(0)
    // stats show a moving window of 30 days
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

    // TODO
    var range = computed([howFarBack], howFarBack => {
      const now = Date.now()
      return {
        upper: now - howFarBack * THIRTY_DAYS,
        lower: now - (howFarBack + 1) * THIRTY_DAYS
      }
    })

    var rangeComments = computed([throttle(dictToCollection(store.comments), 1000), range], (comments, range) => {
      return comments
        .map(c => c.value)
        .reduce((n, sofar) => [...n, ...sofar], [])
        .filter(msg => {
          const ts = msg.value.timestamp
          return ts >= range.lower && ts <= range.upper
        })
    })

    var rangeLikes = computed([throttle(dictToCollection(store.likes), 1000), range], (likes, range) => {
      return likes
        .map(c => c.value)
        .reduce((n, sofar) => [...n, ...sofar], [])
        .filter(msg => {
          const ts = msg.value.timestamp
          return ts >= range.lower && ts <= range.upper
        })
    })

    onceTrue(api.sbot.obs.connection, server => {
      fetchBlogs({ server, store })
      // fetches blogs and all associated data

      // ///// test code /////
      // var blogKey = '%3JeEg7voZF4aplk9xCEAfhFOx+zocbKhgstzvfD3G8w=.sha256'
      // console.log('fetching comments', blogKey) // has 2 comments, 1 like

      // pull(
      //   server.blogStats.read({
      //     gt: ['L', blogKey, null],
      //     lt: ['L', blogKey+'~', undefined],
      //     // gt: ['L', blogKey, null],
      //     // lte: ['L', blogKey+'~', undefined],
      //     // limit: 100,
      //     keys: true,
      //     values: true,
      //     seqs: false,
      //     reverse: true
      //   }),
      //   // pull.filter(o => o.key[1] === blogKey),
      //   pull.log(() => console.log('DONE'))
      // )
      /// ///// test code /////
    })
    const canvas = h('canvas', { height: 200, width: 600, style: { height: '200px', width: '600px' } })

    const page = h('Page -statsShow', [
      h('div.content', [
        h('h1', 'Stats'),
        h('section.totals', [
          h('div.comments', [
            h('div.count', computed(rangeComments, msgs => msgs.length)),
            h('strong', 'Comments'),
            '(30 days)'
          ]),
          h('div.likes', [
            h('div.count', computed(rangeLikes, msgs => msgs.length)),
            h('strong', 'Likes'),
            '(30 days)'
          ]),
          h('div.shares', [
          ])
        ]),
        h('section.graph', [
          canvas,
          // TODO insert actual graph
          h('div', [
            // h('div', [ 'Comments ', map(rangeComments, msg => [new Date(msg.value.timestamp).toDateString(), ' ']) ]),
            // h('div', [ 'Likes ', map(rangeLikes, msg => [new Date(msg.value.timestamp).toDateString(), ' ']) ])
          ]),
          h('div.changeRange', [
            h('a', { href: '#', 'ev-click': () => howFarBack.set(howFarBack() + 1) }, '< Prev 30 days'),
            ' | ',
            h('a', { href: '#', 'ev-click': () => howFarBack.set(howFarBack() - 1) }, 'Next 30 days >')
          ])
        ]),
        h('table.blogs', [
          h('thead', [
            h('tr', [
              h('th.details'),
              h('th.comment', 'Comments'),
              h('th.likes', 'Likes')
            ])
          ]),
          h('tbody', map(store.blogs, blog => h('tr.blog', { id: blog.key }, [
            h('td.details', [
              h('div.title', {}, getTitle(blog)),
              h('a',
                {
                  href: '#',
                  'ev-click': viewBlog(blog)
                },
                'View blog'
              )
            ]),
            h('td.comments', computed(store.comments.get(blog.key), msgs => msgs ? msgs.length : 0)),
            h('td.likes', computed(store.likes.get(blog.key), msgs => msgs ? msgs.length : 0))
          // ]), { comparer: (a, b) => a === b }))
          ])))
        ])
      ])
    ])

    Chart.scaleService.updateScaleDefaults('linear', {
      ticks: { min: 0 }
    })
    var chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        datasets: [{
          // label: 'My First dataset',
          backgroundColor: 'hsla(215, 57%, 60%, 1)', // 'hsla(215, 57%, 43%, 1)',
          borderColor: 'hsla(215, 57%, 60%, 1)',
          // TODO set initial data as empty to make a good range
          data: [
          ]
        }]
      },
      options: {
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            type: 'time',
            distribution: 'linear',
            time: {
              unit: 'day',
              min: new Date(range().lower),
              max: new Date(range().upper)
            },
            bounds: 'ticks',
            ticks: {
              maxTicksLimit: 4
            },
            gridLines: {
              display: false
            },
            maxBarThickness: 20
          }],

          yAxes: [{
            ticks: {
              suggestedMin: 0,
              suggestedMax: 10,
              maxTicksLimit: 5
            }
          }]
        },
        animation: {
          duration: 300
        }
      }
    })

    const toDay = ts => Math.floor(ts / (24 * 60 * 60 * 1000))
    const rangeCommentData = computed(rangeComments, msgs => {
      const grouped = groupBy(msgs, m => toDay(m.value.timestamp))

      var data = Object.keys(grouped)
        .map(day => {
          return {
            t: day * 24 * 60 * 60 * 1000,
            y: grouped[day].length
          }
        })
      return data
    })
    rangeCommentData((newData) => {
      chart.data.datasets[0].data = newData

      chart.options.scales.xAxes[0].time.min = new Date(range().lower)
      chart.options.scales.xAxes[0].time.max = new Date(range().upper)

      chart.update()
    })

    return page
  }

  function viewBlog (blog) {
    return () => api.history.sync.push(blog)
  }
}

function getTitle (blog) {
  if (blog.value.content.title) return blog.value.content.title
  else if (blog.value.content.text) return marksum.title(blog.value.content.text)
  else return blog.key
}

function fetchBlogs ({ server, store }) {
  pull(
    server.blogStats.readBlogs({ reverse: false }),
    pull.drain(blog => {
      store.blogs.push(blog)

      fetchComments({ server, store, blog })
      fetchLikes({ server, store, blog })
    })
  )
}

function fetchComments ({ server, store, blog }) {
  if (!store.comments.has(blog.key)) store.comments.put(blog.key, MutantArray())

  pull(
    server.blogStats.readComments(blog),
    pull.drain(msg => {
      store.comments.get(blog.key).push(msg)
      // TODO remove my comments from count?
    })
  )
}

function fetchLikes ({ server, store, blog }) {
  if (!store.likes.has(blog.key)) store.likes.put(blog.key, MutantArray())

  pull(
    server.blogStats.readLikes(blog),
    pull.drain(msg => {
      store.likes.get(blog.key).push(msg)
      // TODO this needs reducing... like + unlike are muddled in here
      //   find any thing by same author
      //   if exists - over-write or delete
    })
  )
}