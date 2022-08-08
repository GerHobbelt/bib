import Utilities_Item from '../modules/zotero-utilities/utilities_item.js';
import Schema from '../modules/zotero-utilities/schema.js';
import CachedTypes from '../modules/zotero-utilities/cachedTypes.js';
import ZOTERO_TYPE_SCHEMA from '../modules/zotero-utilities/resource/zoteroTypeSchemaData.js';
import Utilities_Date from '../modules/zotero-utilities/date.js';
import Utilities from '../modules/zotero-utilities/utilities.js';

import dateFormats from '../data/dateFormats.js';
import schemaJSON from '../data/zotero-schema.js';

global.Zotero = {
	debug: console.log,
	Date: Utilities_Date,
	Schema: { init: Schema.init },
	Utilities: {
		...Utilities,
		Item: Utilities_Item
	},
	...CachedTypes
};

global.Zotero.locale = 'en-US';
global.Zotero.Schema.init(schemaJSON);
global.Zotero.setTypeSchema(ZOTERO_TYPE_SCHEMA);
global.Zotero.Date.init(dateFormats);

const collator = new Intl.Collator([global.Zotero.locale], {
	numeric: true,
	sensitivity: 'base'
});
global.Zotero.localeCompare = collator.compare;

export default global.Zotero;
