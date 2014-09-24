/**
 * scanner helper
 * read single file or multiple files
 */
'use strict';

var dateTypeEnum = require('../enum/dateType'),
    logClassEnum = require('../enum/logClass');
var util = require('../util');
var when = require('when');
var msg = require('../message');


function readLogFile(options) {
    var dateType = options.dateType,
        dateArr = options.dateArr,
        year = dateArr[0],
        month = dateArr[1],
        day = dateArr[2];

    var promise;
    if (dateType === dateTypeEnum.Day) {
        promise = readOneDayLog(year, month, day);
    } else if (dateType === dateTypeEnum.Month){
        promise = readOneMonthLog(year, month);
    } else if (dateType === dateTypeEnum.Year) {
        promise = readOneYearLog(year);
    }

    return promise.then(preprocessFileData.bind(null, options));
}


/**
 * read only the log of one specific day
 */
function readOneDayLog(year, month, day) {
    return util.readLogFiles([year, month, day].join('-'));
}


/**
 * read only the log of one specific month
 *
 */
function readOneMonthLog(year, month) {
    //the day number of month
    var dayNum = util.getDayNumInMonth(year, month);
    var day = 1;
    var queue = [];
    while (day <= dayNum) {
        queue.push(readOneDayLog(year, month, day));
        day++;
    }
    //use when.settle: because some file may not exist
    //so when.all is not appropriate
    return when.settle(queue);
}


function readOneYearLog(year) {
    var month = 1;
    var queue = [];
    while (month <= 12) {
        queue.push(readOneMonthLog(year, month));
        month++;
    }
    //use when.settle: because some file may not exist
    //so when.all is not appropriate
    return when.settle(queue);
}

function preprocessFileData(options, fileData) {
    var dateStr = options.dateStr,
        unTrackedDays = [];
    if (options.dateType === dateTypeEnum.Month) {
        return transformMonth(fileData);
    } else if (options.dateType === dateTypeEnum.Year) {
        var allDays = [],
            allUntrackedDay = [];
        fileData.forEach(function(monthData, index) {
            var month = index + 1;
            var transformResult = transformMonth(monthData.value);
            allDays = allDays.concat(transformResult.days);
            var unTrackedDays = transformResult.unTrackedDays.map(function (val) {
                return [month, val].join('-');
            });
            allUntrackedDay = allDays.concat(unTrackedDays);
        });
        return {
            days: allDays,
            unTrackedDays: allUntrackedDay
        };
    }
    return fileData;

    function transformMonth(monthData) {
        monthData = monthData.filter(function (d, index) {
            var day = index + 1,
                date = [dateStr, day].join('-');
            if (d.state === 'rejected') {
                msg.warn(date + ' calculate fail');
                unTrackedDays.push(day);
                return false;
            } else if (d.state === 'fulfilled'){
                return true;
            }
        }).map(function (d) {
            return d.value;
        });
        var today = new Date().getDate();
        unTrackedDays = unTrackedDays.filter(function (d) {
            //future is not count;
            return d <= today;
        });
        return {
            days: monthData,
            unTrackedDays: unTrackedDays
        };
    }
}

function filterClass(logs, options) {
    var logClass = options.logClass,
        result;
    if (!logClass) { return logs; }
    Object.keys(logClassEnum).forEach(function (clsKey) {
        if (logClass === logClassEnum[clsKey]) {
            var filter = require('./filters/classes/' + clsKey.toLowerCase());
            result = logs.filter(filter);
        }
    });
    return result;
}

exports.readLogFile = readLogFile;
exports.readOneDayLog = readOneDayLog;
exports.readOneMonthLog = readOneMonthLog;
exports.filterClass = filterClass;
