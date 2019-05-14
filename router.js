const express = require('express');
const db = require('./model.js');
const path = require('path');
const fn = require('./functions');
const fs = require('fs');
// 导入文件上传需要的包
const multer = require('multer');
const md5 = require('blueimp-md5');


let router = express.Router();

let year = fn.getYear();

var storage = multer.diskStorage({
    //设置上传后文件路径，uploads文件夹会自动创建。
    destination: function (req, file, cb) {
        let pathName = path.join(__dirname, `./public/uploads/${year}`);
        // 判断文件夹是否存在
        if (!fs.existsSync(pathName)) {
            // 创建文件夹
            fs.mkdirSync(pathName);
        }
        cb(null, pathName);
    }, 
    //给上传文件重命名，获取添加后缀名
     filename: function (req, file, cb) {
         var fileFormat = (file.originalname).split(".");
         cb(null, file.fieldname + '-' + Date.now() + "." + fileFormat[fileFormat.length - 1]);
     }
});  
//添加配置文件到 muler 对象 --- single('image') 中的参数必须和文件上传时的 键 一样
var upload = multer({
    storage: storage
}).single('image');


// 判断是否登录

// 管理员登录
router.post('/admin/login', async (req, res, next) => {
    try {
        const username = req.body.username;
        const user = await db.query(`select * from users where username = '${username}' limit 0, 1;`);
        if (user.length <= 0) {
            return res.json({
                success: false,
                message: '用户名错误'
            });
        }
        const password = md5(req.body.password + 'pei');
        if (password != user[0].password) {
            return res.json({
                success: false,
                message: '密码错误'
            });
        }
        // 判断登录权限
        if (user[0].status != 1) {
            return res.json({
                success: false,
                message: '用户名密码错误'
            });
        }
        // 登陆成功
        req.session.user = user[0];
        res.json({
            success: true,
            message: '登陆成功',
            user: {
                id: user[0].id,
                username: user[0].username,
                sex: user[0].sex,
                nickname: user[0].nickname,
                avatar: user[0].avatar,
                bio: user[0].bio,
                register_time: user[0].register_time
            }
        });
    } catch (err) {
        next(err);
    }
});

// 图片上传 
router.post('/add-post/uploadimg', (req, res, next) => {
    upload(req, res, function (err) {
        console.log('-----------------开始上传------------------');
        if (err) {
            console.log(err);
            return res.json({
                success: false,
                message: '上传图片失败'
            });
        }
        let url = 'http://' + req.headers.host + `/public/uploads/${year}/` + req.file.filename;
        res.json({
            success: true,
            data: {
                url: url
            }
        })
        console.log('-----------------上传完成------------------');
        console.log('-----------------文件信息: ');
        console.log(req.file ? req.file : '文件错误');
      });
});

// 获取分类信息
router.get('/select-categories', async (req, res, next) => {
    try {
        const categories = await db.query(`select * from categories`);
        if (categories.length <= 0) {
            return res.json({
                success: false,
                message: '获取分类失败'
            });
        }
        res.json({
            success: true,
            data: categories
        })
    } catch (err) {
        next(err);
    }
});

// 添加文章
router.post('/add-post', async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.title && !data.category_id && !data.abstract && !data.status && !data.feature && !data.content) {
            return res.json({
                success: false,
                message: '添加文章失败，缺少必要参数'
            });
        }
        const add_time = fn.getDate();
        const user_id = req.session.user.id;
        const sql = `insert into posts values(null, '${data.title}', '${data.abstract}', '${data.feature}', '${add_time}', '${data.content}', 0, 0, '${data.status}', ${user_id}, ${data.category_id})`
        const result = await db.query(sql);
        res.json({
            success: true,
            message: '添加文章成功'
        });
    } catch (err) {
        console.log(err);
        res.json({
            success: false,
            message: '添加文章失败'
        });
    }
});

