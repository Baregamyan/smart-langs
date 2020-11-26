import {src, dest, watch, parallel, series} from 'gulp';
import del from 'del';
import sass from 'gulp-sass';
import csscomb from 'gulp-csscomb';
import csso from 'gulp-csso';
import pug from 'gulp-pug';
import htmlValidator from 'gulp-w3c-html-validator';
import jsonMerge from 'gulp-merge-json';
import data from 'gulp-data';
import rename from 'gulp-rename';
import babel from 'gulp-babel';
import { terser } from 'rollup-plugin-terser';
import rollup from 'gulp-better-rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import browserSync from 'browser-sync';
import autoprefixer from 'gulp-autoprefixer';
import fs from 'fs';
import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';
import mozjpeg from 'imagemin-mozjpeg';
import pngquant from 'imagemin-pngquant';
import svgstore from 'gulp-svgstore';
import svgmin from 'gulp-svgmin';
import cheerio from 'gulp-cheerio';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify';

/**
 *  Base directories
 */
const dirs = {
  src: 'src',
  dest: 'build'
};

/**
 * Paths
 */
const path = {
  styles: {
    root: `${dirs.src}/sass/`,
    compile: `${dirs.src}/sass/style.scss`,
    save: `${dirs.dest}/css/`
  },
  views: {
    root: `${dirs.src}/pug/`,
    compile: `${dirs.src}/pug/pages/`,
    save: `${dirs.dest}`
  },
  json: {
    root: `${dirs.src}/pug/data/**/*.json`,
    save: `${dirs.src}/pug/data/`,
    compiled: `${dirs.src}/pug/data/data.json`
  },
  scripts: {
    root: `${dirs.src}/js/`,
    save: `${dirs.dest}/js/`
  },
  images: {
    root: `${dirs.src}/images/`,
    save: `${dirs.dest}/images/`
  }
};

/**
 * Main tasks
 */
export const styles = () => src(path.styles.compile)
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(csscomb())
  .pipe(dest(path.styles.save))
  .pipe(autoprefixer())
  .pipe(csso())
  .pipe(rename({
    suffix: `.min`
  }))
  .pipe(dest(path.styles.save));

export const deleteJson = () => del([path.json.compiled]);

export const mergeJson = () => src(path.json.root)
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(jsonMerge({
    fileName: 'data.json'
  }))
  .pipe(dest(path.json.save));

export const views = () => src(`${path.views.compile}*.pug`)
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(data((file) => {
    return JSON.parse(
      fs.readFileSync(path.json.compiled)
    );
  }))
  .pipe(pug({
    basedir: path.views.root
  }))
  .pipe(dest(path.views.save))
  .pipe(htmlValidator())
  .pipe(htmlValidator.reporter())
  .pipe(rename({
    extname: '.php'
  }))
  .pipe(dest(path.views.save));

export const scripts = () => src(`${path.scripts.root}/script.js`)
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(rollup({
    plugins: [
      babel({presets: ['@babel/preset-env']}),
      resolve({vmodule: true }),
      commonjs(),
      terser()
    ]
  }, 'umd'))
  .pipe(dest(path.scripts.save))

export const images = () => src(`${path.images.root}**/*`)
  .pipe(imagemin([
    pngquant({quality: [0.2, 0.8]}),
    mozjpeg({quality: 85})
  ]))
  .pipe(dest(path.images.save))
  .pipe(webp({quality: 85}))
  .pipe(dest(path.images.save));

export const clean = () => del([dirs.dest]);

export const devWatch = () => {
  const bs = browserSync.init({
    server: dirs.dest,
    notify: false,
    open: false
  });
  watch(`${path.styles.root}**/*.scss`, styles).on('change', bs.reload);
  watch(`${path.views.root}**/*.pug`, views).on('change', bs.reload);
  watch([`${path.json.save}blocks/*.json`, `${path.json.save}common/*.json` ], json).on('change', bs.reload);
  watch(`${path.scripts.root}**/*.js`, scripts).on('change', bs.reload);
  watch(`${path.images.root}**/*.pug`, images).on('change', bs.reload);
};

export const sprite = () => {
  return src(`${path.images.root}**/*.svg`)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(svgmin({
      plugins: [{
        removeTitle: false
      }]
    }))
    .pipe(cheerio({
      run: function ($) {
        $('[fill]').removeAttr('fill');
        $('[stroke]').removeAttr('stroke');
        $('[style]').removeAttr('style');
      },
      parserOptions: {xmlMode: true}
    }))
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(dest(`${path.views.root}/common/`))
};

const fonts = () => {
  return src(`${dirs.src}/fonts/*.{woff,woff2}`)
    .pipe(dest(`${dirs.dest}/fonts/`))
};

export const json = series(deleteJson, mergeJson);

/**
 * Tasks for development
 */
export const dev = series(json, sprite, parallel(styles, views, scripts, images), devWatch);

export const start = series(fonts, json, parallel(styles, views, scripts, images), devWatch);

/**
 * Tasks for build
 */
export const build = series(clean, json, fonts, sprite, parallel(styles, views, images, scripts));

export default dev;
