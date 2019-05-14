// 公共函数模块
const fs = require('fs');

// 读取文件
exports.readFile = function (pathname) {
    return new Promise (function (resolve, reject) {
        fs.readFile(pathname, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};


// 格式化时间
exports.getDate = function () {
    let data = new Date();
    let year = data.getFullYear();
    let month = (data.getMonth() + 1).toString().padStart(2, '0');
    let day = (data.getDate()).toString().padStart(2, '0');
    let hour = (data.getHours()).toString().padStart(2, '0');
    let minute = (data.getMinutes()).toString().padStart(2, '0');
    let second = (data.getSeconds()).toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

// 获取当前年份
exports.getYear = function () {
    let data = new Date();
    let year = data.getFullYear();
    return year;
};