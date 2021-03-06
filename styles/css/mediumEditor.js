const nest = require('depnest')
const requireStyle = require('require-style')
const { assign } = Object

exports.gives = nest('styles.css')

exports.create = function (api) {
  return nest('styles.css', (sofar = {}) => {
    return assign(
      sofar,
      { mediumEditorCore: requireStyle('medium-editor/dist/css/medium-editor.css') },
      { mediumEditorTheme: requireStyle('medium-editor/dist/css/themes/default.css') }
    )
  })
}

