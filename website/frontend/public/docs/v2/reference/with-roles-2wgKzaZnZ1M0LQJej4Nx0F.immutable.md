### WithRoles() <badge type="primary">mixin</badge> {#with-roles-mixin}

Extends a [`Component`](https://layrjs.com/docs/v2/reference/component) class with the ability to handle [roles](https://layrjs.com/docs/v2/reference/role).

#### Usage

Call `WithRoles()` with a [`Component`](https://layrjs.com/docs/v2/reference/component) class to construct a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class. Next, use the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator to define some [roles](https://layrjs.com/docs/v2/reference/role). Lastly, use the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) decorator to authorize some attributes or methods according to these roles.

**Example:**

```
import {Component, attribute, method, expose} from '@layr/component';
import {WithRoles, role} from '@layr/with-roles';

class Article extends WithRoles(Component) {
  @role('admin') static adminRoleResolver() {
    // ...
  }

  // Only readable by an administrator
  @expose({get: 'admin'}) @attribute('number') viewCount = 0;

  // Only callable by an administrator
  @expose({call: 'admin'}) @method() unpublish() {
    // ...
  }
}
```

Once you have a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class), you can use any method provided by the `WithRoles()` mixin. For example, you can use the [`resolveRole()`](https://layrjs.com/docs/v2/reference/with-roles#resolve-role-dual-method) method to determine if the user has a specific role:

```
Article.resolveRole('admin'); // `true` or `false` depending on the current user
```

See the ["Handling Authorization"](https://layrjs.com/docs/v2/introduction/authorization) guide for a comprehensive example using the `WithRoles()` mixin.

### ComponentWithRoles <badge type="primary">class</badge> {#component-with-roles-class}

*Inherits from [`Component`](https://layrjs.com/docs/v2/reference/component).*

A `ComponentWithRoles` class is constructed by calling the `WithRoles()` mixin ([see above](https://layrjs.com/docs/v2/reference/with-roles#with-roles-mixin)).

#### Roles

##### `getRole(name, [options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-role-dual-method}

Gets a role. If there is no role with the specified name, an error is thrown.

**Parameters:**

* `name`: The name of the role to get.
* `options`:
  * `fallbackToClass`: A boolean specifying whether the role should be get from the component class if there is no role with the specified name in the component prototype or instance (default: `false`).

**Returns:**

A [Role](https://layrjs.com/docs/v2/reference/role) instance.

**Example:**

```
Article.getRole('admin'); // => 'admin' role

const article = new Article();
article.getRole('admin'); // Error
article.getRole('admin', {fallbackToClass: true}); // => 'admin' role
```

##### `hasRole(name, [options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-role-dual-method}

Returns whether the [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) has a role with the specified name.

**Parameters:**

* `name`: The name of the role to check.
* `options`:
  * `fallbackToClass`: A boolean specifying whether the component class should be considered if there is no role with the specified name in the component prototype or instance (default: `false`).

**Returns:**

A boolean.

**Example:**

```
Article.hasRole('admin'); // => true

const article = new Article();
article.hasRole('admin'); // => false
article.hasRole('admin', {fallbackToClass: true}); // => true
```

##### `setRole(name, resolver)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-role-dual-method}

Sets a role in the current [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.

Typically, instead of using this method, you would rather use the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator.

**Parameters:**

* `name`: The name of the role.
* `resolver`: A function that should return a boolean indicating whether a user has the corresponding role. The function can be asynchronous and is called with the role's parent as `this` context.

**Returns:**

The [Role](https://layrjs.com/docs/v2/reference/role) instance that was created.

**Example:**

```
Article.setRole('admin', function () {
 // ...
});
```

##### `resolveRole(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#resolve-role-dual-method}

Resolves a role by calling its resolver function. If there is no role with the specified name in the [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype, an error is thrown.

The resolver function is called with the role's parent as `this` context.

Once a role has been resolved, the result is cached, so the resolver function is called only one time.

**Parameters:**

* `name`: The name of the role to resolve.

**Returns:**

A boolean.

**Example:**

```
Article.resolveRole('admin'); // `true` or `false` depending on the current user
```

#### Decorators

##### `@role(name)` <badge type="tertiary">decorator</badge> {#role-decorator}

Defines a [role](https://layrjs.com/docs/v2/reference/role) in a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.

This decorator should be used to decorate a class or instance method that implements the role's resolver. The method can be asynchronous and should return a boolean indicating whether a user has the corresponding role.

**Parameters:**

* `name`: The name of the role to define.

**Example:**

See an example of use in the [`WithRoles()`](https://layrjs.com/docs/v2/reference/with-roles#with-roles-mixin) mixin.
#### Utilities

##### `isComponentWithRolesClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#is-component-with-roles-class-or-instance-function}

Returns whether the specified value is a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `assertIsComponentWithRolesClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-component-with-roles-class-or-instance-function}

Throws an error if the specified value is not a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or instance.

**Parameters:**

* `value`: A value of any type.
