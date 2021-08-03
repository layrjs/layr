### Role <badge type="primary">class</badge> {#role-class}

Represents a role in a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.

A role is composed of:

- A name.
- A parent which should be a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.
- A resolver which should be a function returning a boolean indicating whether a user has the corresponding role.

#### Usage

Typically, you create a `Role` by using the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator.

See an example of use in the [`WithRoles()`](https://layrjs.com/docs/v2/reference/with-roles#with-roles-mixin) mixin.

#### Creation

##### `new Role(name, parent, resolver)` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Role`](https://layrjs.com/docs/v2/reference/role).

Typically, instead of using this constructor, you would rather use the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator.

**Parameters:**

* `name`: The name of the role.
* `parent`: The parent of the role which should be a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.
* `resolver`: A function that should return a boolean indicating whether a user has the corresponding role. The function can be asynchronous and is called with the current class or instance as `this` context.

**Returns:**

The [`Role`](https://layrjs.com/docs/v2/reference/role) instance that was created.

**Example:**

```
const role = new Role('admin', Article, function () {
 // ...
});
```

#### Methods

##### `getName()` <badge type="secondary-outline">instance method</badge> {#get-name-instance-method}

Returns the name of the role.

**Returns:**

A string.

##### `getParent()` <badge type="secondary-outline">instance method</badge> {#get-parent-instance-method}

Returns the parent of the role.

**Returns:**

A [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or instance.

##### `getResolver()` <badge type="secondary-outline">instance method</badge> {#get-resolver-instance-method}

Returns the resolver function of the role.

**Returns:**

A function.

##### `resolve()` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#resolve-instance-method}

Resolves the role by calling its resolver function.

The resolver function is called with the role's parent as `this` context.

Once a role has been resolved, the result is cached, so the resolver function is called only one time.

**Returns:**

A boolean.

#### Utilities

##### `isRoleInstance(value)` <badge type="tertiary-outline">function</badge> {#is-role-instance-function}

Returns whether the specified value is a [`Role`](https://layrjs.com/docs/v2/reference/role) instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `assertIsRoleInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-role-instance-function}

Throws an error if the specified value is not a [`Role`](https://layrjs.com/docs/v2/reference/role) instance.

**Parameters:**

* `value`: A value of any type.
