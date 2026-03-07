export type BindableWatcher<T> = (after: T, before: T | undefined, bound: Spectacle<T>) => void;

type BindsFor<T extends [ ...any[] ]> = {
	[K in keyof T]: Spectacle<T[K]>;
};
type MapperFor<T extends [ ...any[] ], U> = (...values: T) => U;

/**
 * This is a *super* basic implementation of reactive-like constructs.
 * It's not meant to be comprehensive — just enough to get the job done.
 */
export class Spectacle<T> {
	/**
	 * Given some number of spectacles, watch each of them as if they were a
	 * cohesive unit, remapping for a new downstream Spectacle based on the
	 * observed values.
	 * The types look nasty here, but the signature boils down to:
	 * ```
	 * Spectacle.compose(aSpec, bSpec, cSpec, (aValue, bValue, cValue) => ...
	 * ```
	 * That is, the param types of the map function should match the value
	 * types of the Spectacles before it.
	 */
	public static compose<A extends [ ...any[] ], R>(...args: [ ...BindsFor<A>, MapperFor<A, R> ]): Spectacle<R> {
		const mapper = args.pop() as MapperFor<A, R>;
		const binds = args as BindsFor<A>;
		const initialValues = binds.map((b) => b.value) as A;
		const initial = mapper(...initialValues);
		const bound = Spectacle.of(initial);
		for (const bind of binds) {
			bind.watch((newValue) => {
				const values = binds.map((b) => b === bind ? newValue : b.value) as A;
				bound.update(mapper(...values));
			}, false);
		}
		return bound;
	}

	/**
	 * Factory.
	 */
	public static of<T>(initial: T): Spectacle<T> {
		return new Spectacle<T>(initial);
	}

	#value: T;
	#watchers: BindableWatcher<T>[] = [];

	private constructor(initial: T) {
		this.#value = initial;
	}

	/**
	 * When this value is updated, automagically derive the new downstream
	 * value and pass it along.
	 */
	public map<U>(mapper: (value: T) => U): Spectacle<U> {
		const initial = mapper(this.#value);
		const bound = new Spectacle(initial);
		this.watch((t) => bound.update(mapper(t)), false);
		return bound;
	}

	/**
	 * Update the value, and notify all the downstream watchers/consumers.
	 */
	public update(after: T) {
		const before = this.#value;
		if (after !== before) {
			this.#value = after;
			for (const watcher of this.#watchers) {
				watcher(after, before, this);
			}
		}
	}

	/**
	 * Get the most recent value.
	 */
	public get value(): T {
		return this.#value;
	}

	/**
	 * Subscribe to a stream of changes to the value.
	 * Optionally, immediately invoke the watcher with the current value.
	 */
	public watch(watcher: BindableWatcher<T>, invoke = false) {
		this.#watchers.push(watcher);
		if (invoke) {
			watcher(this.#value, undefined, this);
		}
	}
}
