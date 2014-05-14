// npm
var ESClient = require('elasticsearch').Client;
var Promise = require('bluebird');

// file vars
var apis = ['master', '1.x', '1.1', '1.0', '0.90'];

apis.forEach(function (api) {
	api = ESClient.apis[api];

	var putMappingOriginal = api.indices.prototype.putMapping;
	var indexOriginal = api.index;

	/**
	 * Overrides client.indices.putMapping
	 * @param params
	 * @param cb
	 * @returns {*}
	 */
	api.indices.prototype.putMapping = function (params, cb) {
		var mapping = params.body[params.type];

		// get the non-nullabe fields from the mapping
		var nonNullableFields = getNonNullableFields(mapping);

		// store the non-nullable fields in the client object, keyed by index and type
		this._nonNullableFields = this._nonNullableFields || {};
		this._nonNullableFields[params.index + params.type] = nonNullableFields;

		// call the original putMapping()
		return putMappingOriginal.call(this, params, cb);
	};

	/**
	 * Overrides client.index
	 * @param params
	 * @param cb
	 * @returns {*}
	 */
	api.index = function (params, cb) {
		// get the stored non-nullable fields
		var nonNullableFields = this.indices._nonNullableFields;
		nonNullableFields = nonNullableFields && nonNullableFields[params.index + params.type];

		if ( !nonNullableFields )
			return indexOriginal.call(this, params, cb);

		// go through the non-nullable fields, checking that each is present
		var missing = [];
		nonNullableFields.forEach(function (field) {
			// the non-nullable field may not be a root field
			var path = field.split('.');

			// drill down the document and get the actual property value
			var value = params.body;
			path.forEach(function (pathPart) {
				value = value && value[pathPart];
			});

			if ( value === null )
				missing.push(field);
		});

		if ( missing.length ) {
			var error = new Error('Null value for non-nullable field' + (missing.length > 1 ? 's' : '') + ' "' + missing.join('", "') + '"');
			cb && cb(error);
			return Promise.reject(error);
		}

		return indexOriginal.call(this, params, cb);
	};

	var getNonNullableFields = function (mapping) {
		return _getNonNullableFieldsRecursive([], mapping);
	};

	var _getNonNullableFieldsRecursive = function (parents, mapping) {
		var nonNullableFields = [];

		// if this property has no child properties, return
		if ( !mapping.properties )
			return nonNullableFields;

		var props = Object.keys(mapping.properties);

		// iterate through all properties, looking for ones marked "non-nullable"
		props.forEach(function (prop) {
			var _mapping = mapping.properties[prop];
			var _parents = parents.concat([prop]);
			if ( _mapping['non-nullable'] )
				nonNullableFields.push(_parents.join('.'));

			// recurse through child properties
			nonNullableFields = nonNullableFields.concat(_getNonNullableFieldsRecursive(_parents, _mapping));
		});

		return nonNullableFields;
	};
});