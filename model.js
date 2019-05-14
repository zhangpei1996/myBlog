const db = require('mysql');

// 建立与 mysql 数据库的连接
const pool = db.createPool({
    host: 'localhost',
    user: 'root',
    password: '1491936',
    database: 'blog'
});


exports.query = function (sql) {
    return new Promise(function (resolve, reject) {
        if (arguments.length != 2) {
            return reject(new Error('传入参数错误'));
        }
        // 创建连接池
        pool.getConnection(function (err, connection) {
            // 没有连接处理错误
            if (err) return reject(err);
            connection.query(sql, function (error, results, fields) {
                // 连接完成，释放连接
                connection.release();
                // 错误处理
                if (error) return reject(error);
                // 返回结果
                resolve(results);
            });
        });
    });
};