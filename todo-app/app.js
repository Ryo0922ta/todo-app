const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

var usersRouter = require('./routes/users');
var memoRouter = require('./routes/memo');
const allowedOrigins = ['http://127.0.0.1:8080', 'http://localhost:3000'];
// originの許可：このパスにしか設定していないから元のオリジンにレスポンシブを返していてないことに注意
const app = express();

app.use(cors({
  origin: function (origin, callback) {
    console.log('Requested Origin:', origin); // デバッグ用ログ
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use('/users', usersRouter);
// get /memo/がリクエストされるとこのmemoRouterが処理される
app.use('/memo', memoRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');

});

// グローバルなPromiseエラーのハンドリングを追加
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  // エラーの通知サービスに送信したり、ログファイルに出力する
});

module.exports = app;
