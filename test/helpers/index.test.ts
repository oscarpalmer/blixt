import {expect, test} from 'bun:test';
import {getKey, getValue} from '../../src/helpers';

test('getKey', () => {
	expect(getKey('test', 'test')).toEqual('test.test');
	expect(getKey(undefined, 'test')).toEqual('test');
	expect(getKey('test', undefined)).toEqual('test');
});

test('getValue', () => {
	expect(getValue(1, 'a')).toEqual(1);
	expect(getValue({a: 1}, 'a')).toEqual(1);
	expect(getValue({a: {b: 2}}, 'a.b')).toEqual(2);
	expect(getValue({a: {b: 2}}, 'a.b.c')).toEqual(undefined);
});
