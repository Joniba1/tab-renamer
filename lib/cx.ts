/** Joins class names, skipping falsy ones: `cx('a', on && 'b')` → `'a b'`. */
export const cx = (...names: (string | false | null | undefined)[]): string => {
	return names.filter(Boolean).join(' ')
}
