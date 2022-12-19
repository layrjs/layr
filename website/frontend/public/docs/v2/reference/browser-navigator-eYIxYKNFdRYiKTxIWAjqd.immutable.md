### BrowserNavigator <badge type="primary">class</badge> {#browser-navigator-class}

*Inherits from [`Navigator`](https://layrjs.com/docs/v2/reference/navigator).*

A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator) relying on the browser's [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) to determine the current [route](https://layrjs.com/docs/v2/reference/route).

#### Usage

If you are using [React](https://reactjs.org/), the easiest way to set up a `BrowserNavigator` in your app is to use the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component that is provided by the `@layr/react-integration` package.

See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.

#### Creation

##### `new BrowserNavigator()` <badge type="secondary">constructor</badge> {#constructor}

Creates a [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator).

**Returns:**

The [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) instance that was created.

#### Component Registration

See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#component-registration) class.

#### Routes

See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#routes) class.

#### Current Location

See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#current-location) class.

#### Navigation

See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigation) class.

#### Link Rendering

##### `Link(props)` <badge type="secondary-outline">instance method</badge> {#link-instance-method}

Renders a link that is managed by the navigator.

This method is only available when you create your navigator by using the [`useBrowserNavigator()`](https://layrjs.com/docs/v2/reference/react-integration#use-browser-navigator-react-hook) React hook.

Note that instead of using this method, you can use the handy `Link()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.

**Parameters:**

* `props`:
  * `to`: A string representing the target URL of the link.
  * `className`: A [`className`](https://reactjs.org/docs/dom-elements.html#classname) attribute to apply to the rendered link.
  * `activeClassName`: An additional [`className`](https://reactjs.org/docs/dom-elements.html#classname) attribute to apply to the rendered link when the URL of the current navigator's route is the same as the target URL of the link.
  * `style`: A [`style`](https://reactjs.org/docs/dom-elements.html#style) attribute to apply to the rendered link.
  * `activeStyle`: An additional [`style`](https://reactjs.org/docs/dom-elements.html#style) attribute to apply to the rendered link when the URL of the current navigator's route is the same as the target URL of the link.

**Returns:**

An `<a>` React element.

**Example:**

```
class Application extends Routable(Component) {
   @route('/') @view static Home() {
     const navigator = this.getNavigator();
     return <navigator.Link to="/about-us">About Us</navigator.Link>;

     // Same as above, but in a more idiomatic way:
     return <this.AboutUs.Link>About Us</this.AboutUs.Link>;
   }

   @route('/about-us') @view static AboutUs() {
     return <div>Here is everything about us.<div>;
   }
}
```

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.
