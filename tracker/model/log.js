var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Log = Schema({
    //日期
    date: {type: Date},
    //开始时间
    start: {type: Date},
    //结束时间
    end: {type: Date},
    //备注
    note: String,
    //时间类别
    classes: Array,
    //标签
    tags: Array,
    //项目 /book movie music program
    projects: Array,
    //原始日志
    origin: String
});

module.exports = mongoose.model('Log', Log);