// 获取文章列表
router.get('/posts', async (req, res, next) => {
    try {
        let where = '1 = 1';
        let page = req.query.page;
        const pageNum = req.query.pageNum;
        const category_id =  req.query.category_id;
        const status = req.query.status;
        if (category_id) {
            where = `${where} and category_id = ${category_id}`;
        }
        if (status) {
            where = `${where} and posts.status = '${status}'`;
        }
        const sumSql = `select count(1) as sum
        from posts 
        inner join users on posts.user_id = users.id
        inner join categories on posts.category_id = categories.id
        where ${where}`;
        const sum = await db.query(sumSql);
        const totalPage = Math.ceil(sum[0].sum / pageNum); 
        if (page <= 0) {
            page = 1;
        }
        if (page > totalPage) {
            page = totalPage;
        }
        const offset = page * pageNum - pageNum;
        const sql = `select posts.id, posts.title, posts.add_time, posts.status, users.nickname, categories.name as category
        from posts
        inner join users on posts.user_id = users.id
        inner join categories on posts.category_id = categories.id
        where ${where}
        order by posts.add_time desc
        limit ${offset}, ${pageNum}`;
        const data = await db.query(sql);
        res.json({
            success: true,
            data,
            page,
            pageNum,
            totalPage
        });
    } catch (err) {
        res.json({
            success: false,
            message: '该分类暂时没有数据'
        });
    }
});

// 删除文章
router.get('/posts/delete', (req, res, next) => {
    try {
        const id = Number.parseInt(req.query.id);
        if (!/^[0-9]*$/.test(id)) {
            throw new Error('请传入正确的参数');
        }
        const result = db.query(`delete from posts where id = ${id}`);
        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '删除失败'
        });
    }
});

// 增加分类 
router.post('/add-category', (req, res, next) => {
    try {
        const categoryName = req.body.category;
        const result = db.query(`insert into categories values(null, '${categoryName}')`);
        res.json({
            success: true,
            message: '添加分类成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '添加分类失败'
        })
    }   
});

// 删除分类
router.get('/delete-category', (req, res, next) => {
    try {
        const id = Number.parseInt(req.query.id);
        if (!/^[0-9]*$/.test(id)) {
            throw new Error('请传入正确的参数');
        }
        const result = db.query(`delete from categories where id = ${id}`);
        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '删除失败'
        });
    }
});

// 获取评论
router.get('/comments', async (req, res, next) => {
    try {
        const count = await db.query(`select count(1) as count from comments inner join posts on posts.id = comments.posts_id`);
        if (count.length <= 0) {
            throw err;
        }
        const dateSum = count[0].count;
        let page = req.query.page;
        const pageNum = req.query.pageNum;
        const totalPage = Math.ceil(dateSum / pageNum);
        if (page <= 0) {
            page = 1;
        }
        if (page > totalPage) {
            page = totalPage;
        }
        const offset = page * pageNum - pageNum;
        const sql = `select comments.*, title
        from comments
		inner join posts on posts.id = comments.posts_id
        order by add_time desc
        limit ${offset}, ${pageNum}`;
        const data = await db.query(sql);
        // 处理数据
        data.forEach(item => {
            item.reply = JSON.parse(item.reply);
        });
        res.json({
            success: true,
            data,
            page,
            pageNum,
            totalPage
        })
    } catch (err) {
        res.json({
            success: false,
            message: '获取评论数据失败'
        });
    }
});

// 添加评论回复
router.post('/add-reply', async (req, res, next) => {
    try {
        const body = req.body;
        const comment = await db.query(`select * from comments where id = ${body.comment_id}`);
        if (comment.length <= 0) {
            throw err;
        }
        const reply = JSON.parse(comment[0].reply || '[]');
        const replyData = {
            reply_user_name: body.reply_user_name,
            aite: body.aite,
            reply_user_img: body.reply_user_img,
            reply_content: body.reply_content,
            add_time: fn.getDate()
        };
        reply.push(replyData);
        const replyStr = JSON.stringify(reply);
        const result = await db.query(`update comments set reply = '${replyStr}' where id = ${body.comment_id}`);
        res.json({
            success: true,
            message: '添加评论回复成功',
            replyData
        });
    } catch (err) {
        res.json({
            success: false,
            message: '添加评论回复失败'
        });
    }
});

// 添加评论
router.post('/add-comment', async (req, res, next) => {
    try {
        const body = req.body;
        const add_time = fn.getDate();
        const sql = `insert into comments
        values(null, ${body.posts_id}, '${body.content}', '${body.comment_user_name}', '${body.comment_user_img}', '${add_time}', '[]')`;
        const result = await db.query(sql);
        res.json({
            success: true,
            message: '发表评论成功',
        });
    } catch (err) {
        res.json({
            success: false,
            message: '发表评论失败'
        });
    }
});

// 删除评论回复
router.get('/delete-reply', async (req, res, next) => {
    try {
        const index = req.query.index;
        const id = req.query.id;
        const comment = await db.query(`select * from comments where id = ${id}`);
        if (comment.length <= 0) {
            throw err;
        }
        const reply = JSON.parse(comment[0].reply || '[]');
        if (index > reply) {
            throw err;
        }
        reply.splice(index, 1);
        const replyStr = JSON.stringify(reply);
        const result = await db.query(`update comments set reply = '${replyStr}' where id = ${id}`);
        res.json({
            success: true,
            message: '删除评论回复成功',
        });
    } catch (err) {
        res.json({
            success: false,
            message: '删除评论回复失败'
        });
    }   
});

