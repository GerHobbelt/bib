/* eslint-env node, mocha */
import { assert, AssertionError } from 'chai';
import fetchMock from 'fetch-mock';
import sinon from 'sinon';

import ZoteroTranslationClient from '../src/main.js';
import zoteroItemBook from './fixtures/zotero-item-book.js';
import zoteroItemBookSection from './fixtures/zotero-item-book-section.js';
import zoteroItemPaper from './fixtures/zotero-item-paper.js';
import zoteroItemNote from './fixtures/zotero-item-note.js';
import cslItemBook from './fixtures/csl-item-book.js';
import cslItemBookSection from './fixtures/csl-item-book-section.js';
import responseWebMultiple from './fixtures/response-web-multiple.js';
import responseSearchMultiple from './fixtures/response-search-multiple.js';

class FakeStore {
	constructor() { this.clear(); }
	getItem(key) { return key in this.storage && this.storage[key] || null }
	setItem(key, value) { this.storage[key] = value }
	clear() { this.storage = {} }
}

describe('Zotero Translation Client', () => {
	var fakeStore,
	fetchRequests;

	afterEach(() => fetchMock.restore());

	beforeEach(() => {
		fakeStore = new FakeStore();
		fetchRequests = [];

		fetchMock.mock('/search', (url, opts) => {
			fetchRequests.push({ url, opts });
			switch(opts.body) {
				case 'search single':
				case '123':
				return {
					body: [zoteroItemPaper],
					headers: { 'Content-Type': 'application/json' }
				};
				case 'search multiple':
				return {
					body: responseSearchMultiple,
					status: 300,
					headers: { 'Content-Type': 'application/json' }
				};
				case 'search more':
				return {
					body: responseSearchMultiple,
					status: 300,
					headers: {
						'Content-Type': 'application/json',
						'Link': '</search?start=ABC>; rel="next"'
					}
				};
				default:
				return {
					body: [],
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			}
		});

		fetchMock.mock('/web', (url, opts) => {
			fetchRequests.push({ url, opts });
			if(opts.headers['Content-Type'] === 'application/json') {
				try {
					const body = JSON.parse(opts.body);
					if(body.url.includes('choice')) {
						if('items' in body && Object.keys(responseWebMultiple.items).includes(Object.keys(body.items)[0])) {
							return {
								body: [zoteroItemBook],
								headers: { 'Content-Type': 'application/json' }
							};
						} else {
							return {
								status: 400,
								headers: { 'Content-Type': 'text/plain' }
							};
						}
					} else {
						return {
							status: 501,
							headers: { 'Content-Type': 'text/plain' }
						};
					}
				} catch(_) {
					return {
						status: 400,
						headers: { 'Content-Type': 'text/plain' }
					};
				}
			} else {
				const url = opts.body;
				if(url.includes('book')) {
					return {
						body: [zoteroItemBook],
						headers: { 'Content-Type': 'application/json' }
					};
				} else if(url.includes('paper')) {
					return {
						body: [zoteroItemPaper],
						headers: { 'Content-Type': 'application/json' }
					};
				} else if(url.includes('multi')) {
					return {
						body: [zoteroItemBook, zoteroItemPaper],
						headers: { 'Content-Type': 'application/json' }
					};
				} else if(url.includes('note')) {
					return {
						body: [zoteroItemPaper, zoteroItemNote],
						headers: { 'Content-Type': 'application/json' }
					};
				} else if(url.includes('choice')) {
					return {
						status: 300,
						body: responseWebMultiple,
						headers: { 'Content-Type': 'application/json' }
					};
				} else {
					return {
						status: 400,
						headers: { 'Content-Type': 'text/plain' }
					};
				}
			}
		});

		fetchMock.mock('/import', (data, opts) => {
			fetchRequests.push({ data, opts });
			return {
				body: [zoteroItemBook],
				headers: { 'Content-Type': 'application/json' }
			};
		});

	});



	it('should convert (Zotero -> CSL) initial items', () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			initialItems: [zoteroItemBook]
		});
		assert.equal(bib.itemsCSL.length, 1);
		assert.deepInclude(bib.itemsCSL[0], cslItemBook);
	});

	it('should convert (Zotero -> CSL) manually added items', () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});
		assert.equal(bib.items.length, 0);
		bib.addItem(zoteroItemBook);
		assert.equal(bib.itemsCSL.length, 1);
		assert.deepInclude(bib.itemsCSL[0], cslItemBook);
	});

	it('should convert (Zotero -> CSL) items that require base mappings', () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			initialItems: [zoteroItemBookSection]
		});
		assert.equal(bib.itemsCSL.length, 1);
		assert.deepInclude(bib.itemsCSL[0], cslItemBookSection);
	});

	it('should remove items', () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			initialItems: [zoteroItemBook]
		});

		assert.equal(bib.itemsCSL.length, 1);
		bib.removeItem({}); //make sure it removes the right item
		assert.equal(bib.itemsCSL.length, 1);
		bib.removeItem(bib.itemsRaw[0]);
		assert.equal(bib.itemsCSL.length, 0);
	});

	it('should update an item', () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			initialItems: [zoteroItemBook]
		});

		assert.equal(bib.items[0].title, 'Dune');
		bib.updateItem(0, {
			...bib.items[0],
			title: 'FooBar'
		});
		assert.equal(bib.items[0].title, 'FooBar');
	});

	it('should clear items', () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			initialItems: [zoteroItemBook, zoteroItemPaper]
		});
		assert.equal(bib.itemsCSL.length, 2);
		bib.clearItems();
		assert.equal(bib.itemsCSL.length, 0);
	});

	it('should persist initial items in localStorage', () => {
		assert.equal('zotero-bib-items' in fakeStore.storage, false);

		new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			initialItems: [zoteroItemBook]
		});

		assert.equal('zotero-bib-items' in fakeStore.storage, true);
		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 1);
		assert.deepInclude(JSON.parse(fakeStore.storage['zotero-bib-items'])[0], zoteroItemBook);
	});

	it('should load initial items from localStorage without overriding initial items', () => {
		fakeStore.storage['zotero-bib-items'] = JSON.stringify([zoteroItemPaper]);

		new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			initialItems: [zoteroItemBook]
		});

		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 2);
	});

	it('should load initial items from localStorage overriding initial items if override preference is set', () => {
		fakeStore.storage['zotero-bib-items'] = JSON.stringify([zoteroItemPaper]);

		new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			override: true,
			initialItems: [zoteroItemBook]
		});

		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 1);
		assert.deepInclude(JSON.parse(fakeStore.storage['zotero-bib-items'])[0], zoteroItemBook);
	});

	it('should persist manually added items in localStorage', () => {
		assert.equal('zotero-bib-items' in fakeStore.storage, false);

		let bib = new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true
		});

		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 0);
		bib.addItem(zoteroItemBook);
		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 1);
		assert.deepInclude(JSON.parse(fakeStore.storage['zotero-bib-items'])[0], zoteroItemBook);
	});

	it('should persist remove items from localStorage', () => {
		assert.equal('zotero-bib-items' in fakeStore, false);

		let bib = new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			initialItems: [zoteroItemBook]
		});

		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 1);
		bib.removeItem(bib.itemsRaw[0]);
		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 0);
	});

	it('should persist item changes in localStorage ', () => {
		let bib = new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			initialItems: [zoteroItemBook]
		});

		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items'])[0].title, 'Dune');
		bib.updateItem(0, {
			...bib.items[0],
			title: 'FooBar'
		});
		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items'])[0].title, 'FooBar');
	});

	it('should clear items from localStorage', () => {
		assert.equal('zotero-bib-items' in fakeStore.storage, false);

		let bib = new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			initialItems: [zoteroItemBook, zoteroItemPaper]
		});
		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 2);
		bib.clearItems();
		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 0);
	});

	it('should re-load items from localStorage', () => {
		// construct with an item in
		const bib = new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			override: true,
			initialItems: [zoteroItemBook]
		});
		// change the state of local storage
		fakeStore.storage['zotero-bib-items'] = JSON.stringify([zoteroItemPaper]);

		// at this point bib and local storage are out of sync
		assert.deepInclude(bib.itemsRaw[0], zoteroItemBook);
		assert.deepInclude(JSON.parse(fakeStore.storage['zotero-bib-items'])[0], zoteroItemPaper);

		// force reload items from localStorage
		bib.reloadItems();

		// now items should be in sync
		assert.deepInclude(bib.itemsRaw[0], zoteroItemPaper);
		assert.deepInclude(JSON.parse(fakeStore.storage['zotero-bib-items'])[0], zoteroItemPaper);
	});

	it('should storagePrefix preference', () => {
		assert.equal('zotero-bib-items' in fakeStore.storage, false);
		assert.equal('foo-items' in fakeStore.storage, false);
		assert.equal('items' in fakeStore.storage, false);

		new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true,
			initialItems: [zoteroItemBook],
			storagePrefix: 'foo'
		});

		assert.equal('zotero-bib-items' in fakeStore.storage, false);
		assert.equal('foo-items' in fakeStore.storage, true);
		assert.equal('items' in fakeStore.storage, false);
	});

	it('should translate an url using translation server', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		const translationResult = await bib.translateUrl('http://example.com/multi');
		assert.equal(fetchRequests.length, 1);
		assert.equal(translationResult.items[0].key, zoteroItemBook.key);
		assert.equal(translationResult.items[1].key, zoteroItemPaper.key);
	});

	it('should translate an identifier using translation server', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		const translationResult = await bib.translateIdentifier('123');
		assert.equal(fetchRequests.length, 1);
		assert.equal(translationResult.items[0].key, zoteroItemPaper.key);
	});

	it('should add a translated item', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		assert.equal(bib.items.length, 0);
		await bib.translateUrl('http://example.com/paper');
		assert.equal(bib.items.length, 1);
		assert.equal(bib.items[0].key, zoteroItemPaper.key);
	});

	it('should not add a translated item if optional add is set to false', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		assert.equal(bib.items.length, 0);
		await bib.translateUrl('http://example.com/paper', { add: false });
		assert.equal(bib.items.length, 0);
	});

	it('should accept endpoint as an optional opt', async () => {
		fetchMock.mock('https://example.com/foo?next=123', zoteroItemBook);

		let bib = new ZoteroTranslationClient({
			persist: false,
			translateURL: 'https://example.com'
		});

		await bib.translateUrl('http://example.com/paper', { endpoint: '/foo?next=123' });
	});

	it('should add a translated item together with a note', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		assert.equal(bib.items.length, 0);
		await bib.translateUrl('http://example.com/note');
		assert.equal(bib.items.length, 2);
		assert.equal(bib.items[0].key, zoteroItemPaper.key);
	});

	it('should add an item picked from multiple items page', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		assert.equal(bib.items.length, 0);
		const translationResult = await bib.translateUrl('http://example.com/choice');
		assert.equal(bib.items.length, 0);

		assert.equal(translationResult.result, ZoteroTranslationClient.MULTIPLE_CHOICES);

		const itemUrl = Object.keys(translationResult.items)[0];
		const itemValue = translationResult.items[itemUrl];

		await bib.translateUrlItems(
			'http://example.com/choice',
			{ [itemUrl]: itemValue }
		);

		assert.equal(bib.items.length, 1);
		assert.equal(bib.items[0].key, zoteroItemBook.key);
	});

	it('should add a an item when it\'s a single search result', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});
		assert.equal(bib.items.length, 0);
		const translationResult = await bib.translateIdentifier('search single');

		assert.equal(translationResult.result, ZoteroTranslationClient.COMPLETE);
		assert.equal(bib.items.length, 1);
		assert.equal(bib.items[0].key, zoteroItemPaper.key);
	});

	it('should return a list of items for search with multiple results', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});
		assert.equal(bib.items.length, 0);
		const searchResult = await bib.translateIdentifier('search multiple');

		assert.equal(searchResult.result, ZoteroTranslationClient.MULTIPLE_CHOICES);
		assert.equal(Object.keys(searchResult.items).length, 3);
		assert.equal(bib.items.length, 0);

		const [identifier, data] = Object.entries(searchResult.items)[0];
		assert.include(Object.keys(responseSearchMultiple), identifier);
		assert.deepInclude(Object.values(responseSearchMultiple), data);
	});

	it('should handle no search results', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});
		assert.equal(bib.items.length, 0);
		const translationResult = await bib.translateIdentifier('search empty');

		assert.equal(translationResult.result, ZoteroTranslationClient.COMPLETE);
		assert.deepEqual(translationResult.items, []);
		assert.equal(bib.items.length, 0);
	});

	it('should parse next from Link headers', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});
		assert.equal(bib.items.length, 0);
		const searchResult = await bib.translateIdentifier('search more');

		assert.equal(searchResult.result, ZoteroTranslationClient.MULTIPLE_CHOICES);
		assert.equal(searchResult.next, '/search?start=ABC');
	});

	it('should shouldn\'t add an untranslatable item', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		assert.equal(bib.itemsCSL.length, 0);

		let translationResult = await bib.translateUrl('http://example.com/');
		assert.equal(translationResult.result, ZoteroTranslationClient.FAILED);
		assert.equal(bib.itemsCSL.length, 0);
	});

	it('should replace CURRENT_TIMESTAMP with actual timestamp on translation', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});
		let clock = sinon.useFakeTimers(new Date(Date.UTC(2017,4,10,11,12,13)));
		await bib.translateUrl('http://example.com/paper');
		assert.equal(bib.itemsRaw[0].accessDate, '2017-05-10 11:12:13');
		clock.restore();
	});

	it('should accept translateURL and translatePrefix', async () => {
		fetchMock.mock('https://example.com/lorem/ipsum/web', zoteroItemBook);

		let bib = new ZoteroTranslationClient({
			persist: false,
			translateURL: 'https://example.com',
			translatePrefix: '/lorem/ipsum'
		});

		await bib.translateUrl('http://example.com/paper');
	});

	it('should export items', async () => {
		fetchMock.mock('https://example.com/export?format=ris', (url, opts) => {
			assert.equal(opts.headers['Content-Type'], 'application/json');
			return {
				headers: {
					'Content-Type': 'plain/text'
				},
				body: 'RESULT'
			}
		});

		const bib = new ZoteroTranslationClient({
			persist: false,
			translateURL: 'https://example.com'
		});

		bib.addItem(zoteroItemBook);
		let result = await bib.exportItems('ris');
		assert.equal(result, 'RESULT');
	});

	it('should filter out items that cannot be exported', async () => {
		fetchMock.mock('https://example.com/export?format=ris', (url, opts) => {
			assert.equal(opts.headers['Content-Type'], 'application/json');
			assert.equal(JSON.parse(opts.body).length, 1);
			return {
				headers: {
					'Content-Type': 'plain/text'
				},
				body: 'RESULT'
			}
		});

		const bib = new ZoteroTranslationClient({
			persist: false,
			translateURL: 'https://example.com'
		});

		bib.addItem(zoteroItemBook);
		let result = await bib.exportItems('ris');
		assert.equal(result, 'RESULT');
	});

	it('should throw an error when export fails', async () => {
		fetchMock.mock('https://example.com/export?format=ris', {
			status: 500,
			headers: {
				'Content-Type': 'plain/text'
			},
			body: 'Server Error'
		});

		const bib = new ZoteroTranslationClient({
			persist: false,
			translateURL: 'https://example.com'
		});

		try {
			await bib.exportItems('ris');
			assert.fail();
		} catch(e) {
			assert.instanceOf(e, Error);
			assert.notInstanceOf(e, AssertionError);
		}
	});

	it('should throw an error when invalid storage engine is provided', () => {
		assert.throws(() => {
			new ZoteroTranslationClient({
				persist: true,
				storage: {}
			});
		});
	});

	it('should throw an error when adding invalid item', () => {
		const bib = new ZoteroTranslationClient({
			persist: false
		});
		assert.throws(() => { bib.addItem(null); });
		assert.throws(() => { bib.addItem('random string'); });
		assert.throws(() => { bib.addItem(123); });
		assert.throws(() => { bib.addItem({}); });
		assert.throws(() => { bib.addItem({ title: 'some title'}); });
	});

	it('should make sure that items loaded from storage look like Zotero items', () => {
		fakeStore.storage['zotero-bib-items'] = JSON.stringify([
			null,
			'random string',
			zoteroItemPaper,
			123,
			{},
			{ title: 'some title'}
			]);

		const bib = new ZoteroTranslationClient({
			storage: fakeStore,
			persist: true
		});

		assert.equal(JSON.parse(fakeStore.storage['zotero-bib-items']).length, 1);
		assert.deepInclude(bib.itemsRaw[0], zoteroItemPaper);
	});

	it('should accept fetch config via global opts', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			init: { cache: 'no-cache', headers: { 'X-Custom-Header': 42 } }
		});

		await bib.translateIdentifier('123');
		assert.equal(fetchRequests.length, 1);
		assert.equal(fetchRequests[0].url, '/search');
		assert.equal(fetchRequests[0].opts.cache, 'no-cache');
		assert.equal(fetchRequests[0].opts.headers['Content-Type'], 'text/plain');
		assert.equal(fetchRequests[0].opts.headers['X-Custom-Header'], 42);
	});

	it('should accept fetch config via local opts', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false
		});

		await bib.translateIdentifier('123', { init: { cache: 'no-cache', headers: { 'X-Custom-Header': 42 } }});
		assert.equal(fetchRequests.length, 1);
		assert.equal(fetchRequests[0].url, '/search');
		assert.equal(fetchRequests[0].opts.cache, 'no-cache');
		assert.equal(fetchRequests[0].opts.headers['Content-Type'], 'text/plain');
		assert.equal(fetchRequests[0].opts.headers['X-Custom-Header'], 42);
	});

	it('should override fetch global config via local opts', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			init: { cache: 'no-cache', headers: { 'X-Custom-Header': 42 } }
		});

		await bib.translateIdentifier('123', { init: { cache: 'default' }});
		assert.equal(fetchRequests.length, 1);
		assert.equal(fetchRequests[0].url, '/search');
		assert.equal(fetchRequests[0].opts.cache, 'default');
		assert.equal(fetchRequests[0].opts.headers['Content-Type'], 'text/plain');
		assert.equal(fetchRequests[0].opts.headers['X-Custom-Header'], 42);
	});

	it('should merge fetch headers from global and local opts', async () => {
		let bib = new ZoteroTranslationClient({
			persist: false,
			init: { cache: 'no-cache', headers: { 'X-A': 1, 'X-B': 2  } }
		});
		await bib.translateIdentifier('123', { init: { headers: { 'X-A': 42, 'X-C': 3 }}});
		assert.equal(fetchRequests.length, 1);
		assert.equal(fetchRequests[0].url, '/search');
		assert.equal(fetchRequests[0].opts.headers['X-A'], 42);
		assert.equal(fetchRequests[0].opts.headers['X-B'], 2);
		assert.equal(fetchRequests[0].opts.headers['X-C'], 3);
	});

	it('should use /import endpoint', async () => {
		const bib = new ZoteroTranslationClient({ persist: false });
		const body = 'lorem ipsum';

		await bib.translateImport(body);
		assert.equal(fetchRequests.length, 1);
		assert.equal(fetchRequests[0].opts.body, body);
		assert.equal(fetchRequests[0].opts.headers['Content-Type'], 'text/plain');
	});
});
