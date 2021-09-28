import {Component, assertIsComponentClass, ensureComponentClass} from '@layr/component';
import type {ComponentClient} from '@layr/component-client';
import {hasOwnProperty, PlainObject} from 'core-helpers';

export class ExecutionQueue {
  _componentClient: ComponentClient;

  constructor(componentClient: ComponentClient) {
    this._componentClient = componentClient;
  }

  registerRootComponent(rootComponent: typeof Component) {
    assertIsComponentClass(rootComponent);

    const register = (component: typeof Component | Component) => {
      for (const method of component.getMethods()) {
        const name = method.getName();
        const queueing = method.getQueueing();

        if (!queueing) {
          continue;
        }

        const orignalFunction: (...args: any[]) => any = (component as any)[name];

        if (hasOwnProperty(orignalFunction, '__queued')) {
          throw new Error(
            `Component already registered to an execution queue (${component.describeComponent()})`
          );
        }

        const executionQueue = this;

        const backgroundFunction = async function (
          this: typeof Component | Component,
          ...args: any[]
        ) {
          const rootComponent = ensureComponentClass(this);

          if (rootComponent.getExecutionMode() === 'background') {
            await orignalFunction.call(this, ...args);
            return;
          }

          const query = {
            '<=': this,
            [`${name}=>`]: {'()': args}
          };

          await executionQueue.send(query, {rootComponent});
        };

        Object.defineProperty(backgroundFunction, '__queued', {value: true});

        (component as any)[name] = backgroundFunction;
      }
    };

    for (const component of rootComponent.traverseComponents()) {
      if (!component.isEmbedded()) {
        register(component);
        register(component.prototype);
      }
    }
  }

  async send(query: PlainObject, options: {rootComponent?: typeof Component} = {}) {
    const {rootComponent} = options;

    await this._componentClient.send(query, {rootComponent});
  }
}
