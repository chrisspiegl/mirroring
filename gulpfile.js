process.env.NODE_ENV = process.env.NODE_ENV || 'local'
process.env.NODE_PATH = '.'
require("module").Module._initPaths(); // this is needed to update NODE_PATH at runtime of Gulp
const path = require('path')
const config = require(path.join(__dirname, './config'))

const async = require('async')
const browserSync = require('browser-sync').create()
const changed = require('gulp-changed')
const clean = require('gulp-clean')
const composer = require('gulp-uglify/composer')
const concat = require('gulp-concat')
const gif = require('gulp-if')
const gulp = require('gulp')
const multiProcess = require('gulp-multi-process')
const nodemon = require('gulp-nodemon')
const notify = require('gulp-notify')
const pump = require('pump')
const sass = require('gulp-sass')
const sourcemaps = require('gulp-sourcemaps')
const uglifyjs = require('uglify-es')

const minify = composer(uglifyjs)

const paths = {
  clean: ['public/*'],
  copy: {
    'public/assets/images': {
      cwd: './frontend/images',
      src: '**/*'
    },
    'public/assets/fonts': {
      cwd: './frontend/fonts',
      src: '**/*'
    },
    'public': {
      cwd: './frontend',
      src: ['robots.txt']
    }
  },
  views: ['views/**/*'],
  sass: [
    'frontend/**/*.scss',
    'ftonend/**/*.sass'
  ],
  js: [
    'node_modules/clipboard/dist/clipboard.js',
    'node_modules/jquery/dist/jquery.js',
    'frontend/script.js'
  ],
  server: ['data/livereload.json']
}

const onError = (err) => {
  console.error(err)
}

let isProductionMode = false

gulp.task('setProductionMode', (cb) => {
  isProductionMode = true
  return cb()
})

gulp.task('clean', (cb) => {
  pump([
    gulp.src(paths.clean, { read: false }),
    clean(),
    notify('Cleanup Public Directory')
  ], cb)
})

gulp.task('copy', (cb) => {
  return async.forEachOf(paths.copy, function (src, dest, cb) {
    pump([
      gulp.src(src.src, { cwd: src.cwd }),
      changed(dest),
      gulp.dest(dest)
    ], cb)
  }, function (err) {
    if (err) console.log(err)
    notify('Build Copy Reloading')
    if (browserSync.active) browserSync.reload()
    return cb()
  })
})

gulp.task('buildSass', (cb) => {
  const sassOptions = {
    outputStyle: (!isProductionMode) ? 'expanded' : 'compressed'
  }
  pump([
    gulp.src(paths.sass),
    gif(!isProductionMode, sourcemaps.init()),
    sass(sassOptions).on('error', sass.logError),
    gif(!isProductionMode, sourcemaps.write()),
    gulp.dest('public/assets'),
    gif(browserSync.active, browserSync.stream()),
    notify('Build Styles Reloading')
  ], cb)
})

gulp.task('buildJs', (cb) => {
  const options = {
    output: {
      comments: /^!/,
      shebang: true
    }
  }
  pump([
    gulp.src(paths.js),
    gif(!isProductionMode, sourcemaps.init()),
    concat('script.js'),
    gif(isProductionMode, minify(options)),
    gif(!isProductionMode, sourcemaps.write()),
    gulp.dest('public/assets'),
    gif(browserSync.active, browserSync.stream()),
    notify('Build Javascript Reloading')
  ], cb)
})

gulp.task('buildViews', (cb) => {
  pump([
    gulp.src(paths.views),
    gif(browserSync.active, browserSync.stream()),
    notify('Build Views Reloading')
  ], cb)
})

gulp.task('buildServer', (cb) => {
  if (!browserSync.active) {
    return browserSync.init({
      proxy: 'localhost:3000',
      port: 8080,
      ui: {
        port: 8081
      }
    }).emitter.on('init', function () {
      console.log('Browsersync is running!')
      return cb()
    })
  } else {
    return pump([
      gulp.src(paths.server),
      gif(browserSync.active, browserSync.stream()),
      notify('Build Server Reloading')
    ], cb)
  }
})

gulp.task('localtunnelWebserver', (cb) => {
  var localtunnel = require('localtunnel')

  var opts = {
    subdomain: 'spieglio-npc-bw2siafw63'
  }
  var tunnel = localtunnel(config.server.port, opts, function (err, tunnel) {
    if (err) console.log(err)
    else console.log(tunnel.url)
  })

  tunnel.on('close', function () {
    console.log('tunnel closed')
    return cb()
  })
})

gulp.task('watch', (cb) => {
  return (
    gulp.watch(paths.sass).on('all', gulp.series('buildSass')),
    gulp.watch(paths.js).on('all', gulp.series('buildJs')),
    gulp.watch(paths.views).on('all', gulp.series('buildViews')),
    gulp.watch(paths.server).on('all', gulp.series('buildServer'))
  )
})

gulp.task('startWebserver', function (cb) {
  const stream = nodemon({
    script: 'server/index.js',
    ext: 'js',
    watch: ['server'],
    env: {
      LOCALTUNNEL: 0,
      NODE_PATH: '.',
      NODE_ENV: config.env,
      DEBUG: `${config.slug}:*`
    }
  })

  stream.on('start', () => {
    console.log('nodemon webserver => started')
  })
    .on('quit', () => cb())
    .on('restart', function () {
      console.log('nodemon webserver => restart')
    })
    .on('crash', function () {
      console.error('nodemon webserver => app crasehd\n')
      // stream.emit('restart', 10)  // restart the server in 10 seconds
    })
})

gulp.task('default', gulp.parallel('startWebserver', 'watch'))

gulp.task('build', gulp.parallel('copy', 'buildSass', 'buildJs'))
gulp.task('buildClean', gulp.series('clean', gulp.parallel('copy', 'buildSass', 'buildJs')))
gulp.task('buildProduction', gulp.series('setProductionMode', 'buildClean'))
