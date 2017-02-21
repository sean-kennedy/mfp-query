var express = require('express'),
    cheerio = require('cheerio'),
    request = require('request'),
    he = require('he'),
    port = process.env.PORT || 5050,
    app = express();

app.get('/', function(req, res) {

    if (!req.query.s) {
        return res.json({
            error: 'No query sent'
        });
    }

    var url = 'http://www.myfitnesspal.com/food/search',
        userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:22.0) Gecko/20100101 Firefox/22.0',
        page = req.query.page || 1,
        query = req.query.s;

    request.post(url, {
        form: {
            search: query,
            page: page
        }
    }, function(error, data) {

        if (error || data.statusCode !== 200) {

            console.log(error);

            return res.json({
                error: error
            });
        }

        var $ = cheerio.load(data.body),
            responseObj = {},
            foodList = $('.food_search_results li'),
            results = $('.result_count').html().replace(/[\n]/g, ''),
            formattedFoodList = [],
            resultObj = {};

        foodList.each(function(i, item) {

            var formattedItem = {},
                description = $(item).find('.food_description'),
                nutritionalInfo = $(item).find('.nutritional_info').html().replace(/\t/g, '').split('\n'),
                name = description.find('a:nth-child(1)').html() + ' (' + description.find('a:nth-child(2)').html() + ')';

            formattedItem.name = he.decode(name);

            nutritionalInfo.forEach(function(infoItem) {

                if (!infoItem) {
                    return;
                }

                var value,
                    key;

                infoItem = infoItem.replace(/[,:]/g, '');

                value = infoItem.replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/ig, '');
                value = he.decode(trimSpaceStartEnd(value));

                infoItem.replace(/<label>(.*?)<\/label>/g, function() {
                    key = trimSpaceStartEnd(arguments[1]).toLowerCase().replace(/ /g, '_');
                });

                if (key === 'calories') {

                    var kj = value * 4.184;

                    formattedItem['kilojoules'] = parseFloat(kj.toFixed(1));
                }

                if (key !== 'serving_size') {
                    value = parseFloat(value);
                }

                formattedItem[key] = value;

            });

            formattedFoodList.push(formattedItem);

        });

        results = trimSpaceStartEnd(results).split(' ');

        resultObj.total = parseInt(results.pop());
        resultObj.num_results = formattedFoodList.length;

        responseObj.query = query;
        responseObj.page = parseInt(page);
        responseObj.results = resultObj;
        responseObj.data = formattedFoodList;

        res.json(responseObj);

    });

});

app.listen(port, function() {
    console.log('Listening on ' + port);
});

function trimSpaceStartEnd(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}