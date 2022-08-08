/* eslint-env node, mocha */
import { assert } from 'chai';
import Zotero from '../src/zotero-shim.js';
import zoteroItemBook from './fixtures/zotero-item-book.js';
import zoteroItemPaper from './fixtures/zotero-item-paper.js';
import cslItemBook from './fixtures/csl-item-book.js';
import cslItemPaper from './fixtures/csl-item-paper.js';

describe('Zotero Shim', () => {
	it('should convert date to CSL format', () => {
		assert.include(Zotero.Date.strToDate('22 feb 1955'),
			{ year: '1955', month: 1, day: 22 }
		);
	});

	it('should convert Zotero Item format to CSL format', () => {
		assert.deepInclude(Zotero.Utilities.Item.itemToCSLJSON({ ...zoteroItemBook, uri: zoteroItemBook.key } ), cslItemBook);
		assert.deepInclude(Zotero.Utilities.Item.itemToCSLJSON({ ...zoteroItemPaper, uri: zoteroItemPaper.key } ), cslItemPaper);
	});

	it('should convert ZoteroItem with partially empty creators field to CSL format', () => {
		assert.deepInclude(
			Zotero.Utilities.Item.itemToCSLJSON({
				'key': 'ABCDABCD',
				'version': 0,
				'itemType': 'book',
				'creators': [{
					'firstName': '',
					'lastName': '',
					'creatorType': 'author'
				}],
				'title': 'Lorem Ipsum'
		}), {
			type: 'book',
			title: 'Lorem Ipsum'
		});
	});

	it('should port creator type when converting ZoteroItem ', () => {
		assert.deepInclude(
			Zotero.Utilities.Item.itemToCSLJSON({
					'key': 'ABCDABCD',
					'version': 0,
					'itemType': 'artwork',
					'creators': [{
						'firstName': 'foo',
						'lastName': 'bar',
						'creatorType': 'artist'
					}],
					'title': 'Lorem Ipsum'
			}), {
				type: 'graphic',
				title: 'Lorem Ipsum',
				author: [ { family: 'bar', given: 'foo' } ]
			}
		);
	});

	it('should convert preprint Zotero Item to CSL format', () => {
		assert.deepInclude(
			Zotero.Utilities.Item.itemToCSLJSON({
				'key': 'ABCDABCD',
				'version': 0,
				'itemType': 'preprint',
				'creators': [{
					'firstName': 'foo',
					'lastName': 'bar',
					'creatorType': 'author'
				}],
				'title': 'This is preprint'
			}), {
				type: 'article',
				title: 'This is preprint',
				author: [{ family: 'bar', given: 'foo' }]
		});
	});
});
