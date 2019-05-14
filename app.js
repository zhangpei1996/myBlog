const express = require('express');
const bodyParser = require('body-parser');
const router = require('./router');
const session = require('express-session');
const path = require('path');
const redis = require('redis');
const RedisStore=require('connect-redis')(session);

// 1. 创建服务
const app = express();

// 2. 配置中间件

// 配置模板引擎
app.engine('html', require('express-art-template'));
app.set('views', path.join(__dirname,'./public/'));

//设置跨域访问
app.all("*", function(req, res, next) {
    if( req.headers.origin == 'http://localhost:5000' || req.headers.origin == 'http://localhost:3000' ) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length, Authorization, Accept,X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
        res.header('X-Powered-By', '3.2.1');
    }
    next();
});

// 设置公共静态资源文件
app.use('/public/', express.static('./public/'));
app.use('/node_modules/', express.static('./node_modules/'));

// 配置解析 post 请求体参数的中间件
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 连接 redis 内存数据库
const client = redis.createClient({password: "1491936"});

// 配置 session
app.use(session({
    secret: 'whxy',
    resave: true,
    saveUninitialized: true,
    name: 'session_id',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    },
    store:new RedisStore({  // 设置将 session 存储到 redis 中
        client: client,
        port: 6379,  //端口号
        host: "127.0.0.1"  //主机
    })
}));

// 3. 载入路由表
app.use(router);

// 全局错误处理中间件
app.use(function (err, req, res, next) {
    res.status(500).send('服务器繁忙，请稍后再试！');
})

// 4. 开启服务
app.listen(5000, function () {
    console.log('服务开启...');
});
