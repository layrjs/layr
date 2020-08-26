import {Component} from './component';

/**
 * *Inherits from [`Component`](https://liaison.dev/docs/v1/reference/component).*
 *
 * The `EmbeddedComponent` class allows you to define a component that can be embedded into another component. This is useful when you have to deal with a rich data model composed of a hierarchy of properties that can be type checked at runtime and validated. If you don't need such control over some nested attributes, instead of using an embedded component, you can just use an attribute of type `object`.
 *
 * The `EmbeddedComponent` class inherits from the [`Component`](https://liaison.dev/docs/v1/reference/component) class, so you can define and consume an embedded component in the same way you would do with any component.
 *
 * However, since an embedded component is owned by its parent component, it doesn't behave like a regular component. Head over [here](https://liaison.dev/docs/v1/reference/component#nesting-components) for a broader explanation.
 *
 * #### Usage
 *
 * Just extend the `EmbeddedComponent` class to define a component that has the ability to be embedded.
 *
 * For example, a `MovieDetails` embedded component could be defined as follows:
 *
 * ```
 * // JS
 *
 * // movie-details.js
 *
 * import {EmbeddedComponent} from '@liaison/component';
 *
 * export class MovieDetails extends EmbeddedComponent {
 *   ﹫attribute('number?') duration;
 *   ﹫attribute('string?') aspectRatio;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * // movie-details.ts
 *
 * import {EmbeddedComponent} from '@liaison/component';
 *
 * export class MovieDetails extends EmbeddedComponent {
 *   ﹫attribute('number?') duration?: number;
 *   ﹫attribute('string?') aspectRatio?: string;
 * }
 * ```
 *
 * Once you have defined an embedded component, you can embed it into any other component (a regular component or even another embedded component). For example, here is a `Movie` component that is embedding the `MovieDetails` component:
 *
 * ```
 * // JS
 *
 * // movie.js
 *
 * import {Component} from '@liaison/component';
 *
 * import {MovieDetails} from './movie-details';
 *
 * class Movie extends Component {
 *   ﹫provide() static MovieDetails = MovieDetails;
 *
 *   ﹫attribute('string') title;
 *   ﹫attribute('MovieDetails') details;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * // movie.ts
 *
 * import {Component} from '@liaison/component';
 *
 * import {MovieDetails} from './movie-details';
 *
 * class Movie extends Component {
 *   ﹫provide() static MovieDetails = MovieDetails;
 *
 *   ﹫attribute('string') title!: string;
 *   ﹫attribute('MovieDetails') details!: MovieDetails;
 * }
 * ```
 *
 * > Note that you have to make the `MovieDetails` component accessible from the `Movie` component by using the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator. This way, the `MovieDetails` component can be later referred by its name when you define the `details` attribute using the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.
 *
 * Finally, the `Movie` component can be instantiated like this:
 *
 * ```
 * const movie = new Movie({
 *   title: 'Inception',
 *   details: new Movie.MovieDetails({duration: 120, aspectRatio: '16:9'})
 * });
 *
 * movie.title; // => 'Inception'
 * movie.details.duration; // => 120
 * ```
 */
export class EmbeddedComponent extends Component {
  // === Methods ===

  /**
   * See the methods that are inherited from the [`Component`](https://liaison.dev/docs/v1/reference/component#creation) class.
   *
   * @category Methods
   */

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://liaison.dev/docs/v1/reference/observable#observable-class) class.
   *
   * @category Observability
   */

  /**
   * Always returns `true`.
   *
   * @category Embeddability
   */
  static isEmbedded() {
    return true;
  }
}
