export const isLikeZoteroItem = item => item && typeof item === 'object' && 'itemType' in item;

export const mergeFetchOptions = (init, globalOpts, localOpts) => {
	const headers = {
		...(init.headers || {}),
		...(globalOpts.init?.headers || {}),
		...(localOpts.init?.headers || {})
	};
	return { ...init, ...(globalOpts.init || {}), ...(localOpts.init || {}), headers };
}


