import {expect, test} from 'bun:test';
import {store} from '../src/store';
import type {StoreSubscription} from '../src/store/subscription';
import {subscribe} from '../src/store/subscription';

const key = 'nested.key';

let sub: StoreSubscription;

const stored = store({
	array: {
		base: [1, 2, 3],
		copyWithin: [1, 2, 3],
		fill: [1, 2, 3],
		pop: [1, 2, 3],
		push: [1, 2, 3],
		reverse: [1, 2, 3],
		shift: [1, 2, 3],
		sort: [1, 2, 3],
		splice: [1, 2, 3],
		unshift: [1, 2, 3],
	},
	count: 0,
	nested: {
		key: 1,
		object: {
			a: 1,
			b: 2,
			c: 3,
		},
	},
	sub: 0,
});

function onKey(newValue, oldValue, origin) {
	stored.count += 1;

	expect(oldValue).toEqual(1);
	expect(newValue).toEqual(2);
	expect(origin).toEqual(undefined);
}

test('array', () => {
	expect(stored.array.base).toBeInstanceOf(Array);

	expect(stored.array.base.every(value => typeof value === 'number')).toEqual(
		true,
	);

	expect(stored.array.copyWithin.copyWithin(0, 1)).toEqual([2, 3, 3]);
	expect(stored.array.fill.fill(0)).toEqual([0, 0, 0]);
	expect(stored.array.pop.pop()).toEqual(3);
	expect(stored.array.push.push(4)).toEqual(4);
	expect(stored.array.reverse.reverse()).toEqual([3, 2, 1]);
	expect(stored.array.shift.shift()).toEqual(1);
	expect(stored.array.sort.sort((f, s) => s - f)).toEqual([3, 2, 1]);
	expect(stored.array.splice.splice(0, 1)).toEqual([1]);
	expect(stored.array.unshift.unshift(0)).toEqual(4);
});

test('store', () => {
	try {
		// @ts-expect-error Testing invalid input
		store(123);
	} catch (error) {
		expect(error).toBeInstanceOf(TypeError);
	}

	expect(store(stored)).toEqual(stored);

	// @ts-expect-error Testing data rewrite
	stored.nested.object = {
		d: 4,
	};

	expect(stored.nested.object).toHaveProperty('d');
});

test('subscribe', () => {
	subscribe(stored, 'nested', (_, __, origin) => {
		expect(stored).toHaveProperty(origin);
		expect(origin).toEqual(key);
	});

	sub = subscribe(stored, key, onKey);

	stored.nested.key += 1;

	try {
		// @ts-expect-error Testing invalid input
		subscribe(123, 'abc', null);
	} catch (error) {
		expect(error).toBeInstanceOf(TypeError);
	}

	try {
		// @ts-expect-error Testing invalid input
		subscribe(stored, [], null);
	} catch (error) {
		expect(error).toBeInstanceOf(TypeError);
	}

	try {
		// @ts-expect-error Testing invalid input
		subscribe(stored, 'abc', null);
	} catch (error) {
		expect(error).toBeInstanceOf(TypeError);
	}
});

test('unsubscribe & resubscribe', () => {
	let value = 0;

	const subscription = subscribe(stored, 'sub', () => {
		value += 1;
	});

	expect(value).toEqual(0);

	stored.sub += 1;

	expect(value).toEqual(1);

	subscription.unsubscribe();

	stored.sub += 1;

	expect(value).toEqual(1);

	subscription.resubscribe();

	stored.sub += 1;

	expect(value).toEqual(2);
});
