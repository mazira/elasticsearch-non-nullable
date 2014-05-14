# Introduction

Elasticsearch does not come with built-in support for specifying certain fields as non-nullable.
This plugin module adds this capability to the [Elasticsearch JavaScript client](https://github.com/elasticsearch/elasticsearch-js) by checking the data before it is indexed.

Note that "non-nullable" in this case does not mean "truthy" or "defined", but rather that the field cannot strictly equal `null`. That is, `undefined` is still a valid value.
Use this plugin in conjunction with [elasticsearch-required](https://github.com/mazira/elasticsearch-required) to enforce required, non-nullable fields.

# Usage
## Installation
To install elasticsearch-required

    npm install elasticsearch
    npm install --production elasticsearch-non-nullable

## Usage
This plugin augments `client.indices.putMapping()` to allow for the specification of non-nullable fields. As such, it is required that you call `putMapping` on every instance of the Elasticsearch client before indexing so that the plugin can be initialized with what fields are non-nullable.

The following example demonstrates putting the mapping and indexing:
````javascript
var Client = require('elasticsearch').Client;
require('elasticsearch-non-nullable');

// create the client
var client = ...

// put the mapping with "non-nullable" property
client.putMapping({
	"index" : "test",
	"type" : "tweet",
	"body" : {
		"tweet" : {
			"properties" : {
				"message" : {
					"type" : "string",
					"non-nullable" : true
				}
			}
		}
	}
}).then(function () {
	// the following with result in "null value" error
	return client.index({
		"index" : "test",
		"type" : "tweet",
		"body" : {
			"message" : null
		}
	});
});
````

# Testing
To run the unit tests

	npm test

# TODO
- Add support for bulk indexing
- Add support for `putMapping()` when multiple indices are specified

# License
MIT