// 删除评论
router.get('/delete-comment', async (req, res, next) => {
    try {
        const id = req.query.id;
        if (!/^[0-9]*$/.test(id)) {
            throw err;
        }
        const result = await db.query(`delete from comments where id = ${id}`);
        res.json({
            success: true,
            message: '删除评论成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '删除评论失败'
        });
    }
});

// 获取留言
router.get('/get-liuyan', async (req, res, next) => {
    try {
        const count = await db.query(`select count(1) as count from liuyan`);
        if (count.length <= 0) {
            throw err;
        }
        const dateSum = count[0].count;
        let page = req.query.page;
        const pageNum = req.query.pageNum;
        const totalPage = Math.ceil(dateSum / pageNum);
        if (page <= 0) {
            page = 1;
        }
        if (page > totalPage) {
            page = totalPage;
        }
        const offset = page * pageNum - pageNum;
        const sql = `select *
        from liuyan
        order by add_time desc
        limit ${offset}, ${pageNum}`;
        const data = await db.query(sql);
        // 处理数据
        data.forEach(item => {
            item.reply = JSON.parse(item.reply);
        });
        res.json({
            success: true,
            data,
            page,
            pageNum,
            totalPage
        })
    } catch (err) {
        res.json({
            success: false,
            message: '获取留言数据失败'
        });
    }
});

// 添加留言
router.post('/add-liuyan', async (req, res, next) => {
    try {
        const body = req.body;
        const add_time = fn.getDate();
        const sql = `insert into liuyan
        values(null, '${body.content}', '${body.ly_user_name}', '${body.ly_user_img}', '${add_time}', '[]')`;
        const result = await db.query(sql);
        res.json({
            success: true,
            message: '添加留言成功',
        });
    } catch (err) {
        res.json({
            success: false,
            message: '添加留言失败'
        });
    }
});

// 添加留言回复
router.post('/add-liuyan-reply', async (req, res, next) => {
    try {
        const body = req.body;
        const liuyan = await db.query(`select * from liuyan where id = ${body.liuyan_id}`);
        if (liuyan.length <= 0) {
            throw err;
        }
        const reply = JSON.parse(liuyan[0].reply || '[]');
        const replyData = {
            reply_user_name: body.reply_user_name,
            aite: body.aite,
            reply_user_img: body.reply_user_img,
            reply_content: body.reply_content,
            add_time: fn.getDate()
        };
        reply.push(replyData);
        const replyStr = JSON.stringify(reply);
        const result = await db.query(`update liuyan set reply = '${replyStr}' where id = ${body.liuyan_id}`);
        res.json({
            success: true,
            message: '添加留言回复成功',
            replyData
        });
    } catch (err) {
        res.json({
            success: false,
            message: '添加留言回复失败'
        });
    }
});

// 删除留言回复 
router.get('/delete-liuyan-reply', async (req, res, next) => {
    try {
        const index = req.query.index;
        const id = req.query.id;
        const comment = await db.query(`select * from liuyan where id = ${id}`);
        if (comment.length <= 0) {
            throw err;
        }
        const reply = JSON.parse(comment[0].reply || '[]');
        if (index > reply) {
            throw err;
        }
        reply.splice(index, 1);
        const replyStr = JSON.stringify(reply);
        const result = await db.query(`update liuyan set reply = '${replyStr}' where id = ${id}`);
        res.json({
            success: true,
            message: '删除留言回复成功',
        });
    } catch (err) {
        res.json({
            success: false,
            message: '删除留言回复失败'
        });
    }   
});

// 删除留言
router.get('/delete-liuyan', async (req, res, next) => {
    try {
        const id = req.query.id;
        if (!/^[0-9]*$/.test(id)) {
            throw err;
        }
        const result = await db.query(`delete from liuyan where id = ${id}`);
        res.json({
            success: true,
            message: '删除留言成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '删除留言失败'
        });
    }
});

// 修改个人信息
router.post('/update-personal-data', async (req, res, next) => {
    try {
        const body = req.body;
        const sql = `update users
        set nickname = '${body.nickname}', avatar = '${body.avatar}', bio = '${body.bio}', sex = '${body.sex}'
        where id = ${body.id}`;
        const result = await db.query(sql);
        const user = await db.query(`select * from users where id = ${body.id}`);
        req.session.user = user[0];
        res.json({
            success: true,
            user: body,
            message: '修改资料成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '修改资料失败'
        });
    }
});

