var express = require('express'),
	cheerio = require('cheerio'),
	request = require('request'),
	he = require('he'),
	port = process.env.PORT || 5050,
	app = express();

app.get('/', function(req, res) {

	// Init vars
	var	url = 'http://www.myfitnesspal.com/food/search',
		userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:22.0) Gecko/20100101 Firefox/22.0';

	if (!req.query.s) {
		return res.json({error: 'No query sent'});
	}

	var page = req.query.page || 1;

	request.post(url, { form: { search: req.query.s, page: page } }, function(err, r) {

		if (err || r.statusCode !== 200) {
			console.log(err);
			return res.send({error: err});
		}

		var	$ = cheerio.load(r.body);

		var foodList = $('.food_search_results li');

		var allFood = [];

		foodList.each(function(i, item) {

			var info = $(item).find('.nutritional_info').html();
			var desc = $(item).find('.food_description');

			var name1 = desc.find('a:nth-child(1)').html();
			var name2 = desc.find('a:nth-child(2)').html();

			var splitter = info.replace(/\t/g, '').split('\n');

			var nutObj = {
				name: he.decode(name1 + ' (' + name2 + ')')
			};

			splitter.forEach(function(split, i) {

				if (split) {

					split = split.replace(',', '');
					split = split.replace(':', '');

					var value = split.replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/ig, '');

					value = he.decode(trim1(value));

					var key;

					split.replace(/<label>(.*?)<\/label>/g, function() {
						key = trim1(arguments[1]).toLowerCase().replace(/ /g, '_');
					});

					if (key === 'calories') {

						var kj = value * 4.184;

						kj = kj.toFixed(1);

						nutObj['kilojoules'] = kj;
					}

					nutObj[key] = value;

				}

			});

			allFood.push(nutObj);

		});

		res.set('Content-Type', 'text/json');
		res.json(allFood);

	});

});

app.listen(port, function() {
	console.log('Listening on ' + port);
});

function trim1 (str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}