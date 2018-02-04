var gulp = require('gulp'),
  connect = require('gulp-connect'),
  sass = require('gulp-ruby-sass'),
  nodemon = require('gulp-nodemon');


gulp.task('connect',function(){
  connect.server({
    livereload: true,
    port: 8005
  });
});

gulp.task('reload',function(){
  gulp.src('./dist/**/*.*')
  .pipe(connect.reload());
});

gulp.task('js-process', function(){
  gulp.src('./scripts/*.js')
  .pipe(gulp.dest('dist/scripts'));
});

gulp.task('sass',function(){
  return sass('./sass/*.scss')
  .on('error',sass.logError)
  .pipe(gulp.dest('dist/css'));
});

gulp.task('serve', function () {
    nodemon({
        script  : 'server.js',
        watch   : 'server.js'
        //...add nodeArgs: ['--debug=5858'] to debug 
        //..or nodeArgs: ['--debug-brk=5858'] to debug at server start
    }).on('restart', function () {
        setTimeout(function () {
            gulp.src('./dist/**/*.*')
              .pipe(connect.reload());
            console.log('reload browsers!');
        }, 300); // wait for the server to finish loading before restarting the browsers
    });
});

gulp.task('watch',function(){
  gulp.watch(['./sass/*.scss'], ['sass']);
  gulp.watch(['./scripts/*.js'],['js-process']);
  gulp.watch(['./dist/**/*.*'],['reload']);
  gulp.watch(['./index.html'],['reload']);
});


gulp.task('default',['connect','watch','sass','js-process','serve']);
