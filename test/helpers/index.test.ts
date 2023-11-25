import {expect, test} from 'bun:test';
import {getKey, getValue, isGenericObject, isKey} from '../../src/helpers';
import {template} from '../../src/template';

test('getKey', () => {
	expect(getKey('test', 'test')).toEqual('test.test');
	expect(getKey(undefined, 'test')).toEqual('test');
	expect(getKey('test', undefined)).toEqual('test');
});

test('isGenericObject', () => {
	expect(isGenericObject({})).toEqual(true);
	expect(isGenericObject([])).toEqual(true);
	expect(isGenericObject(null)).toEqual(false);
	expect(isGenericObject(undefined)).toEqual(false);
	expect(isGenericObject(1)).toEqual(false);
	expect(isGenericObject('')).toEqual(false);
	expect(isGenericObject(new Date())).toEqual(false);
	expect(isGenericObject(() => {})).toEqual(false);
	expect(isGenericObject(template`<p>test</p>`)).toEqual(false);
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