// 修改密码
router.post('/update-password', async (req, res, next) => {
    try {
        const oldPass = md5(req.body.oldPass + 'pei');
        const newPass = md5(req.body.newPass + 'pei');
        if (oldPass !== req.session.user.password) {
            
            throw err;
        }
        const result = await db.query(`update users set password = '${newPass}' where id = ${req.session.user.id}`);
        req.session.user.password = newPass;
        res.json({
            success: true,
            message: '修改密码成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '修改密码失败'
        });
    }
});

// 退出登录
router.get('/logout', (req, res, next) => {
    try {
        // 销毁 session
        req.session.destroy();
        res.json({
            success: true,
            message: '退出登录成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '退出登录失败'
        });
    }
});

// 获取网站设置
router.get('/get-site-setting', async (req, res, next) => {
    try {
        const data = await db.query('select * from options where id in (2, 3, 4, 5)');
        if (data.length <= 0) {
            throw err;
        }
        const options = {
            avatar: data[0].value,
            title: data[1].value,
            description: data[2].value,
            keywords: data[3].value
        };
        res.json({
            success: true,
            data: options
        });
    } catch (err) {
        res.json({
            success: false,
            message: '获取网站设置失败'
        });
    }
});

// 设置网站选项
router.post('/set-site-setting', async (req, res, next) => {
    try {
        const body = req.body;
        const result1 = await db.query(`update options set value = '${body.avatar}' where id = 2`);
        const result2 = await db.query(`update options set value = '${body.title}' where id = 3`);
        const result3 = await db.query(`update options set value = '${body.description}' where id = 4`);
        const result4 = await db.query(`update options set value = '${body.keywords}' where id = 5`);
        res.json({
            success: true,
            message: '修改网站选项成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '设置网站选项失败'
        });
    }
});

// 获取后台页面
router.get('/admin', async (req, res, next) => {
    try {
        res.render('./admin/index.html');
    } catch (err) {
        next(err);
    }
});

// 获取前台页面
router.get('/', async (req, res, next) => {
    try {
        const options = await db.query(`select * from options where id in (2, 3, 4, 5)`);
        res.render('index.html', {
            icon: options[0].value,
            title: options[1].value,
            description: options[2].value,
            keywords: options[3].value
        });
    } catch (err) {
        next(err);
    }
});

// 获取首页需要的数据
router.get('/get-data-statistics', async (req, res, next) => {
    try {
        const comments = await db.query(`select count(1) as count from comments`);
        const categories = await db.query(`select count(1) as count from categories`);
        const posts = await db.query(`select count(1) as count from posts`);
        res.json({
            success: true,
            data: {
                comments: comments[0].count,
                categories: categories[0].count,
                posts: posts[0].count,
            }
        });
    } catch (err) {
        res.json({
            success: false,
            message: '获取数据失败'
        });
    }
});

// 获取轮播图
router.get('/slideshow', async (req, res, next) => {
    try {
        let data = await db.query('select * from options where id = 7');
        if (data.length <= 0) {
            throw err;
        }
        data = JSON.parse(data[0].value);
        res.json({
            success: true,
            data
        });
    } catch (err) { 
        res.json({
            success: false,
            success: '获取轮播图数据失败'
        });
    }
});

// 获取首页需要的文章信息
router.get('/get-all-posts', async (req, res, next) => {
    try {
        const sql = `select DISTINCT posts.id, title, feature, abstract, categories.name, posts.add_time, views, likes, count(comments.id) as num
        from posts
        inner join categories on posts.category_id = categories.id
        LEFT  join comments on comments.posts_id = posts.id
        group by posts.id
        order by posts.add_time desc`;
        const data = await db.query(sql);
        if (data.length <= 0) {
            throw err;
        }
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.json({
            success: false,
            message: '获取文章列表失败'
        });
    }
});

// 根据分类获取文章信息
router.get('/get-category-posts', async (req, res, next) => {
    try {
        const category_id = Number.parseInt(req.query.id);
        const sql = `select DISTINCT posts.id, title, feature, abstract, categories.name, posts.add_time, views, likes, count(comments.id) as num
        from posts
        inner join categories on posts.category_id = categories.id
        LEFT  join comments on comments.posts_id = posts.id
        where posts.category_id = ${category_id}
        group by posts.id
        order by posts.add_time desc`;
        const data = await db.query(sql);
        if (data.length <= 0) {
            return res.json({
                success: false,
                message: '暂无分类数据'
            });
        }
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.json({
            success: false,
            message: '获取文章列表失败'
        });
    }
});

