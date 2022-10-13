const gulp = require('gulp'),
  clean = require('gulp-clean'),
  jshint = require('gulp-jshint'),
  Server = require('karma').Server,
  concat = require('gulp-concat'),
  gp_rename = require('gulp-rename'),
  concatCss = require('gulp-concat-css'),
  uglifycss = require('gulp-uglifycss'),
  sass = require('gulp-sass')(require('sass')),
  connectlivereload = require('connect-livereload'),
  express = require('express'),
  path = require('path'),
  watch = require('gulp-watch'),
  autoprefixer = require('gulp-autoprefixer'),
  gulpStylelint = require('gulp-stylelint');

const startServer = (cb) => {
  const app = express();

  app.use(connectlivereload({ port: 35729 }));
  app.use(express.static('./dist'));

  var port = 4000;
  app.listen(port, '0.0.0.0', function () {
	console.log('App running and listening on port', port);
	cb();
  });
};

var tinylr;

function notifyLiveReload(event) {
  tinylr.changed({ body: { files: [path.relative(__dirname, event.path)] } });
}

const liveReload = (cb) => {
  tinylr = require('tiny-lr')();
  tinylr.listen(35729);

  cb();
};

const buildHTML = gulp.parallel(
  () => gulp.src('index.html').pipe(gulp.dest('dist')),
  () => gulp.src('components/*').pipe(gulp.dest('dist/components'))
);

const bundleVendorCSS =
  () => gulp
	.src([
	  'node_modules/font-awesome/css/font-awesome.min.css',
	  'stylesheets/vendor/*.css'
	])
	.pipe(concatCss('vendor.css'))
	.pipe(gulp.dest('dist/css'))
	.pipe(uglifycss())
	.pipe(gulp.dest('dist/css'));

const processSass =
  () => gulp
	.src(['stylesheets/main.scss'])
	.pipe(sass().on('error', sass.logError))
	.pipe(gp_rename('main.css'))
	.pipe(autoprefixer())
	.pipe(uglifycss())
	.pipe(gulp.dest('dist/css'));

const bundleVendorJS =
  () => gulp
	.src([
	  'js/vendor/jquery-3.2.1.min.js',
	  'node_modules/angular/angular.min.js',
	  'js/vendor/firebase.js',
	  'js/vendor/firebaseInitialization.js',
	  'node_modules/angularfire/dist/angularfire.min.js',
	  'node_modules/angular-*/**/angular-*.min.js',
	  '!node_modules/**/angular-mocks.js',
	  'js/vendor/*.js',
	  'node_modules/ng-dialog/**/ngDialog*.min.js',
	  'node_modules/ng-file-upload/**/ng-file-upload-all.min.js',
	  'node_modules/papaparse/papaparse.min.js',
	  'node_modules/clipboard/dist/clipboard.min.js',
	  'node_modules/vanilla-emoji-picker/dist/emojiPicker.min.js',
	  'node_modules/jspdf/dist/jspdf.umd.min.js'
	])
	.pipe(concat('vendor.js'))
	.pipe(gulp.dest('dist'));

const minifyJS =
  () => gulp
	.src(['js/*.js', 'js/**/*.js', '!js/vendor/*.js'])
	.pipe(concat('main.js'))
	.pipe(gulp.dest('dist'));

const cleanDist =
  () => gulp.src('dist/*', { read: false }).pipe(clean());

const bundle = gulp.parallel(bundleVendorCSS, bundleVendorJS, processSass, minifyJS);

const watchForChange = (cb) => {
  watch('dist/*', notifyLiveReload);
  watch(['index.html', '**/*.html'], notifyLiveReload);
  watch('components/*', buildHTML);
  watch('**/*.scss', processSass);
  watch('**/*.scss', notifyLiveReload);
  watch('js/**/*.js', minifyJS);

  cb();
};

const lint =
  () => gulp
	.src(['js/**/*.js', '!js/vendor/**/*.js'])
	.pipe(jshint('.jshintrc'))
	.pipe(jshint.reporter('jshint-stylish'));

// const lintCss =
// 	() => gulp
// 		.src(['stylesheets/*.scss'])
// 		.pipe(gulpStylelint({
// 			reporters: [
// 			  {formatter: 'string', console: true}
// 			]
// 		}));

const watchTest = (done) => {
  return new Server(
	{
	  configFile: __dirname + '/karma.conf.js',
	  singleRun: false
	},
	done
  ).start();
};

const testOnce = (done) => {
  Server.start(
	{
	  configFile: __dirname + '/karma.conf.js',
	  singleRun: true,
	  reporters: ['mocha']
	},
	function (error) {
	  done(error);
	}
  );
};

const copy = gulp.parallel(
  () => gulp
	.src('node_modules/roboto-fontface/fonts/roboto/*{Regular,Bold}.*')
	.pipe(gulp.dest('dist/fonts')),
  () => gulp
	.src('node_modules/font-awesome/fonts/*.{woff,woff2,eot,svg,ttf}')
	.pipe(gulp.dest('dist/fonts')),
  () => gulp.src('img/*').pipe(gulp.dest('dist/img')),
  () => gulp.src('favicon.ico').pipe(gulp.dest('dist')),
  () => gulp.src('firebase.json').pipe(gulp.dest('dist')),
  //() => gulp.src('README.md').pipe(gulp.dest('dist')),
  //() => gulp.src('CNAME').pipe(gulp.dest('dist')),
  buildHTML
);

gulp.task('default', gulp.series(cleanDist, gulp.parallel(bundle, copy, startServer, liveReload), watchForChange));
gulp.task('test', watchTest);
gulp.task('testci', testOnce);
gulp.task('build', gulp.series(cleanDist, gulp.parallel(bundle, copy)));
gulp.task('lint', gulp.series(lint, /*lintCss*/));