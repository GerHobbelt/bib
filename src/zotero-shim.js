import Utilities_Item from '../modules/zotero-utilities/utilities_item.js';
import Schema from '../modules/zotero-utilities/schema.js';
import CachedTypes from '../modules/zotero-utilities/cachedTypes.js';
import ZOTERO_TYPE_SCHEMA from '../modules/zotero-utilities/resource/zoteroTypeSchemaData.js';
import Utilities_Date from '../modules/zotero-utilities/date.js';
import Utilities from '../modules/zotero-utilities/utilities.js';

import dateFormats from '../data/dateFormats.js';
import schemaJSON from '../data/zotero-schema.js';

const g = globalThis;

g.Zotero = {
	debug: console.log,
	Date: Utilities_Date,
	Schema: { init: Schema.init },
	Utilities: {
		...Utilities,
		Item: Utilities_Item
	},
	...CachedTypes
};

g.Zotero.locale = 'en-US';
g.Zotero.Schema.init(schemaJSON);
g.Zotero.setTypeSchema(ZOTERO_TYPE_SCHEMA);
g.Zotero.Date.init(dateFormats);

const collator = new Intl.Collator([g.Zotero.locale], {
	numeric: true,
	sensitivity: 'base'
});

g.Zotero.localeCompare = collator.compare;

export default g.Zotero;