// 搜索文章信息
router.get('/search', async (req, res, next) => {
    try {
        const key = req.query.key;
        const sql = `select DISTINCT posts.id, title, feature, abstract, categories.name, posts.add_time, views, likes, count(comments.id) as num
        from posts
        inner join categories on posts.category_id = categories.id
        LEFT  join comments on comments.posts_id = posts.id
        where title like '${key}%'
        group by posts.id`;
        const data = await db.query(sql);
        if (data.length <= 0) {
            return res.json({
                success: false,
                message: '暂无相关文章'
            });
        }
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.json({
            success: false,
            message: '搜索失败'
        });
    }
});

// 根据 id 获取文章，以及评论
router.get('/get-posts', async (req, res, next) => {
    try {
        const id =  Number.parseInt(req.query.id);
        if (!/^[0-9]*$/.test(id) && !id) {
            throw err;
        }
        const result = await db.query(`update posts set views = views + 1 where id = ${id}`);
        const sql = `select posts.id, title, categories.name, posts.add_time, views, likes, posts.content, count(comments.id) as comment_num
        from posts
        inner join categories on posts.category_id = categories.id
        inner join comments on comments.posts_id = posts.id
        where comments.posts_id = ${id} and posts.id = ${id}`;
        const data = await db.query(sql);
        if (data.length <= 0) {
            throw err;
        }
        const comments = await db.query(`select * from comments where posts_id = ${id} order by add_time desc`);
        if (comments.length > 0) {
            comments.forEach(item => {
                item.reply = JSON.parse(item.reply);
            });
        }
        res.json({
            success: true,
            data: data[0],
            comments
        });
    } catch (err) {
        res.json({
            success: false,
            message: '获取文章失败'
        });
    }
});

// 获取前台需要的留言
router.get('/get-liuyan-index', async (req, res, next) => {
    try {
        const liuyan = await db.query(`select * from liuyan order by add_time desc`);
        if (liuyan.length <= 0) {
            throw err;
        }
        liuyan.forEach(item => item.reply = JSON.parse(item.reply));
        res.json({
            success: true,
            liuyan
        });
    } catch (err) {
        res.json({
            success: false,
            message: '暂无留言数据'
        });
    }
});

// 普通用户登录
router.post('/login', async (req, res, next) => {
    try {
        const username = req.body.username;
        const user = await db.query(`select * from users where username = '${username}' limit 0, 1;`);
        if (user.length <= 0) {
            return res.json({
                success: false,
                message: '用户名错误'
            });
        }
        const password = md5(req.body.password + 'pei');
        if (password != user[0].password) {
            return res.json({
                success: false,
                message: '密码错误'
            });
        }
        // 登陆成功
        req.session.user = user[0];
        res.json({
            success: true,
            message: '登陆成功',
            user: {
                id: user[0].id,
                username: user[0].username,
                sex: user[0].sex,
                nickname: user[0].nickname,
                avatar: user[0].avatar,
                bio: user[0].bio,
                register_time: user[0].register_time
            }
        });
    } catch (err) {
        next(err);
    }
});

// 普通用户注册
router.post('/register', async (req, res, next) => {
    try {
        const username = req.body.username;
        const nickname = req.body.nickname;
        const sex = req.body.sex;
        const password = md5(req.body.password + 'pei');
        const status = 3;
        const avatar = 'http://127.0.0.1:5000/public/images/avatar-default.png';
        const register_time = fn.getDate();
        let result = await db.query(`select id from users where username = '${username}' limit 0, 1;`);
        if (result.length != 0) {
            return res.json({
                success: false,
                statusCode: 1,
                message: '用户名已存在'
            });
        }
        result = await db.query(`select id from users where nickname = '${nickname}' limit 0, 1;`);
        if (result.length != 0) {
            return res.json({
                success: false,
                statusCode: 2,
                message: '昵称已存在'
            });
        }
        const sql = `insert into users
        values(null, '${username}', '${password}', '${sex}', ${status}, '${nickname}', '${avatar}', null, '${register_time}')`;
        result = await db.query(sql);
        res.json({
            success: true,
            message: '注册成功'
        });
    } catch (err) {
        res.json({
            success: false,
            message: '注册失败'
        });
    }
});

module.exports = router;
