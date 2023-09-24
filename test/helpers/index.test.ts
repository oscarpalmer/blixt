import {expect, test} from 'bun:test';
import {getKey, getValue, isGenericObject, isKey} from '../../src/helpers';

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

test('isGenericObject', () => {
	expect(isGenericObject({})).toEqual(true);
	expect(isGenericObject([])).toEqual(true);
	expect(isGenericObject(null)).toEqual(false);
	expect(isGenericObject(undefined)).toEqual(false);
	expect(isGenericObject(1)).toEqual(false);
	expect(isGenericObject('')).toEqual(false);
	expect(isGenericObject(new Date())).toEqual(false);
});

test('isKey', () => {
	expect(isKey(1)).toEqual(true);
	expect(isKey('')).toEqual(true);
	expect(isKey(Symbol())).toEqual(true);
	expect(isKey(null)).toEqual(false);
	expect(isKey(undefined)).toEqual(false);
	expect(isKey({})).toEqual(false);
	expect(isKey([])).toEqual(false);
	expect(isKey(new Date())).toEqual(false);
});
